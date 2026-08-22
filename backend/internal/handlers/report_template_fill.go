package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

var placeholderRe = regexp.MustCompile(`\{\{\s*([\w.]+)\s*\}\}`)

func (h *ReportTemplateHandler) Fill(c *gin.Context) {
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

	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.BadRequest(c, "Invalid payload")
		return
	}

	missingKeys := validateRequiredKeys(tmpl.KeysMeta, payload)
	if len(missingKeys) > 0 {
		utils.BadRequest(c, "សូមបំពេញព័ត៌មានដែលត្រូវការ: "+strings.Join(missingKeys, ", "))
		return
	}

	if tmpl.Format == "html" {
		content := tmpl.Content
		content = replaceEachBlocksInHTML(content, payload)
		content = replaceSimplePlaceholdersInHTML(content, payload)
		utils.JSON(c, http.StatusOK, gin.H{"format": "html", "content": content})
		return
	}

	data, err := h.repo.DownloadTemplateFile(tmpl.StoragePath)
	if err != nil {
		utils.InternalError(c, "Failed to download template")
		return
	}

	filled := replacePlaceholdersInDocx(data, payload)

	safeName := sanitizeFilename(tmpl.Name + ".docx")
	storagePath := fmt.Sprintf("filled/%s/%s", uuid.New().String(), safeName)
	if err := h.repo.UploadReportFile(filled, storagePath, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"); err != nil {
		log.Printf("Warning: failed to upload filled report to storage: %v", err)
	}

	htmlContent := extractDocxToHTML(filled)
	if htmlContent == "" {
		log.Printf("Warning: extractDocxToHTML returned empty content for template %s", id)
	}

	utils.JSON(c, http.StatusOK, gin.H{
		"format":       "docx",
		"content":      htmlContent,
		"storage_path": storagePath,
	})
}

func validateRequiredKeys(keysMeta []models.ReportTemplateKey, payload map[string]any) []string {
	required := make(map[string]string)
	for _, km := range keysMeta {
		if km.IsRequired {
			required[km.KeyName] = km.DisplayLabel
		}
	}
	if len(required) == 0 {
		return nil
	}
	var missing []string
	for keyName, label := range required {
		val, ok := payload[keyName]
		if !ok {
			missing = append(missing, labelOrDefault(label, keyName))
			continue
		}
		s, ok := val.(string)
		if !ok || strings.TrimSpace(s) == "" {
			missing = append(missing, labelOrDefault(label, keyName))
		}
	}
	return missing
}

func labelOrDefault(label, key string) string {
	if label != "" {
		return label
	}
	return key
}

func replaceSimplePlaceholdersInHTML(content string, payload map[string]any) string {
	for k, v := range payload {
		s, ok := v.(string)
		if !ok {
			continue
		}
		re := regexp.MustCompile(`\{\{\s*` + regexp.QuoteMeta(k) + `\s*\}\}`)
		content = re.ReplaceAllString(content, escapeHTML(s))
	}
	// Any remaining {{ key }} placeholders had no data provided — render blank
	// instead of leaving the literal placeholder text in the report content.
	content = placeholderRe.ReplaceAllString(content, "")
	return content
}

func replaceEachBlocksInHTML(content string, payload map[string]any) string {
	eachStartRe := regexp.MustCompile(`\{\{\s*#each\s+([\w.]+)\s*\}\}`)
	eachEndMarker := "{{/each}}"

	for {
		m := eachStartRe.FindStringSubmatchIndex(content)
		if m == nil {
			break
		}
		arrayName := content[m[2]:m[3]]

		endIdx := strings.Index(content[m[1]:], eachEndMarker)
		if endIdx == -1 {
			break
		}
		endIdx = m[1] + endIdx

		blockContent := content[m[1]:endIdx]

		arrVal, ok := payload[arrayName]
		if !ok {
			content = content[:m[0]] + content[endIdx+len(eachEndMarker):]
			continue
		}

		arr, ok := arrVal.([]any)
		if !ok {
			content = content[:m[0]] + content[endIdx+len(eachEndMarker):]
			continue
		}

		var expanded strings.Builder
		for i, item := range arr {
			itemMap, _ := item.(map[string]any)
			row := blockContent
			for k, v := range itemMap {
				s, _ := v.(string)
				re := regexp.MustCompile(`\{\{\s*` + regexp.QuoteMeta(k) + `\s*\}\}`)
				row = re.ReplaceAllString(row, escapeHTML(s))
			}
			row = strings.ReplaceAll(row, "{{index}}", escapeHTML(strconv.Itoa(i+1)))
			// Blank out any leftover {{ key }} with no data in this row.
			row = placeholderRe.ReplaceAllString(row, "")
			expanded.WriteString(row)
		}

		content = content[:m[0]] + expanded.String() + content[endIdx+len(eachEndMarker):]
	}

	return content
}

