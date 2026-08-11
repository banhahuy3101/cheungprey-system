package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type MembershipHandler struct {
	repo *repository.Repository
}

func NewMembershipHandler(repo *repository.Repository) *MembershipHandler {
	return &MembershipHandler{repo: repo}
}

// --- Search / Filter ---

func (h *MembershipHandler) SearchMembers(c *gin.Context) {
	var filter models.MemberFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if filter.ZoneCode == "" {
		if profile, err := auth.GetProfile(c); err == nil && profile.ZoneCode != nil {
			roles, _ := auth.GetUserRoles(c)
			isAdmin := false
			for _, r := range roles {
				if r == models.RoleSuperAdmin || r == models.RoleAdmin {
					isAdmin = true
					break
				}
			}
			if !isAdmin {
				filter.ZoneCode = *profile.ZoneCode
			}
		}
	}

	members, err := h.repo.ListMembersFiltered(filter)
	if err != nil {
		utils.InternalError(c, "Failed to fetch members")
		return
	}

	utils.JSON(c, http.StatusOK, members)
}

// --- Profile ---

func (h *MembershipHandler) GetProfile(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	member, err := h.repo.GetMemberByID(id)
	if err != nil || member == nil {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}

	demos, _ := h.repo.GetDemographics(id)
	positions, _ := h.repo.ListPositions(id)
	dues, _ := h.repo.GetDuesSummary(id)
	cards, _ := h.repo.ListCards(id)
	activities, _ := h.repo.ListActivity(id)

	if positions == nil {
		positions = []models.MemberPosition{}
	}
	if cards == nil {
		cards = []models.MemberCard{}
	}
	if activities == nil {
		activities = []models.MemberActivity{}
	}

	profile := models.MembershipProfile{
		Member:       member,
		Demographics: demos,
		Positions:    positions,
		CurrentDues:  dues,
		Cards:        cards,
		Activity:     activities,
	}

	utils.JSON(c, http.StatusOK, profile)
}

// --- Demographics ---

func (h *MembershipHandler) GetDemographics(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	demos, err := h.repo.GetDemographics(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch demographics")
		return
	}
	if demos == nil {
		utils.JSON(c, http.StatusOK, nil)
		return
	}
	utils.JSON(c, http.StatusOK, demos)
}

func (h *MembershipHandler) UpdateDemographics(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	member, err := h.repo.GetMemberByID(id)
	if err != nil || member == nil {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}

	var req models.UpdateDemographicsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	existing, _ := h.repo.GetDemographics(id)
	if existing == nil {
		existing = &models.MemberDemographics{
			MemberID: id,
		}
	}

	if req.MaritalStatus != "" {
		existing.MaritalStatus = &req.MaritalStatus
	}
	if req.Occupation != "" {
		existing.Occupation = &req.Occupation
	}
	if req.EducationLevel != "" {
		existing.EducationLevel = &req.EducationLevel
	}
	if req.Ethnicity != "" {
		existing.Ethnicity = &req.Ethnicity
	}
	if req.Religion != "" {
		existing.Religion = &req.Religion
	}
	if req.EmergencyContactName != "" {
		existing.EmergencyContactName = &req.EmergencyContactName
	}
	if req.EmergencyContactPhone != "" {
		existing.EmergencyContactPhone = &req.EmergencyContactPhone
	}
	if req.BloodType != "" {
		existing.BloodType = &req.BloodType
	}

	if err := h.repo.UpsertDemographics(existing); err != nil {
		utils.InternalError(c, "Failed to update demographics")
		return
	}

	utils.JSON(c, http.StatusOK, existing)
}

// --- Dues ---

func (h *MembershipHandler) ListDues(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	dues, err := h.repo.ListDues(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch dues")
		return
	}
	if dues == nil {
		dues = []models.MemberDue{}
	}

	utils.JSON(c, http.StatusOK, dues)
}

