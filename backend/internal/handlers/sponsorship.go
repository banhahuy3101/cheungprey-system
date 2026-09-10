package handlers

import (
	"net/http"
	"strings"
	"time"

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

// -----------------------------------------------------------------------------
// LEVEL 1: SPONSORSHIP PERIODS HANDLERS
// -----------------------------------------------------------------------------

// ListPeriods handles GET /api/sponsorship-periods
func (h *SponsorshipHandler) ListPeriods(c *gin.Context) {
	periods, err := h.repo.ListSponsorshipPeriods()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":  periods,
		"total": len(periods),
	})
}

// GetPeriodByID handles GET /api/sponsorship-periods/:id
func (h *SponsorshipHandler) GetPeriodByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	period, err := h.repo.GetSponsorshipPeriodByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if period == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Period not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": period})
}

// CreatePeriod handles POST /api/sponsorship-periods
func (h *SponsorshipHandler) CreatePeriod(c *gin.Context) {
	var req models.CreatePeriodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var userID *uuid.UUID
	if uid, err := auth.GetUserID(c); err == nil && uid != uuid.Nil {
		userID = &uid
	}

	created, err := h.repo.CreateSponsorshipPeriod(req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

// UpdatePeriod handles PUT /api/sponsorship-periods/:id
func (h *SponsorshipHandler) UpdatePeriod(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	var req models.UpdatePeriodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, err := h.repo.UpdateSponsorshipPeriod(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// ConsolidatePeriod handles POST /api/sponsorship-periods/:id/consolidate
func (h *SponsorshipHandler) ConsolidatePeriod(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	var userID *uuid.UUID
	if uid, err := auth.GetUserID(c); err == nil && uid != uuid.Nil {
		userID = &uid
	}

	mergedCount, err := h.repo.ConsolidateRecordsForPeriod(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Successfully consolidated sponsorship records",
		"merged_count": mergedCount,
	})
}

// DeletePeriod handles DELETE /api/sponsorship-periods/:id
func (h *SponsorshipHandler) DeletePeriod(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID"})
		return
	}

	if err := h.repo.DeleteSponsorshipPeriod(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Period deleted successfully"})
}

// -----------------------------------------------------------------------------
// LEVEL 2: SPONSORSHIP RECORDS HANDLERS
// -----------------------------------------------------------------------------

func getUserZoneAndRole(c *gin.Context) (string, models.UserRole, []models.UserRole) {
	var userZone string
	var role models.UserRole
	var roles []models.UserRole

	if profile, err := auth.GetProfile(c); err == nil && profile != nil {
		if profile.ZoneCode != nil {
			userZone = strings.TrimSpace(*profile.ZoneCode)
		}
		role = profile.Role
		roles = profile.Roles
	}
	if role == "" {
		if r, err := auth.GetUserRole(c); err == nil {
			role = r
		}
	}
	if len(roles) == 0 {
		if rs, err := auth.GetUserRoles(c); err == nil {
			roles = rs
		}
	}
	return userZone, role, roles
}

func isDistrictLeaderOrAdmin(role models.UserRole, roles []models.UserRole) bool {
	check := func(r models.UserRole) bool {
		switch string(r) {
		case "super_admin", "admin", "finance_officer", "province_chief",
			"district_chief", "deputy_district_chief", "district_admin", "district_working_group":
			return true
		}
		return false
	}
	if check(role) {
		return true
	}
	for _, r := range roles {
		if check(r) {
			return true
		}
	}
	return false
}

// List handles GET /api/sponsorships
func (h *SponsorshipHandler) List(c *gin.Context) {
	var params models.SponsorshipFilterParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
		return
	}

	userZone, role, roles := getUserZoneAndRole(c)
	isDistrict := isDistrictLeaderOrAdmin(role, roles)

	// Non-district users are automatically restricted to their own zone in background
	if !isDistrict {
		params.ZoneCode = userZone
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

	userZone, role, roles := getUserZoneAndRole(c)
	isDistrict := isDistrictLeaderOrAdmin(role, roles)

	effectiveZone := ""
	if !isDistrict {
		effectiveZone = userZone
	}

	record, err := h.repo.GetSponsorshipByID(id, effectiveZone)
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

	usd := req.AmountUSD
	if usd == 0 && req.ExpenseAmountUSD != 0 {
		usd = req.ExpenseAmountUSD
	}
	if usd == 0 && req.CurrencyUSD != 0 {
		usd = req.CurrencyUSD
	}

	khr := req.AmountKHR
	if khr == 0 && req.ExpenseAmountKHR != 0 {
		khr = req.ExpenseAmountKHR
	}
	if khr == 0 && req.CurrencyKHR != 0 {
		khr = req.CurrencyKHR
	}

	expenseLabel := strings.TrimSpace(req.ExpenseLabel)
	if expenseLabel == "" {
		expenseLabel = strings.TrimSpace(req.IsExpenseLabel)
	}

	donor := strings.TrimSpace(req.ContributorName)
	if donor == "" {
		donor = strings.TrimSpace(req.DonorName)
	}

	classification := strings.TrimSpace(req.EntryClassification)
	if classification == "" {
		classification = strings.TrimSpace(req.Category)
	}
	if classification == "" {
		classification = "sponsorship"
	}

	usage := strings.TrimSpace(req.UsageDescription)
	if usage == "" {
		usage = strings.TrimSpace(req.AllocationPurpose)
	}

	var userID *uuid.UUID
	if uid, err := auth.GetUserID(c); err == nil && uid != uuid.Nil {
		userID = &uid
	}

	userZone, role, roles := getUserZoneAndRole(c)
	isDistrict := isDistrictLeaderOrAdmin(role, roles)

	items := req.Items
	if len(items) == 0 && len(req.InKindItems) > 0 {
		items = req.InKindItems
	}

	// Auto-fill ZoneCode and CreatedBy in background for all items
	for i := range items {
		if !isDistrict || items[i].ZoneCode == "" {
			if userZone != "" {
				items[i].ZoneCode = userZone
			} else {
				items[i].ZoneCode = "0303"
			}
		}
		if userID != nil {
			items[i].CreatedBy = userID
		}
	}

	entryNo := 0
	if req.EntryNo != nil && *req.EntryNo > 0 {
		entryNo = *req.EntryNo
	} else if req.RecordID != nil && *req.RecordID > 0 {
		entryNo = *req.RecordID
	}

	record := models.SponsorshipRecord{
		PeriodID:            req.PeriodID,
		EntryNo:             entryNo,
		FiscalYear:          req.FiscalYear,
		EntryClassification: classification,
		Category:            classification,
		SectionGroup:        strings.TrimSpace(req.SectionGroup),
		ContributorName:     donor,
		DonorName:           donor,
		Representatives:     strings.TrimSpace(req.Representatives),
		RecordPeriod:        strings.TrimSpace(req.RecordPeriod),
		IsExpenseTotal:      req.IsExpenseTotal,
		ExpenseLabel:        expenseLabel,
		IsExpenseLabel:      expenseLabel,
		ExpenseAmountUSD:    usd,
		ExpenseAmountKHR:    khr,
		AmountUSD:           usd,
		CurrencyUSD:         usd,
		AmountKHR:           khr,
		CurrencyKHR:         khr,
		UsageDescription:    usage,
		AllocationPurpose:   usage,
		Remarks:             strings.TrimSpace(req.Remarks),
		Status:              "draft",
		CreatedBy:           userID,
	}
	if record.FiscalYear == 0 {
		record.FiscalYear = time.Now().Year()
	}

	created, err := h.repo.CreateSponsorship(&record, items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.SubmitImmediately {
		_ = h.repo.SubmitSponsorship(created.ID)
		created.Status = "submitted"
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

	var req models.UpdateSponsorshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	usd := req.AmountUSD
	if usd == 0 && req.ExpenseAmountUSD != 0 {
		usd = req.ExpenseAmountUSD
	}
	if usd == 0 && req.CurrencyUSD != 0 {
		usd = req.CurrencyUSD
	}

	khr := req.AmountKHR
	if khr == 0 && req.ExpenseAmountKHR != 0 {
		khr = req.ExpenseAmountKHR
	}
	if khr == 0 && req.CurrencyKHR != 0 {
		khr = req.CurrencyKHR
	}

	expenseLabel := strings.TrimSpace(req.ExpenseLabel)
	if expenseLabel == "" {
		expenseLabel = strings.TrimSpace(req.IsExpenseLabel)
	}

	donor := strings.TrimSpace(req.ContributorName)
	if donor == "" {
		donor = strings.TrimSpace(req.DonorName)
	}

	classification := strings.TrimSpace(req.EntryClassification)
	if classification == "" {
		classification = strings.TrimSpace(req.Category)
	}

	usage := strings.TrimSpace(req.UsageDescription)
	if usage == "" {
		usage = strings.TrimSpace(req.AllocationPurpose)
	}

	var userID *uuid.UUID
	if uid, err := auth.GetUserID(c); err == nil && uid != uuid.Nil {
		userID = &uid
	}

	userZone, role, roles := getUserZoneAndRole(c)
	isDistrict := isDistrictLeaderOrAdmin(role, roles)

	effectiveZone := ""
	if !isDistrict {
		effectiveZone = userZone
	}

	items := req.Items
	if len(items) == 0 && len(req.InKindItems) > 0 {
		items = req.InKindItems
	}

	// Auto-fill ZoneCode and CreatedBy in background for all updated items
	for i := range items {
		if !isDistrict || items[i].ZoneCode == "" {
			if userZone != "" {
				items[i].ZoneCode = userZone
			} else {
				items[i].ZoneCode = "0303"
			}
		}
		if userID != nil {
			items[i].CreatedBy = userID
		}
	}

	entryNo := 0
	if req.EntryNo != nil && *req.EntryNo > 0 {
		entryNo = *req.EntryNo
	} else if req.RecordID != nil && *req.RecordID > 0 {
		entryNo = *req.RecordID
	}

	record := models.SponsorshipRecord{
		PeriodID:            req.PeriodID,
		EntryNo:             entryNo,
		FiscalYear:          req.FiscalYear,
		EntryClassification: classification,
		Category:            classification,
		SectionGroup:        strings.TrimSpace(req.SectionGroup),
		ContributorName:     donor,
		DonorName:           donor,
		Representatives:     strings.TrimSpace(req.Representatives),
		RecordPeriod:        strings.TrimSpace(req.RecordPeriod),
		IsExpenseTotal:      req.IsExpenseTotal,
		ExpenseLabel:        expenseLabel,
		IsExpenseLabel:      expenseLabel,
		ExpenseAmountUSD:    usd,
		ExpenseAmountKHR:    khr,
		AmountUSD:           usd,
		CurrencyUSD:         usd,
		AmountKHR:           khr,
		CurrencyKHR:         khr,
		UsageDescription:    usage,
		AllocationPurpose:   usage,
		Remarks:             strings.TrimSpace(req.Remarks),
	}

	updated, err := h.repo.UpdateSponsorship(id, &record, items, effectiveZone)
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

	userZone, role, roles := getUserZoneAndRole(c)
	isDistrict := isDistrictLeaderOrAdmin(role, roles)

	// Guard: Non-district users cannot delete shared records that contain other zones' items
	if !isDistrict {
		existing, _ := h.repo.GetSponsorshipByID(id)
		if existing != nil {
			for _, it := range existing.Items {
				if userZone != "" && !strings.HasPrefix(it.ZoneCode, userZone) {
					c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete sponsorship record containing items from other zones"})
					return
				}
			}
		}
	}

	if err := h.repo.DeleteSponsorship(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sponsorship record deleted successfully"})
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

	c.JSON(http.StatusOK, gin.H{"message": "Sponsorship record submitted for review"})
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
		Action string `json:"action" binding:"required"` // approve, return
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	reviewerID, err := auth.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	status := "reviewed"
	if req.Action == "return" {
		status = "returned"
	}

	if err := h.repo.ReviewSponsorship(id, reviewerID, status, req.Notes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sponsorship record review updated"})
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

	approverID, err := auth.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := h.repo.ApproveSponsorship(id, approverID, req.Notes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sponsorship record approved and locked"})
}

// GetSummary handles GET /api/sponsorships/summary
func (h *SponsorshipHandler) GetSummary(c *gin.Context) {
	period := c.Query("period")
	section := c.Query("section")

	userZone, role, roles := getUserZoneAndRole(c)
	isDistrict := isDistrictLeaderOrAdmin(role, roles)

	zone := c.Query("zone_code")
	if !isDistrict {
		zone = userZone
	}

	summary, err := h.repo.GetSponsorshipSummary(period, section, zone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": summary})
}