func extractDocxToHTML(data []byte) string {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return ""
	}

	imageMap := buildDocxImageMap(r)

	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err != nil {
				return ""
			}
			defer rc.Close()
			content, _ := io.ReadAll(rc)
			return xmlToHTML(content, imageMap)
		}
	}
	return ""
}

func buildDocxImageMap(r *zip.Reader) map[string]string {
	rels := make(map[string]string)
	for _, f := range r.File {
		if f.Name != "word/_rels/document.xml.rels" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil
		}
		content, _ := io.ReadAll(rc)
		rc.Close()

		decoder := xml.NewDecoder(bytes.NewReader(content))
		for {
			token, err := decoder.Token()
			if err == io.EOF {
				break
			}
			if err != nil {
				break
			}
			switch t := token.(type) {
			case xml.StartElement:
				if t.Name.Local == "Relationship" {
					var id, target string
					for _, attr := range t.Attr {
						if attr.Name.Local == "Id" {
							id = attr.Value
						}
						if attr.Name.Local == "Target" {
							target = attr.Value
						}
					}
					if id != "" && target != "" {
						rels[id] = target
					}
				}
			}
		}
		break
	}

	imageMap := make(map[string]string)
	for rId, target := range rels {
		if !strings.HasPrefix(target, "media/") {
			continue
		}
		imagePath := "word/" + target
		for _, f := range r.File {
			if f.Name != imagePath {
				continue
			}
			rc, err := f.Open()
			if err != nil {
				continue
			}
			data, _ := io.ReadAll(rc)
			rc.Close()

			ext := strings.ToLower(filepath.Ext(target))
			mime := mimeTypeByImageExt(ext)
			if mime == "" {
				continue
			}
			imageMap[rId] = "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(data)
			break
		}
	}

	return imageMap
}

func mimeTypeByImageExt(ext string) string {
	switch ext {
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".bmp":
		return "image/bmp"
	case ".svg":
		return "image/svg+xml"
	case ".webp":
		return "image/webp"
	case ".tiff", ".tif":
		return "image/tiff"
	default:
		return ""
	}
}