func (h *MembershipHandler) RecordDue(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	member, err := h.repo.GetMemberByID(id)
	if err != nil || member == nil {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}

	var req models.RecordDueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	paymentDate, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		paymentDate = time.Now()
	}

	paymentStatus := req.PaymentStatus
	if paymentStatus == "" {
		paymentStatus = "Paid"
	}

	due := &models.MemberDue{
		ID:            uuid.New(),
		MemberID:      id,
		Amount:        req.Amount,
		PaymentMethod: req.PaymentMethod,
		PaymentDate:   paymentDate,
		PaymentStatus: paymentStatus,
	}

	if req.ReferenceNumber != "" {
		due.ReferenceNumber = &req.ReferenceNumber
	}
	if req.Notes != "" {
		due.Notes = &req.Notes
	}

	userID, err := auth.GetUserID(c)
	if err == nil {
		due.RecordedBy = &userID
	}

	if err := h.repo.CreateDue(due); err != nil {
		utils.InternalError(c, "Failed to record due")
		return
	}

	utils.JSON(c, http.StatusCreated, due)
}

// --- Status ---

func (h *MembershipHandler) ChangeStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	member, err := h.repo.GetMemberByID(id)
	if err != nil || member == nil {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}

	var req models.ChangeStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if member.Status == req.Status {
		utils.BadRequest(c, "Member already has status "+req.Status)
		return
	}

	oldStatus := member.Status

	updateData := map[string]any{
		"status":     req.Status,
		"updated_at": "now()",
	}

	if req.Status == "Resigned" {
		updateData["resignation_date"] = time.Now().Format("2006-01-02")
	}
	if req.Status == "Expelled" && req.Reason != "" {
		updateData["expulsion_reason"] = req.Reason
	}

	if err := h.repo.UpdateMember(id, updateData); err != nil {
		utils.InternalError(c, "Failed to update member status")
		return
	}

	history := &models.MemberStatusHistory{
		ID:        uuid.New(),
		MemberID:  id,
		OldStatus: oldStatus,
		NewStatus: req.Status,
	}

	if req.Reason != "" {
		history.Reason = &req.Reason
	}
	userID, err := auth.GetUserID(c)
	if err == nil {
		history.ChangedBy = &userID
	}

	if err := h.repo.CreateStatusHistory(history); err != nil {
		utils.InternalError(c, "Failed to record status history")
		return
	}

	utils.JSON(c, http.StatusOK, history)
}

func (h *MembershipHandler) GetStatusHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	history, err := h.repo.ListStatusHistory(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch status history")
		return
	}
	if history == nil {
		history = []models.MemberStatusHistory{}
	}

	utils.JSON(c, http.StatusOK, history)
}

// --- Activity ---

func (h *MembershipHandler) ListActivity(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	activities, err := h.repo.ListActivity(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch activities")
		return
	}
	if activities == nil {
		activities = []models.MemberActivity{}
	}

	utils.JSON(c, http.StatusOK, activities)
}

func (h *MembershipHandler) RecordActivity(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	member, err := h.repo.GetMemberByID(id)
	if err != nil || member == nil {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}

	var req models.RecordActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	activity := &models.MemberActivity{
		ID:           uuid.New(),
		MemberID:     id,
		ActivityType: req.ActivityType,
		Title:        req.Title,
		ActivityDate: req.ActivityDate,
		Hours:        req.Hours,
	}
	if req.Description != "" {
		activity.Description = &req.Description
	}

	if err := h.repo.CreateActivity(activity); err != nil {
		utils.InternalError(c, "Failed to record activity")
		return
	}

	utils.JSON(c, http.StatusCreated, activity)
}

// --- Positions ---

func (h *MembershipHandler) ListPositions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	positions, err := h.repo.ListPositions(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch positions")
		return
	}
	if positions == nil {
		positions = []models.MemberPosition{}
	}

	utils.JSON(c, http.StatusOK, positions)
}

func (h *MembershipHandler) AssignPosition(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	member, err := h.repo.GetMemberByID(id)
	if err != nil || member == nil {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}

	var req models.AssignPositionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if err := h.repo.DeactivateCurrentPositions(id); err != nil {
		utils.InternalError(c, "Failed to deactivate current positions")
		return
	}

	position := &models.MemberPosition{
		ID:         uuid.New(),
		MemberID:   id,
		PartyRole:  req.PartyRole,
		StartDate:  req.StartDate,
		IsCurrent:  true,
	}
	if req.PositionTitle != "" {
		position.PositionTitle = &req.PositionTitle
	}
	if req.Committee != "" {
		position.Committee = &req.Committee
	}
	if req.Rank > 0 {
		position.Rank = &req.Rank
	}
	if req.StructureID != "" {
		sid, err := uuid.Parse(req.StructureID)
		if err == nil {
			position.StructureID = &sid
		}
	}

	if err := h.repo.CreatePosition(position); err != nil {
		utils.InternalError(c, "Failed to assign position")
		return
	}

	utils.JSON(c, http.StatusCreated, position)
}

