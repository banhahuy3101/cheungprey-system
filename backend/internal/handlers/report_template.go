package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	"html"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type ReportTemplateHandler struct {
	repo *repository.Repository
}

func NewReportTemplateHandler(repo *repository.Repository) *ReportTemplateHandler {
	return &ReportTemplateHandler{repo: repo}
}

func (h *ReportTemplateHandler) List(c *gin.Context) {
	category := c.Query("category")
	templates, err := h.repo.ListReportTemplates(category)
	if err != nil {
		utils.InternalError(c, "Failed to fetch templates")
		return
	}
	if templates == nil {
		templates = []models.ReportTemplate{}
	}
	utils.JSON(c, http.StatusOK, templates)
}

func validateDocxUpload(file *multipart.FileHeader) error {
	if file.Size > 10*1024*1024 {
		return fmt.Errorf("ឯកសារធំពេក (លើស 10 MB)")
	}

	src, err := file.Open()
	if err != nil {
		return fmt.Errorf("មិនអាចអានឯកសារ")
	}
	defer src.Close()

	buf := make([]byte, 2)
	if _, err := io.ReadFull(src, buf); err != nil {
		return fmt.Errorf("ឯកសារ DOCX មិនត្រឹមត្រូវ")
	}
	if string(buf) != "PK" {
		return fmt.Errorf("ឯកសារ DOCX មិនត្រឹមត្រូវ — មិនមែនជាឯកសារ ZIP")
	}

	data, err := io.ReadAll(io.MultiReader(bytes.NewReader(buf), src))
	if err != nil {
		return fmt.Errorf("មិនអាចអានឯកសារ")
	}

	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return fmt.Errorf("ឯកសារ DOCX ខូច — មិនអាចបើក ZIP")
	}

	hasDocXML := false
	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err != nil {
				return fmt.Errorf("ឯកសារ DOCX ខូច — មិនអាចអាន document.xml")
			}
			decoder := xml.NewDecoder(rc)
			if _, err := decoder.Token(); err != nil {
				rc.Close()
				return fmt.Errorf("ឯកសារ DOCX ខូច — XML មិនត្រឹមត្រូវ")
			}
			rc.Close()
			hasDocXML = true
			break
		}
	}
	if !hasDocXML {
		return fmt.Errorf("ឯកសារ DOCX មិនមាន document.xml")
	}

	return nil
}