func xmlToHTML(xmlData []byte, imageMap map[string]string) string {
	decoder := xml.NewDecoder(bytes.NewReader(xmlData))

	var html strings.Builder
	var currentRunText strings.Builder
	var currentParaContent strings.Builder
	var currentRunCSS strings.Builder
	var currentStyle string
	var currentAlign string
	var inParagraph bool
	var inRun bool
	var imageRId string

	for {
		token, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fallbackExtractText(xmlData)
		}

		switch t := token.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "tbl":
				if inParagraph && currentParaContent.Len() > 0 {
					flushPara(&html, &currentParaContent, currentStyle, currentAlign)
				}
				inParagraph = false
				html.WriteString("<table>")

			case "tr":
				html.WriteString("<tr>")

			case "tc":
				html.WriteString("<td>")

			case "drawing":
				imageRId = ""
				if currentRunText.Len() > 0 {
					text := escapeHTML(currentRunText.String())
					if currentRunCSS.Len() > 0 {
						text = "<span style=\"" + currentRunCSS.String() + "\">" + text + "</span>"
					}
					currentParaContent.WriteString(text)
					currentRunText.Reset()
				}

			case "blip":
				for _, attr := range t.Attr {
					if attr.Name.Local == "embed" {
						imageRId = attr.Value
					}
				}

			case "p":
				if inParagraph && currentParaContent.Len() > 0 {
					flushPara(&html, &currentParaContent, currentStyle, currentAlign)
				}
				currentParaContent.Reset()
				currentStyle = ""
				currentAlign = ""
				inParagraph = true

			case "pStyle":
				for _, attr := range t.Attr {
					if attr.Name.Local == "val" {
						currentStyle = strings.ToLower(attr.Value)
					}
				}

			case "jc":
				for _, attr := range t.Attr {
					if attr.Name.Local == "val" {
						switch attr.Value {
						case "center":
							currentAlign = "center"
						case "right":
							currentAlign = "right"
						case "both":
							currentAlign = "justify"
						default:
							currentAlign = "left"
						}
					}
				}

			case "r":
				currentRunText.Reset()
				currentRunCSS.Reset()
				inRun = true

			case "rPr":

			case "rFonts":
				for _, a := range t.Attr {
					if a.Name.Local == "ascii" || a.Name.Local == "hAnsi" {
						if currentRunCSS.Len() > 0 {
							currentRunCSS.WriteString(";")
						}
						currentRunCSS.WriteString("font-family:'" + a.Value + "'")
						break
					}
				}

			case "sz":
				for _, a := range t.Attr {
					if a.Name.Local == "val" {
						if sz, err := strconv.Atoi(a.Value); err == nil {
							pt := sz / 2
							if currentRunCSS.Len() > 0 {
								currentRunCSS.WriteString(";")
							}
							currentRunCSS.WriteString("font-size:" + strconv.Itoa(pt) + "pt")
						}
					}
				}

			case "color":
				for _, a := range t.Attr {
					if a.Name.Local == "val" && a.Value != "auto" {
						if currentRunCSS.Len() > 0 {
							currentRunCSS.WriteString(";")
						}
						currentRunCSS.WriteString("color:#" + a.Value)
					}
				}

			case "b":
				if currentRunCSS.Len() > 0 {
					currentRunCSS.WriteString(";")
				}
				currentRunCSS.WriteString("font-weight:bold")

			case "i":
				if currentRunCSS.Len() > 0 {
					currentRunCSS.WriteString(";")
				}
				currentRunCSS.WriteString("font-style:italic")

			case "u":
				if currentRunCSS.Len() > 0 {
					currentRunCSS.WriteString(";")
				}
				currentRunCSS.WriteString("text-decoration:underline")

			case "highlight":
				for _, a := range t.Attr {
					if a.Name.Local == "val" {
						if currentRunCSS.Len() > 0 {
							currentRunCSS.WriteString(";")
						}
						currentRunCSS.WriteString("background-color:" + a.Value)
					}
				}

			case "vertAlign":
				for _, a := range t.Attr {
					if a.Name.Local == "val" {
						if currentRunCSS.Len() > 0 {
							currentRunCSS.WriteString(";")
						}
						currentRunCSS.WriteString("vertical-align:" + a.Value)
					}
				}

			case "br":
				if inRun {
					isPageBreak := false
					for _, attr := range t.Attr {
						if attr.Name.Local == "type" && attr.Value == "page" {
							isPageBreak = true
							break
						}
					}
					if !isPageBreak {
						currentParaContent.WriteString("<br>")
					}
				}

			case "tab":
				if inRun {
					currentParaContent.WriteString("&emsp;")
				}

			case "t", "sectPr", "tblPr", "trPr", "tcPr", "pPr":
			}

		case xml.EndElement:
			switch t.Name.Local {
			case "p":
				if currentParaContent.Len() > 0 {
					flushPara(&html, &currentParaContent, currentStyle, currentAlign)
				}
				inParagraph = false

			case "r":
				if currentRunText.Len() > 0 {
					text := escapeHTML(currentRunText.String())
					if currentRunCSS.Len() > 0 {
						text = "<span style=\"" + currentRunCSS.String() + "\">" + text + "</span>"
					}
					currentParaContent.WriteString(text)
					currentRunText.Reset()
					currentRunCSS.Reset()
				}
				inRun = false

			case "tbl":
				html.WriteString("</table>")

			case "tr":
				html.WriteString("</tr>")

			case "tc":
				html.WriteString("</td>")

			case "drawing":
				if imageRId != "" && imageMap != nil {
					if dataURI, ok := imageMap[imageRId]; ok {
						currentParaContent.WriteString(`<img src="` + dataURI + `" style="max-width:100%;height:auto">`)
					}
				}
			}

		case xml.CharData:
			if inParagraph {
				currentRunText.Write(t)
			}
		}
	}

	if inParagraph && currentParaContent.Len() > 0 {
		flushPara(&html, &currentParaContent, currentStyle, currentAlign)
	}

	if html.Len() == 0 {
		return fallbackExtractText(xmlData)
	}
	return html.String()
}

func flushPara(html *strings.Builder, content *strings.Builder, style, align string) {
	if content.Len() == 0 {
		return
	}
	tag := determineTag(style)
	html.WriteString("<" + tag)
	if align != "" {
		html.WriteString(` style="text-align:` + align + `"`)
	}
	html.WriteString(">")
	html.WriteString(content.String())
	html.WriteString("</" + tag + ">")
	content.Reset()
}

func determineTag(style string) string {
	switch {
	case strings.Contains(style, "heading1") || strings.Contains(style, "title"):
		return "h1"
	case strings.Contains(style, "heading2"):
		return "h2"
	case strings.Contains(style, "heading3"):
		return "h3"
	case strings.Contains(style, "list"):
		return "li"
	default:
		return "p"
	}
}