// --- Cards ---

func (h *MembershipHandler) ListCards(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	cards, err := h.repo.ListCards(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch cards")
		return
	}
	if cards == nil {
		cards = []models.MemberCard{}
	}

	utils.JSON(c, http.StatusOK, cards)
}

func (h *MembershipHandler) IssueCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	member, err := h.repo.GetMemberByID(id)
	if err != nil || member == nil {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}

	var req models.IssueCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	card := &models.MemberCard{
		ID:         uuid.New(),
		MemberID:   id,
		CardNo:     req.CardNo,
		CardStatus: "Issued",
		IssuedAt:   time.Now(),
	}

	if err := h.repo.IssueCard(card); err != nil {
		utils.InternalError(c, "Failed to issue card")
		return
	}

	utils.JSON(c, http.StatusCreated, card)
}

func (h *MembershipHandler) UpdateCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid card ID")
		return
	}

	var req models.UpdateCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	now := time.Now()
	data := map[string]any{"card_status": req.CardStatus}
	switch req.CardStatus {
	case "Delivered":
		data["delivered_at"] = now
	case "Expired":
		data["expired_at"] = now
	case "Replaced":
		data["expired_at"] = now
		if req.ReplacedReason != "" {
			data["replaced_reason"] = req.ReplacedReason
		}
	}

	if err := h.repo.UpdateCard(id, data); err != nil {
		utils.InternalError(c, "Failed to update card")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Card updated"})
}

// --- Check-in ---

func (h *MembershipHandler) CheckIn(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	member, err := h.repo.GetMemberByID(id)
	if err != nil || member == nil {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}

	activity := &models.MemberActivity{
		ID:           uuid.New(),
		MemberID:     id,
		ActivityType: "CheckIn",
		Title:        "Member Check-in",
		ActivityDate: time.Now().Format("2006-01-02"),
		Hours:        0,
	}

	if err := h.repo.CreateActivity(activity); err != nil {
		utils.InternalError(c, "Failed to check in")
		return
	}

	utils.JSON(c, http.StatusCreated, gin.H{
		"message":  "Check-in recorded",
		"activity": activity,
	})
}

// --- Stats ---

func (h *MembershipHandler) GetStats(c *gin.Context) {
	stats, err := h.repo.GetMembershipStats()
	if err != nil {
		utils.InternalError(c, "Failed to fetch membership stats")
		return
	}

	utils.JSON(c, http.StatusOK, stats)
}

// --- Bulk Import ---