func (h *ReportTemplateHandler) Upload(c *gin.Context) {
	name := c.PostForm("name")
	if name == "" {
		utils.BadRequest(c, "Name is required")
		return
	}
	description := c.PostForm("description")
	category := c.PostForm("category")
	format := c.PostForm("format")
	if format != "docx" && format != "html" {
		utils.BadRequest(c, "Format must be docx or html")
		return
	}

	userID, err := auth.GetUserID(c)
	if err != nil {
		utils.Unauthorized(c, "Authentication required")
		return
	}

	tmpl := &models.ReportTemplate{
		ID:          uuid.New(),
		Name:        name,
		Description: description,
		Category:    category,
		Format:      format,
		CreatedBy:   userID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if format == "docx" {
		file, err := c.FormFile("file")
		if err != nil {
			utils.BadRequest(c, "File is required for docx format")
			return
		}

		if err := validateDocxUpload(file); err != nil {
			utils.BadRequest(c, err.Error())
			return
		}

		tmpl.FileName = file.Filename
		tmpl.FileSize = file.Size
		safeName := sanitizeFilename(file.Filename)
		storagePath := fmt.Sprintf("%s/%s", tmpl.ID.String(), safeName)

		src, err := file.Open()
		if err != nil {
			utils.InternalError(c, "Failed to read file")
			return
		}
		data, err := io.ReadAll(src)
		src.Close()
		if err != nil {
			utils.InternalError(c, "Failed to read file")
			return
		}

		htmlContent, keys := extractDocxContentHTML(data)
		tmpl.Content = htmlContent
		tmpl.Keys = keys

		contentType := file.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		if err := h.repo.UploadTemplateFileData(data, storagePath, contentType); err != nil {
			utils.InternalError(c, "Failed to upload file: "+err.Error())
			return
		}
		tmpl.StoragePath = storagePath
	} else {
		content := c.PostForm("content")
		if content == "" {
			utils.BadRequest(c, "Content is required for html format")
			return
		}
		tmpl.Content = content
		tmpl.FileName = name + ".html"
		tmpl.Keys = extractKeys(content)
	}

	if err := h.repo.CreateReportTemplate(tmpl); err != nil {
		if tmpl.StoragePath != "" {
			_ = h.repo.DeleteTemplateFile(tmpl.StoragePath)
		}
		utils.InternalError(c, "Failed to save template: "+err.Error())
		return
	}

	utils.JSON(c, http.StatusCreated, tmpl)
}

func (h *ReportTemplateHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid template ID")
		return
	}

	tmpl, err := h.repo.GetReportTemplateByID(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch template")
		return
	}
	if tmpl == nil {
		utils.Error(c, http.StatusNotFound, "Template not found")
		return
	}

	// Auto-extract Word document HTML content for DOCX templates if content is empty or contains raw/escaped XML markers from the previous parser bug
	needsHeal := tmpl.Content == "" || len(tmpl.Content) < 10 ||
		strings.Contains(tmpl.Content, "w:val=") ||
		strings.Contains(tmpl.Content, "<w:") ||
		strings.Contains(tmpl.Content, "&lt;w:") ||
		strings.Contains(tmpl.Content, "w:space=")
	if tmpl.Format == "docx" && needsHeal && tmpl.StoragePath != "" {
		data, err := h.repo.DownloadTemplateFile(tmpl.StoragePath)
		if err == nil && len(data) > 0 {
			htmlContent, keys := extractDocxContentHTML(data)
			if htmlContent != "" {
				tmpl.Content = htmlContent
				if len(tmpl.Keys) == 0 && len(keys) > 0 {
					tmpl.Keys = keys
				}
				_ = h.repo.UpdateReportTemplate(tmpl)
			}
		}
	}

	keysMeta, err := h.repo.ListReportTemplateKeys(tmpl.ID)
	if err == nil {
		tmpl.KeysMeta = keysMeta
	} else {
		tmpl.KeysMeta = []models.ReportTemplateKey{}
	}

	utils.JSON(c, http.StatusOK, tmpl)
}

func (h *ReportTemplateHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid template ID")
		return
	}

	tmpl, err := h.repo.GetReportTemplateByID(id)
	if err != nil || tmpl == nil {
		utils.Error(c, http.StatusNotFound, "Template not found")
		return
	}

	name := c.PostForm("name")
	if name == "" {
		utils.BadRequest(c, "Name is required")
		return
	}
	tmpl.Name = name
	tmpl.Description = c.PostForm("description")
	if cat := c.PostForm("category"); cat != "" {
		tmpl.Category = cat
	}
	tmpl.UpdatedAt = time.Now()

	if tmpl.Format == "docx" {
		file, err := c.FormFile("file")
		if err == nil {
			if err := validateDocxUpload(file); err != nil {
				utils.BadRequest(c, err.Error())
				return
			}

			if tmpl.StoragePath != "" {
				_ = h.repo.DeleteTemplateFile(tmpl.StoragePath)
			}
			tmpl.FileName = file.Filename
			tmpl.FileSize = file.Size
			safeName := sanitizeFilename(file.Filename)
			tmpl.StoragePath = fmt.Sprintf("%s/%s", tmpl.ID.String(), safeName)

			src, err := file.Open()
			if err != nil {
				utils.InternalError(c, "Failed to read file")
				return
			}
			data, err := io.ReadAll(src)
			src.Close()
			if err != nil {
				utils.InternalError(c, "Failed to read file")
				return
			}

			htmlContent, keys := extractDocxContentHTML(data)
			tmpl.Content = htmlContent
			tmpl.Keys = keys

			contentType := file.Header.Get("Content-Type")
			if contentType == "" {
				contentType = "application/octet-stream"
			}
			if err := h.repo.UploadTemplateFileData(data, tmpl.StoragePath, contentType); err != nil {
				utils.InternalError(c, "Failed to upload file: "+err.Error())
				return
			}
		}
	} else {
		content := c.PostForm("content")
		if content != "" {
			tmpl.Content = content
			tmpl.Keys = extractKeys(content)
		}
	}

	if err := h.repo.UpdateReportTemplate(tmpl); err != nil {
		utils.InternalError(c, "Failed to update template: "+err.Error())
		return
	}

	utils.JSON(c, http.StatusOK, tmpl)
}

