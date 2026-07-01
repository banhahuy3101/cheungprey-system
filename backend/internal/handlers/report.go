package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/services"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type ReportHandler struct {
	repo    *repository.Repository
	service *services.ReportService
}

func NewReportHandler(repo *repository.Repository, service *services.ReportService) *ReportHandler {
	return &ReportHandler{repo: repo, service: service}
}

func (h *ReportHandler) MemberReport(c *gin.Context) {
	status := c.Query("status")

	members, err := h.repo.ListMembers(status)
	if err != nil {
		utils.InternalError(c, "Failed to fetch members")
		return
	}

	if members == nil {
		members = []models.Member{}
	}

	pdfBytes, err := h.service.GenerateMemberReport(members)
	if err != nil {
		log.Printf("ERROR generating member report: %v", err)
		utils.InternalError(c, "Failed to generate report")
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=member_report.pdf")
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}
