package handlers

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/services"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type ReportDocumentHandler struct {
	repo    *repository.Repository
	service *services.ReportService
}

func NewReportDocumentHandler(repo *repository.Repository, service *services.ReportService) *ReportDocumentHandler {
	return &ReportDocumentHandler{repo: repo, service: service}
}

func defaultPartyName(name string) string {
	if name == "" {
		return "គណបក្សប្រជាជនកម្ពុជា"
	}
	return name
}

func defaultPropertyDamage(desc string) string {
	if desc == "" {
		return "(គ្មាន)"
	}
	return desc
}

func reportDownloadFilename(doc *models.ReportDocument, ext string) string {
	base := strings.TrimSpace(doc.Title)
	if base == "" {
		return "report." + ext
	}
	if len(base) > 80 {
		base = base[:80]
	}
	return base + "." + ext
}

func contentDispositionAttachment(filename string) string {
	ascii := filename
	if len(ascii) > 80 {
		ascii = ascii[:80]
	}
	return fmt.Sprintf(`attachment; filename=%q; filename*=UTF-8''%s`, ascii, url.PathEscape(filename))
}

func reportDocumentFromRequest(req models.ReportDocumentPayload, userID uuid.UUID, now time.Time) *models.ReportDocument {
	status := req.Status
	if status == "" {
		status = "draft"
	}
	month := req.ReportMonth
	year := req.ReportYear
	reqSig := true
	if req.RequireSignature != nil {
		reqSig = *req.RequireSignature
	}
	return &models.ReportDocument{
		ID:                        uuid.New(),
		PartyName:                 defaultPartyName(req.PartyName),
		ProvinceName:              req.ProvinceName,
		DistrictName:              req.DistrictName,
		DocumentReferenceNumber:   req.DocumentReferenceNumber,
		GenerationDateKhmer:       req.GenerationDateKhmer,
		ReportMonth:               &month,
		ReportYear:                &year,
		PoliticalSituationSummary: req.PoliticalSituationSummary,
		TotalCrimesCount:          req.TotalCrimesCount,
		HomicideCases:             req.HomicideCases,
		SuicideCases:              req.SuicideCases,
		MisdemeanorCases:          req.MisdemeanorCases,
		HumanFatalities:           req.HumanFatalities,
		PropertyDamageDesc:        defaultPropertyDamage(req.PropertyDamageDesc),
		Status:                    status,
		RequireSignature:          reqSig,
		CreatedBy:                 userID,
		CreatedAt:                 now,
		UpdatedAt:                 now,
	}
}

func simpleReportDocumentFromRequest(req models.CreateSimpleReportDocumentRequest, userID uuid.UUID, zoneCode string, now time.Time) *models.ReportDocument {
	category := req.Category
	if category == "" {
		category = "ផ្សេងៗ"
	}
	reqSig := true
	if req.RequireSignature != nil {
		reqSig = *req.RequireSignature
	}
	return &models.ReportDocument{
		ID:               uuid.New(),
		Title:            req.Title,
		Description:      req.Description,
		Content:          req.Content,
		Category:         category,
		ZoneCode:         zoneCode,
		Status:           "draft",
		RequireSignature: reqSig,
		CreatedBy:        userID,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
}

func simpleReportDocumentUpdateMap(req models.UpdateSimpleReportDocumentRequest) map[string]any {
	data := map[string]any{
		"title":       req.Title,
		"description": req.Description,
		"content":     req.Content,
		"updated_at":  time.Now(),
	}
	if req.Category != "" {
		data["category"] = req.Category
	}
	if req.RequireSignature != nil {
		data["require_signature"] = *req.RequireSignature
	}
	return data
}

func reportDocumentUpdateMap(req models.ReportDocumentPayload) map[string]any {
	month := req.ReportMonth
	year := req.ReportYear
	data := map[string]any{
		"party_name":                  defaultPartyName(req.PartyName),
		"province_name":               req.ProvinceName,
		"district_name":               req.DistrictName,
		"document_reference_number":   req.DocumentReferenceNumber,
		"generation_date_khmer":       req.GenerationDateKhmer,
		"report_month":                month,
		"report_year":                 year,
		"political_situation_summary": req.PoliticalSituationSummary,
		"total_crimes_count":          req.TotalCrimesCount,
		"homicide_cases":              req.HomicideCases,
		"suicide_cases":               req.SuicideCases,
		"misdemeanor_cases":           req.MisdemeanorCases,
		"human_fatalities":            req.HumanFatalities,
		"property_damage_desc":        defaultPropertyDamage(req.PropertyDamageDesc),
		"updated_at":                  time.Now(),
	}
	if req.Status != "" {
		data["status"] = req.Status
	}
	if req.RequireSignature != nil {
		data["require_signature"] = *req.RequireSignature
	}
	return data
}

func (h *ReportDocumentHandler) Create(c *gin.Context) {
	userID, _ := auth.GetUserID(c)

	var req models.CreateReportDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrors(c, err)
		return
	}

	doc := reportDocumentFromRequest(req, userID, time.Now())
	if err := h.repo.CreateReportDocument(doc); err != nil {
		log.Printf("ERROR create report document: %v", err)
		utils.InternalError(c, "Failed to create report")
		return
	}

	utils.JSON(c, http.StatusCreated, doc)
}

