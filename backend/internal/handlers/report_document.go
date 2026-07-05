package handlers

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
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
		CreatedBy:                 userID,
		CreatedAt:                 now,
		UpdatedAt:                 now,
	}
}

func simpleReportDocumentFromRequest(req models.CreateSimpleReportDocumentRequest, userID uuid.UUID, now time.Time) *models.ReportDocument {
	return &models.ReportDocument{
		ID:          uuid.New(),
		Title:       req.Title,
		Description: req.Description,
		Content:     req.Content,
		Status:      "draft",
		CreatedBy:   userID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

func simpleReportDocumentUpdateMap(req models.UpdateSimpleReportDocumentRequest) map[string]any {
	return map[string]any{
		"title":       req.Title,
		"description": req.Description,
		"content":     req.Content,
		"updated_at":  time.Now(),
	}
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
	return data
}

func (h *ReportDocumentHandler) Create(c *gin.Context) {
	userID, _ := auth.GetUserID(c)

	var req models.CreateReportDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
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
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	doc := simpleReportDocumentFromRequest(req, userID, time.Now())
	if err := h.repo.CreateReportDocument(doc); err != nil {
		log.Printf("ERROR create simple report document: %v", err)
		utils.InternalError(c, "Failed to create report")
		return
	}

	utils.JSON(c, http.StatusCreated, doc)
}

func (h *ReportDocumentHandler) List(c *gin.Context) {
	docs, err := h.repo.ListReportDocuments()
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
		utils.BadRequest(c, err.Error())
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
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if err := h.repo.UpdateReportDocument(id, simpleReportDocumentUpdateMap(req)); err != nil {
		utils.InternalError(c, "Failed to update report")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Report updated"})
}

func (h *ReportDocumentHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid report ID")
		return
	}

	if err := h.repo.DeleteReportDocument(id); err != nil {
		utils.InternalError(c, "Failed to delete report")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Report deleted"})
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