func (h *ReportTemplateHandler) Download(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid template ID")
		return
	}

	tmpl, err := h.repo.GetReportTemplateByID(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch template")
		return
	}
	if tmpl == nil {
		utils.Error(c, http.StatusNotFound, "Template not found")
		return
	}

	if tmpl.Format == "html" {
		utils.JSON(c, http.StatusOK, gin.H{"content": tmpl.Content})
		return
	}

	data, err := h.repo.DownloadTemplateFile(tmpl.StoragePath)
	if err != nil {
		utils.InternalError(c, "Failed to download file")
		return
	}

	contentType := "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	if strings.HasSuffix(tmpl.FileName, ".docx") {
		contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	}

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, tmpl.FileName))
	c.Data(http.StatusOK, contentType, data)
}

func (h *ReportTemplateHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid template ID")
		return
	}

	tmpl, err := h.repo.GetReportTemplateByID(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch template")
		return
	}
	if tmpl == nil {
		utils.Error(c, http.StatusNotFound, "Template not found")
		return
	}

	if tmpl.StoragePath != "" {
		_ = h.repo.DeleteTemplateFile(tmpl.StoragePath)
	}

	if err := h.repo.DeleteReportTemplate(id); err != nil {
		utils.InternalError(c, "Failed to delete template")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "deleted"})
}

func (h *ReportTemplateHandler) Duplicate(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid template ID")
		return
	}

	userID, err := auth.GetUserID(c)
	if err != nil {
		utils.Unauthorized(c, "Authentication required")
		return
	}

	orig, err := h.repo.GetReportTemplateByID(id)
	if err != nil || orig == nil {
		utils.Error(c, http.StatusNotFound, "Template not found")
		return
	}

	newID := uuid.New()
	newName := "ច្បាប់ចម្លងនៃ " + orig.Name
	now := time.Now()

	dup := &models.ReportTemplate{
		ID:          newID,
		Name:        newName,
		Description: orig.Description,
		Category:    orig.Category,
		Format:      orig.Format,
		FileName:    orig.FileName,
		FileSize:    orig.FileSize,
		Content:     orig.Content,
		Keys:        append([]string{}, orig.Keys...),
		CreatedBy:   userID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if orig.StoragePath != "" {
		newStoragePath := fmt.Sprintf("%s/%s", newID.String(), sanitizeFilename(orig.FileName))
		if err := h.repo.CopyTemplateFile(orig.StoragePath, newStoragePath); err != nil {
			utils.InternalError(c, "Failed to copy template file")
			return
		}
		dup.StoragePath = newStoragePath
	}

	if err := h.repo.DuplicateReportTemplate(dup); err != nil {
		if dup.StoragePath != "" {
			_ = h.repo.DeleteTemplateFile(dup.StoragePath)
		}
		utils.InternalError(c, "Failed to duplicate template: "+err.Error())
		return
	}

	utils.JSON(c, http.StatusCreated, dup)
}

func sanitizeFilename(name string) string {
	ext := filepath.Ext(name)
	base := strings.TrimSuffix(name, ext)
	re := regexp.MustCompile(`[^a-zA-Z0-9._-]`)
	base = re.ReplaceAllString(base, "_")
	if base == "" {
		base = "file"
	}
	return base + ext
}

var keyRe = regexp.MustCompile(`\{\{\s*([\w.]+)\s*\}\}`)

func extractKeys(text string) []string {
	seen := map[string]bool{}
	keys := make([]string, 0)
	for _, m := range keyRe.FindAllStringSubmatch(text, -1) {
		k := m[1]
		if !seen[k] {
			seen[k] = true
			keys = append(keys, k)
		}
	}
	return keys
}

