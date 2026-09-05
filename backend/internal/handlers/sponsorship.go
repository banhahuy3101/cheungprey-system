package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
)

type SponsorshipHandler struct {
	repo *repository.Repository
}

func NewSponsorshipHandler(repo *repository.Repository) *SponsorshipHandler {
	return &SponsorshipHandler{repo: repo}
}

// List handles GET /api/sponsorships
func (h *SponsorshipHandler) List(c *gin.Context) {
	var params models.SponsorshipFilterParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
		return
	}

	records, total, err := h.repo.ListSponsorships(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  records,
		"total": total,
		"page":  params.Page,
		"limit": params.Limit,
	})
}

// GetByID handles GET /api/sponsorships/:id
func (h *SponsorshipHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	record, err := h.repo.GetSponsorshipByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if record == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sponsorship record not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": record})
}

// Create handles POST /api/sponsorships
func (h *SponsorshipHandler) Create(c *gin.Context) {
	var req models.CreateSponsorshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate Rule 1 (Entry Completeness): Must have non-zero cash OR at least one material item with qty > 0
	hasCash := req.AmountUSD > 0 || req.AmountKHR > 0
	hasMaterial := false
	for _, item := range req.Items {
		if strings.TrimSpace(item.ItemName) != "" && item.ItemQty > 0 {
			hasMaterial = true
			break
		}
	}
	if !hasCash && !hasMaterial {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "តម្រូវឱ្យមានតម្លៃសាច់ប្រាក់ (USD ឬ KHR) ឬសម្ភារយ៉ាងតិចមួយមុខដែលមានបរិមាណធំជាង ០ (Must include cash value or at least one material item)",
		})
		return
	}

	userID, _ := auth.GetUserID(c)

	status := "draft"
	if req.SubmitImmediately {
		status = "submitted"
	}

	entryNo := 0
	if req.EntryNo != nil {
		entryNo = *req.EntryNo
	}

	record := models.SponsorshipRecord{
		EntryNo:          entryNo,
		SectionGroup:     strings.TrimSpace(req.SectionGroup),
		ContributorName:  strings.TrimSpace(req.ContributorName),
		RecordPeriod:     strings.TrimSpace(req.RecordPeriod),
		TargetLocation:   strings.TrimSpace(req.TargetLocation),
		AmountUSD:        req.AmountUSD,
		AmountKHR:        req.AmountKHR,
		UsageDescription: strings.TrimSpace(req.UsageDescription),
		Status:           status,
	}
	if userID != uuid.Nil {
		record.CreatedBy = &userID
	}

	created, err := h.repo.CreateSponsorship(&record, req.Items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

// Update handles PUT /api/sponsorships/:id
func (h *SponsorshipHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	existing, err := h.repo.GetSponsorshipByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sponsorship record not found"})
		return
	}

	// If record is already approved, prevent updates unless user is admin
	perms, _ := auth.GetPermissions(c)
	isAdmin := perms != nil && (perms[models.FeatureUsers] || perms[models.FeatureTechnical])
	if existing.Status == "approved" && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "កំណត់ត្រាត្រូវបានអនុម័តរួចហើយ មិនអាចកែប្រែបានទេ (Approved record cannot be modified)"})
		return
	}

	var req models.UpdateSponsorshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate Rule 1
	hasCash := req.AmountUSD > 0 || req.AmountKHR > 0
	hasMaterial := false
	for _, item := range req.Items {
		if strings.TrimSpace(item.ItemName) != "" && item.ItemQty > 0 {
			hasMaterial = true
			break
		}
	}
	if !hasCash && !hasMaterial {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "តម្រូវឱ្យមានតម្លៃសាច់ប្រាក់ (USD ឬ KHR) ឬសម្ភារយ៉ាងតិចមួយមុខដែលមានបរិមាណធំជាង ០",
		})
		return
	}

	entryNo := existing.EntryNo
	if req.EntryNo != nil && *req.EntryNo > 0 {
		entryNo = *req.EntryNo
	}

	record := models.SponsorshipRecord{
		EntryNo:          entryNo,
		SectionGroup:     strings.TrimSpace(req.SectionGroup),
		ContributorName:  strings.TrimSpace(req.ContributorName),
		RecordPeriod:     strings.TrimSpace(req.RecordPeriod),
		TargetLocation:   strings.TrimSpace(req.TargetLocation),
		AmountUSD:        req.AmountUSD,
		AmountKHR:        req.AmountKHR,
		UsageDescription: strings.TrimSpace(req.UsageDescription),
	}

	updated, err := h.repo.UpdateSponsorship(id, &record, req.Items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// Delete handles DELETE /api/sponsorships/:id
func (h *SponsorshipHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	if err := h.repo.DeleteSponsorship(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}

// Submit handles POST /api/sponsorships/:id/submit
func (h *SponsorshipHandler) Submit(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	if err := h.repo.SubmitSponsorship(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Submitted successfully"})
}

// Review handles POST /api/sponsorships/:id/review
func (h *SponsorshipHandler) Review(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	var req struct {
		Action string `json:"action" binding:"required"` // "review" or "return"
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	reviewerID, _ := auth.GetUserID(c)
	status := "reviewed"
	if req.Action == "return" {
		status = "returned"
	}

	if err := h.repo.ReviewSponsorship(id, reviewerID, status, req.Notes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reviewed status updated successfully", "status": status})
}

// Approve handles POST /api/sponsorships/:id/approve
func (h *SponsorshipHandler) Approve(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	var req models.SponsorshipStatusRequest
	_ = c.ShouldBindJSON(&req)

	approverID, _ := auth.GetUserID(c)

	if err := h.repo.ApproveSponsorship(id, approverID, req.Notes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Approved and locked successfully"})
}

// GetSummary handles GET /api/sponsorships/summary
func (h *SponsorshipHandler) GetSummary(c *gin.Context) {
	period := c.Query("record_period")
	section := c.Query("section_group")
	location := c.Query("target_location")

	summary, err := h.repo.GetSponsorshipSummary(period, section, location)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": summary})
}
