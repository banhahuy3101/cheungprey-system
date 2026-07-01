package handlers

import (
	"encoding/base64"
	"log"
	"net/http"
	"path/filepath"
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

func (h *ReportTemplateHandler) ListKeys(c *gin.Context) {
	utils.JSON(c, http.StatusOK, models.ReportTemplateKeys)
}

func stripTemplateFileData(templates []models.ReportTemplate) []models.ReportTemplate {
	out := make([]models.ReportTemplate, len(templates))
	for i, t := range templates {
		out[i] = t
		out[i].FileData = ""
	}
	return out
}

func (h *ReportTemplateHandler) List(c *gin.Context) {
	templates, err := h.repo.ListReportTemplates()
	if err != nil {
		log.Printf("ERROR list report templates: %v", err)
		utils.InternalError(c, "Failed to fetch templates")
		return
	}
	if templates == nil {
		templates = []models.ReportTemplate{}
	}
	utils.JSON(c, http.StatusOK, stripTemplateFileData(templates))
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
	resp := *tmpl
	resp.FileData = ""
	utils.JSON(c, http.StatusOK, resp)
}

func (h *ReportTemplateHandler) Upload(c *gin.Context) {
	userID, _ := auth.GetUserID(c)

	var req models.UploadReportTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	ext := strings.ToLower(filepath.Ext(req.FileName))
	format := ""
	switch ext {
	case ".html", ".htm":
		format = "html"
	case ".docx":
		format = "docx"
	default:
		utils.BadRequest(c, "Supported formats: .html, .htm, .docx")
		return
	}

	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(req.Base64Data))
	if err != nil {
		utils.BadRequest(c, "Invalid base64 file data")
		return
	}
	if len(raw) == 0 {
		utils.BadRequest(c, "Template file is empty")
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.TrimSuffix(req.FileName, ext)
	}

	now := time.Now()
	tmpl := &models.ReportTemplate{
		ID:        uuid.New(),
		Name:      name,
		FileName:  req.FileName,
		Format:    format,
		CreatedBy: userID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if format == "html" {
		tmpl.Content = string(raw)
	} else {
		tmpl.FileData = base64.StdEncoding.EncodeToString(raw)
	}

	if err := h.repo.CreateReportTemplate(tmpl); err != nil {
		log.Printf("ERROR create report template: %v", err)
		utils.InternalError(c, "Failed to save template")
		return
	}

	resp := *tmpl
	resp.FileData = ""
	utils.JSON(c, http.StatusCreated, resp)
}

func (h *ReportTemplateHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid template ID")
		return
	}
	if err := h.repo.DeleteReportTemplate(id); err != nil {
		utils.InternalError(c, "Failed to delete template")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Template deleted"})
}