func extractDocxContentHTML(data []byte) (string, []string) {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", nil
	}
	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err != nil {
				return "", nil
			}
			defer rc.Close()

			contentBytes, err := io.ReadAll(rc)
			if err != nil {
				return "", nil
			}

			// Use XML tokenizer to correctly extract only w:t text content
			var paragraphs []string
			var currentParagraph strings.Builder
			inParagraph := false
			inText := false

			decoder := xml.NewDecoder(bytes.NewReader(contentBytes))
			decoder.Strict = false

			for {
				token, err := decoder.Token()
				if err != nil {
					break
				}
				switch t := token.(type) {
				case xml.StartElement:
					// local() of the tag
					localName := t.Name.Local
					switch localName {
					case "p":
						if t.Name.Space == "http://schemas.openxmlformats.org/wordprocessingml/2006/main" ||
							t.Name.Space == "" {
							inParagraph = true
							currentParagraph.Reset()
						}
					case "t":
						if t.Name.Space == "http://schemas.openxmlformats.org/wordprocessingml/2006/main" ||
							t.Name.Space == "" {
							inText = true
						}
					}
				case xml.EndElement:
					localName := t.Name.Local
					switch localName {
					case "t":
						inText = false
					case "p":
						if inParagraph {
							inParagraph = false
							pStr := strings.TrimSpace(currentParagraph.String())
							if pStr != "" {
								paragraphs = append(paragraphs, pStr)
							}
						}
					}
				case xml.CharData:
					if inText && inParagraph {
						currentParagraph.Write(t)
					}
				}
			}

			// If XML tokenizer got nothing, fall back to regex
			if len(paragraphs) == 0 {
				pRe := regexp.MustCompile(`(?s)<w:p(?:[\s][^>]*)?>(.*?)</w:p>`)
				tRe := regexp.MustCompile(`(?s)<w:t(?:[\s][^>]*)?>(.*?)</w:t>`)
				rawXML := string(contentBytes)
				for _, pm := range pRe.FindAllStringSubmatch(rawXML, -1) {
					var pText strings.Builder
					for _, tm := range tRe.FindAllStringSubmatch(pm[1], -1) {
						pText.WriteString(tm[1])
					}
					pStr := strings.TrimSpace(pText.String())
					if pStr != "" {
						paragraphs = append(paragraphs, pStr)
					}
				}
			}

			var htmlBuf strings.Builder
			var plainTextBuf strings.Builder
			for _, pStr := range paragraphs {
				// Wrap template keys in styled code badges
				styled := templateKeyRe.ReplaceAllStringFunc(pStr, func(match string) string {
					return match // keep as-is in plain text
				})
				htmlBuf.WriteString(`<p style="margin-bottom:0.75rem; line-height:1.8; font-family:'Khmer OS', 'Noto Sans Khmer', sans-serif;">` + html.EscapeString(styled) + "</p>\n")
				plainTextBuf.WriteString(pStr + "\n")
			}

			fullText := plainTextBuf.String()
			keys := extractKeys(fullText)
			return htmlBuf.String(), keys
		}
	}
	return "", nil
}

var templateKeyRe = regexp.MustCompile(`\{\{\s*[\w.]+\s*\}\}`)