func (h *ReportDocumentHandler) CreateSimple(c *gin.Context) {
	userID, _ := auth.GetUserID(c)

	var req models.CreateSimpleReportDocumentRequest
	if errs := bindAndValidateSimple(c, &req); len(errs) > 0 {
		c.JSON(400, utils.APIResponse{Success: false, Error: "validation failed", Errors: errs})
		return
	}

	zoneCode := ""
	profile, err := auth.GetProfile(c)
	if err == nil && profile != nil && profile.ZoneCode != nil {
		zoneCode = *profile.ZoneCode
	}

	doc := simpleReportDocumentFromRequest(req, userID, zoneCode, time.Now())
	if err := h.repo.CreateReportDocument(doc); err != nil {
		log.Printf("ERROR create simple report document: %v", err)
		utils.InternalError(c, "Failed to create report")
		return
	}

	utils.JSON(c, http.StatusCreated, doc)
}

func (h *ReportDocumentHandler) List(c *gin.Context) {
	category := c.Query("category")
	zoneCode := c.Query("zone_code")
	search := c.Query("search")
	trash := c.Query("trash") == "true"

	docs, err := h.repo.ListReportDocuments(category, zoneCode, search, trash)
	if err != nil {
		log.Printf("ERROR list report documents: %v", err)
		utils.InternalError(c, "Failed to fetch reports")
		return
	}
	if docs == nil {
		docs = []models.ReportDocument{}
	}
	utils.JSON(c, http.StatusOK, docs)
}

func (h *ReportDocumentHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}

	doc, err := h.repo.GetReportDocumentByID(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch report")
		return
	}
	if doc == nil {
		utils.Error(c, http.StatusNotFound, "Report not found")
		return
	}

	utils.JSON(c, http.StatusOK, doc)
}

func (h *ReportDocumentHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}

	var req models.UpdateReportDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrors(c, err)
		return
	}

	if err := h.repo.UpdateReportDocument(id, reportDocumentUpdateMap(req)); err != nil {
		utils.InternalError(c, "Failed to update report")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Report updated"})
}

func (h *ReportDocumentHandler) UpdateSimple(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}

	var req models.UpdateSimpleReportDocumentRequest
	if errs := bindAndValidateSimple(c, &req); len(errs) > 0 {
		c.JSON(400, utils.APIResponse{Success: false, Error: "validation failed", Errors: errs})
		return
	}

	if err := h.repo.UpdateReportDocument(id, simpleReportDocumentUpdateMap(req)); err != nil {
		utils.InternalError(c, "Failed to update report")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Report updated"})
}