func (h *MembershipHandler) BulkImport(c *gin.Context) {
	var members []models.Member
	if err := c.ShouldBindJSON(&members); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if len(members) == 0 {
		utils.BadRequest(c, "No members provided")
		return
	}

	existing, err := h.repo.ListMembers("")
	if err != nil {
		utils.InternalError(c, "Failed to validate import")
		return
	}

	existingCards := map[string]bool{}
	existingPhones := map[string]bool{}
	existingNIDs := map[string]bool{}
	for _, m := range existing {
		existingCards[m.MembershipCardNo] = true
		if m.PhoneNumber != "" {
			existingPhones[m.PhoneNumber] = true
		}
		if m.NationalID != nil && *m.NationalID != "" {
			existingNIDs[*m.NationalID] = true
		}
	}

	var duplicates []map[string]string
	validMembers := []models.Member{}
	for i, m := range members {
		if existingCards[m.MembershipCardNo] {
			duplicates = append(duplicates, map[string]string{
				"index":  fmt.Sprintf("%d", i),
				"field":  "membership_card_no",
				"value":  m.MembershipCardNo,
				"reason": "duplicate card number",
			})
			continue
		}
		if m.PhoneNumber != "" && existingPhones[m.PhoneNumber] {
			duplicates = append(duplicates, map[string]string{
				"index":  fmt.Sprintf("%d", i),
				"field":  "phone_number",
				"value":  m.PhoneNumber,
				"reason": "duplicate phone number",
			})
			continue
		}
		if m.NationalID != nil && *m.NationalID != "" && existingNIDs[*m.NationalID] {
			duplicates = append(duplicates, map[string]string{
				"index":  fmt.Sprintf("%d", i),
				"field":  "national_id",
				"value":  *m.NationalID,
				"reason": "duplicate national ID",
			})
			continue
		}

		m.ID = uuid.New()
		if m.PartyRole == "" {
			m.PartyRole = "Member"
		}
		if m.Status == "" {
			m.Status = "Active"
		}
		if m.MembershipType == nil {
			t := "Full"
			m.MembershipType = &t
		}
		if m.MembershipTier == nil {
			t := "Basic"
			m.MembershipTier = &t
		}
		validMembers = append(validMembers, m)
		existingCards[m.MembershipCardNo] = true
		if m.PhoneNumber != "" {
			existingPhones[m.PhoneNumber] = true
		}
		if m.NationalID != nil && *m.NationalID != "" {
			existingNIDs[*m.NationalID] = true
		}
	}

	created, errs := h.repo.CreateMemberBatch(validMembers)

	utils.JSON(c, http.StatusOK, gin.H{
		"total":      len(members),
		"created":    len(created),
		"errors":     len(errs),
		"duplicates": len(duplicates),
		"members":    created,
		"duplicate_details": duplicates,
	})
}

// --- Bulk Status Change ---

func (h *MembershipHandler) BulkStatusChange(c *gin.Context) {
	var req models.BulkStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	result := models.BulkStatusResult{
		Total: len(req.MemberIDs),
	}

	userID, _ := auth.GetUserID(c)

	for _, memberID := range req.MemberIDs {
		member, err := h.repo.GetMemberByID(memberID)
		if err != nil || member == nil {
			result.Errors = append(result.Errors, models.BulkStatusError{
				MemberID: memberID,
				Error:    "Member not found",
			})
			continue
		}

		if member.Status == req.Status {
			result.Errors = append(result.Errors, models.BulkStatusError{
				MemberID: memberID,
				Error:    fmt.Sprintf("already has status %s", req.Status),
			})
			continue
		}

		oldStatus := member.Status

		updateData := map[string]any{
			"status":     req.Status,
			"updated_at": "now()",
		}
		if req.Status == "Resigned" {
			updateData["resignation_date"] = time.Now().Format("2006-01-02")
		}
		if req.Status == "Expelled" && req.Reason != "" {
			updateData["expulsion_reason"] = req.Reason
		}

		if err := h.repo.UpdateMember(memberID, updateData); err != nil {
			result.Errors = append(result.Errors, models.BulkStatusError{
				MemberID: memberID,
				Error:    err.Error(),
			})
			continue
		}

		history := &models.MemberStatusHistory{
			ID:        uuid.New(),
			MemberID:  memberID,
			OldStatus: oldStatus,
			NewStatus: req.Status,
		}
		if req.Reason != "" {
			history.Reason = &req.Reason
		}
		if userID != uuid.Nil {
			history.ChangedBy = &userID
		}
		if err := h.repo.CreateStatusHistory(history); err != nil {
			// non-critical, continue
		}

		result.Changed++
	}

	utils.JSON(c, http.StatusOK, result)
}

// --- Export ---

func (h *MembershipHandler) Export(c *gin.Context) {
	status := c.Query("status")
	zoneCode := c.Query("zone_code")

	members, err := h.repo.ListMembers(status)
	if err != nil {
		utils.InternalError(c, "Failed to fetch members")
		return
	}

	var filtered []models.Member
	for _, m := range members {
		if zoneCode != "" && len(m.RegisteredVillageCode) >= len(zoneCode) &&
			m.RegisteredVillageCode[:len(zoneCode)] != zoneCode {
			continue
		}
		filtered = append(filtered, m)
	}

	if filtered == nil {
		filtered = []models.Member{}
	}

	utils.JSON(c, http.StatusOK, filtered)
}