func (h *ReportTemplateHandler) AddKey(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid template ID")
		return
	}

	var req struct {
		Key          string `json:"key" binding:"required"`
		Label        string `json:"label"`
		Category     string `json:"category"`
		FieldType    string `json:"field_type"`
		DefaultValue string `json:"default_value"`
		IsRequired   bool   `json:"is_required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Key is required")
		return
	}

	tmpl, err := h.repo.GetReportTemplateByID(id)
	if err != nil || tmpl == nil {
		utils.Error(c, http.StatusNotFound, "Template not found")
		return
	}

	exists := false
	for _, k := range tmpl.Keys {
		if k == req.Key {
			exists = true
			break
		}
	}

	if !exists {
		tmpl.Keys = append(tmpl.Keys, req.Key)
		tmpl.UpdatedAt = time.Now()
		if err := h.repo.UpdateReportTemplate(tmpl); err != nil {
			utils.InternalError(c, "Failed to update keys")
			return
		}
	}

	category := req.Category
	if category == "" {
		category = "general"
	}
	fieldType := req.FieldType
	if fieldType == "" {
		fieldType = "text"
	}

	// Insert or update structured key into report_template_keys table
	keyItem := &models.ReportTemplateKey{
		ID:           uuid.New(),
		TemplateID:   tmpl.ID,
		KeyName:      req.Key,
		DisplayLabel: req.Label,
		Category:     category,
		FieldType:    fieldType,
		DefaultValue: req.DefaultValue,
		IsRequired:   req.IsRequired,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	_ = h.repo.UpsertReportTemplateKey(keyItem)

	utils.JSON(c, http.StatusOK, tmpl)
}

func (h *ReportTemplateHandler) CreateReportFromTemplate(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid template ID")
		return
	}

	userID, err := auth.GetUserID(c)
	if err != nil {
		utils.Unauthorized(c, "Authentication required")
		return
	}

	var req struct {
		Title            string         `json:"title" binding:"required"`
		Description      string         `json:"description"`
		Category         string         `json:"category"`
		RequireSignature *bool          `json:"require_signature"`
		Values           map[string]any `json:"values"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Title and values are required")
		return
	}

	tmpl, err := h.repo.GetReportTemplateByID(id)
	if err != nil || tmpl == nil {
		utils.Error(c, http.StatusNotFound, "Template not found")
		return
	}

	missingKeys := validateRequiredKeys(tmpl.KeysMeta, req.Values)
	if len(missingKeys) > 0 {
		utils.BadRequest(c, "សូមបំពេញព័ត៌មានដែលត្រូវការ: "+strings.Join(missingKeys, ", "))
		return
	}

	var filledContent string
	if tmpl.Format == "html" {
		content := tmpl.Content
		content = replaceEachBlocksInHTML(content, req.Values)
		content = replaceSimplePlaceholdersInHTML(content, req.Values)
		filledContent = content
	} else {
		data, err := h.repo.DownloadTemplateFile(tmpl.StoragePath)
		if err != nil {
			utils.InternalError(c, "Failed to download template file")
			return
		}
		filledDocx := replacePlaceholdersInDocx(data, req.Values)
		filledContent = extractDocxToHTML(filledDocx)
		if filledContent == "" {
			utils.InternalError(c, "Failed to generate report content from template")
			return
		}

		safeName := sanitizeFilename(req.Title + ".docx")
		storagePath := fmt.Sprintf("filled/%s/%s", uuid.New().String(), safeName)
		_ = h.repo.UploadReportFile(filledDocx, storagePath, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	}

	zoneCode := ""
	profile, err := auth.GetProfile(c)
	if err == nil && profile != nil && profile.ZoneCode != nil {
		zoneCode = *profile.ZoneCode
	}

	category := req.Category
	if category == "" {
		category = tmpl.Category
	}
	if category == "" {
		category = "ផ្សេងៗ"
	}

	reqSig := true
	if req.RequireSignature != nil {
		reqSig = *req.RequireSignature
	}

	now := time.Now()
	doc := &models.ReportDocument{
		ID:               uuid.New(),
		Title:            req.Title,
		Description:      req.Description,
		Content:          filledContent,
		Category:         category,
		ZoneCode:         zoneCode,
		Status:           "draft",
		RequireSignature: reqSig,
		CreatedBy:        userID,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := h.repo.CreateReportDocument(doc); err != nil {
		utils.InternalError(c, "Failed to save report: "+err.Error())
		return
	}

	utils.JSON(c, http.StatusCreated, doc)
}

func (h *ReportTemplateHandler) DownloadFilled(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		utils.BadRequest(c, "Path is required")
		return
	}

	// For security, ensure the path starts with "filled/"
	if !strings.HasPrefix(path, "filled/") {
		utils.BadRequest(c, "Invalid path")
		return
	}

	data, err := h.repo.DownloadTemplateFile(path)
	if err != nil {
		log.Printf("ERROR download filled template file: %v", err)
		utils.InternalError(c, "Failed to download filled file")
		return
	}

	filename := filepath.Base(path)
	contentType := "application/octet-stream"
	if strings.HasSuffix(filename, ".docx") {
		contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	} else if strings.HasSuffix(filename, ".html") {
		contentType = "text/html"
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Data(http.StatusOK, contentType, data)
}