func (h *ReportDocumentHandler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrors(c, err)
		return
	}

	userID, _ := auth.GetUserID(c)

	if req.Status == "published" {
		doc, err := h.repo.GetReportDocumentByID(id)
		if err != nil || doc == nil {
			utils.Error(c, http.StatusNotFound, "Report not found")
			return
		}

		if doc.RequireSignature {
			profile, err := h.repo.GetProfileByID(userID)
			if err != nil || profile == nil {
				utils.InternalError(c, "Failed to retrieve user profile")
				return
			}
			if profile.Signature == nil || *profile.Signature == "" {
				utils.BadRequest(c, "សូមរៀបចំទម្រង់ហត្ថលេខាក្នុងទំព័រប្រវត្តិរូបរបស់អ្នកជាមុនសិន ទើបអាចអនុម័តរបាយការណ៍បាន។")
				return
			}

			review := &models.ReportReview{
				ID:         uuid.New(),
				ReportID:   id,
				Action:     "approve",
				ReviewerID: userID,
				Signature:  profile.Signature,
				CreatedAt:  time.Now(),
			}
			_ = h.repo.CreateReportReview(review)
		} else {
			review := &models.ReportReview{
				ID:         uuid.New(),
				ReportID:   id,
				Action:     "approve",
				ReviewerID: userID,
				CreatedAt:  time.Now(),
			}
			_ = h.repo.CreateReportReview(review)
		}

		if err := h.repo.UpdateReportDocument(id, map[string]any{
			"status":     "published",
			"updated_at": time.Now(),
		}); err != nil {
			utils.InternalError(c, "Failed to approve report")
			return
		}

		utils.JSON(c, http.StatusOK, gin.H{"message": "បានអនុម័ត"})
		return
	}

	if err := h.repo.UpdateReportDocument(id, map[string]any{
		"status":     req.Status,
		"updated_at": time.Now(),
	}); err != nil {
		utils.InternalError(c, "Failed to update status")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Status updated"})
}

func (h *ReportDocumentHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}

	if c.Query("permanent") == "true" {
		if err := h.repo.DeleteReportDocument(id); err != nil {
			utils.InternalError(c, "Failed to permanently delete report")
			return
		}
		utils.JSON(c, http.StatusOK, gin.H{"message": "Report permanently deleted"})
		return
	}

	if err := h.repo.SoftDeleteReportDocument(id); err != nil {
		utils.InternalError(c, "Failed to delete report")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Report deleted"})
}

func (h *ReportDocumentHandler) Restore(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}

	if err := h.repo.RestoreReportDocument(id); err != nil {
		utils.InternalError(c, "Failed to restore report")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Report restored"})
}

func (h *ReportDocumentHandler) Submit(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}
	userID, _ := auth.GetUserID(c)

	doc, err := h.repo.GetReportDocumentByID(id)
	if err != nil || doc == nil {
		utils.Error(c, http.StatusNotFound, "Report not found")
		return
	}
	if doc.Status != "draft" && doc.Status != "rejected" {
		utils.BadRequest(c, "មានតែសេចក្តីព្រាង ឬបានបដិសេធប៉ុណ្ណោះដែលអាចដាក់ស្នើបាន")
		return
	}

	if err := h.repo.UpdateReportDocument(id, map[string]any{
		"status":     "pending_review",
		"updated_at": time.Now(),
	}); err != nil {
		utils.InternalError(c, "Failed to submit report")
		return
	}

	review := &models.ReportReview{
		ID:         uuid.New(),
		ReportID:   id,
		Action:     "submit",
		ReviewerID: userID,
		CreatedAt:  time.Now(),
	}
	_ = h.repo.CreateReportReview(review)

	utils.JSON(c, http.StatusOK, gin.H{"message": "បានដាក់ស្នើ"})
}