func fallbackExtractText(xmlData []byte) string {
	xmlStr := string(xmlData)
	reT := regexp.MustCompile(`(?s)<w:t(?:[\s][^>]*)?>([^<]*)</w:t>`)
	matches := reT.FindAllStringSubmatch(xmlStr, -1)
	var parts []string
	for _, m := range matches {
		if len(m) > 1 {
			t := strings.TrimSpace(m[1])
			if t != "" {
				parts = append(parts, t)
			}
		}
	}
	if len(parts) == 0 {
		stripRe := regexp.MustCompile(`<[^>]+>`)
		clean := strings.TrimSpace(stripRe.ReplaceAllString(xmlStr, " "))
		if clean != "" {
			parts = []string{clean}
		}
	}
	if len(parts) == 0 {
		return ""
	}
	full := strings.Join(parts, " ")
	paras := strings.Split(full, "\n")
	var html strings.Builder
	for _, p := range paras {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		html.WriteString("<p>")
		html.WriteString(escapeHTML(p))
		html.WriteString("</p>")
	}
	return html.String()
}

func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	return s
}

func extractKeysFromText(text string) []string {
	seen := map[string]bool{}
	keys := make([]string, 0)
	for _, m := range placeholderRe.FindAllStringSubmatch(text, -1) {
		k := m[1]
		if !seen[k] {
			seen[k] = true
			keys = append(keys, k)
		}
	}
	return keys
}

// replacePlaceholdersInDocx replaces {{Key}} inside the original DOCX XML
// while preserving all original formatting, fonts, tables, images, etc.
// Supports {{#each name}}...{{/each}} loop blocks for arrays in values.
func replacePlaceholdersInDocx(data []byte, values map[string]any) []byte {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return data
	}

	var buf bytes.Buffer
	w := zip.NewWriter(&buf)

	for _, f := range r.File {
		fw, err := w.Create(f.Name)
		if err != nil {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			continue
		}
		content, _ := io.ReadAll(rc)
		rc.Close()

		// Only modify document.xml
		if f.Name == "word/document.xml" {
			xmlStr := string(content)

			// 1. Process {{#each name}}...{{/each}} loop blocks
			eachRe := regexp.MustCompile(`\{\{\s*#each\s+([\w.]+)\s*\}\}`)
			for {
				m := eachRe.FindStringSubmatchIndex(xmlStr)
				if m == nil {
					break
				}
				arrayName := xmlStr[m[2]:m[3]]

				endMarker := "{{/each}}"
				endIdx := strings.Index(xmlStr, endMarker)
				if endIdx == -1 || endIdx < m[1] {
					break
				}

				// Extract template XML between markers
				templateXML := xmlStr[m[1]:endIdx]

				// Get array from payload
				arrVal, ok := values[arrayName]
				if !ok {
					break
				}
				arr, ok := arrVal.([]any)
				if !ok {
					break
				}

var expanded strings.Builder
			for i, item := range arr {
				itemMap, _ := item.(map[string]any)
				row := templateXML
				for k, v := range itemMap {
					s, _ := v.(string)
					re := regexp.MustCompile(`\{\{\s*` + regexp.QuoteMeta(k) + `\s*\}\}`)
					row = re.ReplaceAllString(row, escapeXML(s))
				}
				// Replace {{index}} inside the expanded row
				row = strings.ReplaceAll(row, "{{index}}", escapeXML(strconv.Itoa(i+1)))
				// Blank out any leftover {{ key }} with no data in this row.
				row = placeholderRe.ReplaceAllString(row, "")
				expanded.WriteString(row)
			}

				// Replace the entire block
				block := xmlStr[m[0] : endIdx+len(endMarker)]
				xmlStr = strings.Replace(xmlStr, block, expanded.String(), 1)
			}

// 2. Replace simple string placeholders
		for k, v := range values {
			s, ok := v.(string)
			if !ok {
				continue
			}
			re := regexp.MustCompile(`\{\{\s*` + regexp.QuoteMeta(k) + `\s*\}\}`)
			xmlStr = re.ReplaceAllString(xmlStr, escapeXML(s))
		}

		// 3. Any remaining {{ key }} placeholders had no data — render blank.
		xmlStr = placeholderRe.ReplaceAllString(xmlStr, "")

		content = []byte(xmlStr)
		}

		fw.Write(content)
	}
	w.Close()
	return buf.Bytes()
}

func escapeXML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	s = strings.ReplaceAll(s, `'`, "&apos;")
	return s
}