func (h *ReportDocumentHandler) Reject(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}
	userID, _ := auth.GetUserID(c)

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "មូលហេតុត្រូវបានទាមទារ")
		return
	}

	doc, err := h.repo.GetReportDocumentByID(id)
	if err != nil || doc == nil {
		utils.Error(c, http.StatusNotFound, "Report not found")
		return
	}
	if doc.Status != "pending_review" {
		utils.BadRequest(c, "មានតែរបាយការណ៍ដែលកំពុងរង់ចាំពិនិត្យប៉ុណ្ណោះដែលអាចបដិសេធបាន")
		return
	}

	if err := h.repo.UpdateReportDocument(id, map[string]any{
		"status":     "draft",
		"updated_at": time.Now(),
	}); err != nil {
		utils.InternalError(c, "Failed to reject report")
		return
	}

	review := &models.ReportReview{
		ID:         uuid.New(),
		ReportID:   id,
		Action:     "reject",
		Comment:    req.Reason,
		ReviewerID: userID,
		CreatedAt:  time.Now(),
	}
	_ = h.repo.CreateReportReview(review)

	utils.JSON(c, http.StatusOK, gin.H{"message": "បានបដិសេធ"})
}

func (h *ReportDocumentHandler) ListReviews(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}

	reviews, err := h.repo.ListReportReviews(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch reviews")
		return
	}
	if reviews == nil {
		reviews = []models.ReportReview{}
	}
	utils.JSON(c, http.StatusOK, reviews)
}

func (h *ReportDocumentHandler) DownloadPDF(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}

	doc, err := h.repo.GetReportDocumentByID(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch report")
		return
	}
	if doc == nil {
		utils.Error(c, http.StatusNotFound, "Report not found")
		return
	}

	showPageNumbers := c.DefaultQuery("page_numbers", "false") == "true"
	pdfBytes, err := h.service.GenerateReportPDF(doc, showPageNumbers)
	if err != nil {
		log.Printf("ERROR generating report PDF: %v", err)
		utils.InternalError(c, "Failed to generate PDF report")
		return
	}

	filename := reportDownloadFilename(doc, "pdf")
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", contentDispositionAttachment(filename))
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

var htmlTagRe = regexp.MustCompile(`<[^>]*>`)
var whitespaceRe = regexp.MustCompile(`&nbsp;|\s`)

func isEmptyHTML(s string) bool {
	stripped := htmlTagRe.ReplaceAllString(s, "")
	stripped = whitespaceRe.ReplaceAllString(stripped, "")
	return stripped == ""
}

func bindAndValidateSimple(c *gin.Context, req interface{}) map[string]string {
	errs := make(map[string]string)

	if err := c.ShouldBindJSON(req); err != nil {
		if ve, ok := err.(validator.ValidationErrors); ok {
			for _, fe := range ve {
				label := camelToSnake(fe.Field())
				if msg, ok := simpleFieldMsg[label]; ok {
					errs[label] = msg
				} else {
					errs[label] = fmt.Sprintf("%s is required", label)
				}
			}
		}
	}

	if r, ok := req.(*models.CreateSimpleReportDocumentRequest); ok && r.Content != "" && isEmptyHTML(r.Content) {
		errs["content"] = "សូមបញ្ចូលខ្លឹមសាររបាយការណ៍"
	}
	if r, ok := req.(*models.UpdateSimpleReportDocumentRequest); ok && r.Content != "" && isEmptyHTML(r.Content) {
		errs["content"] = "សូមបញ្ចូលខ្លឹមសាររបាយការណ៍"
	}

	return errs
}

var simpleFieldMsg = map[string]string{
	"title":       "សូមបញ្ចូលចំណងជើងរបាយការណ៍",
	"description": "សូមបញ្ចូលការពិពណ៌នា",
	"content":     "សូមបញ្ចូលខ្លឹមសាររបាយការណ៍",
	"category":    "សូមជ្រើសរើសប្រភេទរបាយការណ៍",
}

func camelToSnake(s string) string {
	var buf strings.Builder
	for i, c := range s {
		if c >= 'A' && c <= 'Z' {
			if i > 0 {
				buf.WriteByte('_')
			}
			buf.WriteRune(c + 32)
		} else {
			buf.WriteRune(c)
		}
	}
	return buf.String()
}
