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

type ModuleConfigHandler struct {
	repo *repository.Repository
}

func NewModuleConfigHandler(repo *repository.Repository) *ModuleConfigHandler {
	return &ModuleConfigHandler{repo: repo}
}

func (h *ModuleConfigHandler) ListModules(c *gin.Context) {
	configs, err := h.repo.ListModuleConfigs()
	if err != nil {
		utils.InternalError(c, "Failed to list modules")
		return
	}

	for i := range configs {
		steps, err := h.repo.ListWorkflowSteps(configs[i].ModuleKey)
		if err == nil && steps != nil {
			configs[i].Steps = steps
		} else {
			configs[i].Steps = []models.WorkflowStep{}
		}
	}

	utils.JSON(c, http.StatusOK, configs)
}

func (h *ModuleConfigHandler) UpdateModule(c *gin.Context) {
	moduleKey := c.Param("key")
	if moduleKey == "dashboard" {
		utils.BadRequest(c, "Cannot disable dashboard module")
		return
	}

	var req models.UpdateModuleConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	cfg, err := h.repo.GetModuleConfig(moduleKey)
	if err != nil || cfg == nil {
		utils.JSON(c, http.StatusNotFound, gin.H{"error": "Module not found"})
		return
	}

	if req.Enabled != nil {
		cfg.Enabled = *req.Enabled
	}
	if req.NeedApproval != nil {
		cfg.NeedApproval = *req.NeedApproval
	}
	if req.AllowEdit != nil {
		cfg.AllowEdit = *req.AllowEdit
	}
	if req.Settings != nil {
		cfg.Settings = req.Settings
	}

	if err := h.repo.UpsertModuleConfig(cfg); err != nil {
		utils.InternalError(c, "Failed to update module config")
		return
	}

	utils.JSON(c, http.StatusOK, cfg)
}

func (h *ModuleConfigHandler) ListSteps(c *gin.Context) {
	moduleKey := c.Param("key")
	steps, err := h.repo.ListWorkflowSteps(moduleKey)
	if err != nil {
		utils.InternalError(c, "Failed to list steps")
		return
	}
	utils.JSON(c, http.StatusOK, steps)
}

func (h *ModuleConfigHandler) CreateStep(c *gin.Context) {
	moduleKey := c.Param("key")

	var req models.CreateWorkflowStepRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	canReject := true
	if req.CanReject != nil {
		canReject = *req.CanReject
	}

	step := &models.WorkflowStep{
		ID:           uuid.New(),
		ModuleKey:    moduleKey,
		ApproverRole: req.ApproverRole,
		CanReject:    canReject,
	}

	if err := h.repo.CreateWorkflowStep(step); err != nil {
		utils.InternalError(c, "Failed to create step")
		return
	}

	utils.JSON(c, http.StatusCreated, step)
}

func (h *ModuleConfigHandler) UpdateStep(c *gin.Context) {
	id, err := uuid.Parse(c.Param("stepId"))
	if err != nil {
		utils.BadRequest(c, "Invalid step ID")
		return
	}

	var req models.UpdateWorkflowStepRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	data := map[string]any{}
	if req.ApproverRole != "" {
		data["approver_role"] = req.ApproverRole
	}
	if req.CanReject != nil {
		data["can_reject"] = *req.CanReject
	}

	if err := h.repo.UpdateWorkflowStep(id, data); err != nil {
		utils.InternalError(c, "Failed to update step")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"success": true})
}

func (h *ModuleConfigHandler) DeleteStep(c *gin.Context) {
	id, err := uuid.Parse(c.Param("stepId"))
	if err != nil {
		utils.BadRequest(c, "Invalid step ID")
		return
	}

	if err := h.repo.DeleteWorkflowStep(id); err != nil {
		utils.InternalError(c, "Failed to delete step")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"success": true})
}

func (h *ModuleConfigHandler) ReorderSteps(c *gin.Context) {
	moduleKey := c.Param("key")

	var req models.ReorderStepsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if err := h.repo.ReorderWorkflowSteps(req.StepIDs); err != nil {
		utils.InternalError(c, "Failed to reorder steps")
		return
	}

	steps, _ := h.repo.ListWorkflowSteps(moduleKey)
	utils.JSON(c, http.StatusOK, steps)
}

func (h *ModuleConfigHandler) ItemApprovalHistory(c *gin.Context) {
	moduleKey := c.Param("module")
	itemID, err := uuid.Parse(c.Param("itemId"))
	if err != nil {
		utils.BadRequest(c, "Invalid item ID")
		return
	}

	steps, _ := h.repo.ListWorkflowSteps(moduleKey)
	history, _ := h.repo.ListApprovalHistory(moduleKey, itemID)

	historyMap := make(map[int]models.WorkflowApproval)
	for _, a := range history {
		historyMap[a.StepOrder] = a
	}

	// Get member's zone to find assigned chiefs
	var zoneCode string
	if moduleKey == "membership" {
		member, _ := h.repo.GetMemberByID(itemID)
		if member != nil {
			zoneCode = member.RegisteredVillageCode
		}
	}

	// Get assigned chief names per role for this zone
	chiefNames := h.getChiefNamesForZone(zoneCode)

	type StepInfo struct {
		ID               string  `json:"id"`
		StepOrder        int     `json:"step_order"`
		ApproverRole     string  `json:"approver_role"`
		ApproverName     string  `json:"approver_name"`
		CanReject        bool    `json:"can_reject"`
		Status           string  `json:"status"`
		ApprovedBy       *string `json:"approved_by"`
		ApprovedByName   string  `json:"approved_by_name"`
		ApprovedAt       *string `json:"approved_at"`
		Notes            *string `json:"notes"`
	}

	var result []StepInfo
	for _, s := range steps {
		info := StepInfo{
			StepOrder:    s.StepOrder,
			ApproverRole: s.ApproverRole,
			ApproverName: chiefNames[s.ApproverRole],
			CanReject:    s.CanReject,
			Status:       "pending",
		}
		if a, ok := historyMap[s.StepOrder]; ok {
			info.ID = a.ID.String()
			info.Status = a.Status
			if a.ApprovedBy != nil {
				v := a.ApprovedBy.String()
				info.ApprovedBy = &v
				if name, err := h.repo.GetProfileName(*a.ApprovedBy); err == nil {
					info.ApprovedByName = name
				}
			}
			if a.ApprovedAt != nil {
				v := a.ApprovedAt.Format(time.RFC3339)
				info.ApprovedAt = &v
			}
			info.Notes = a.Notes
		}
		result = append(result, info)
	}

	if result == nil {
		result = []StepInfo{}
	}

	utils.JSON(c, http.StatusOK, result)
}

func (h *ModuleConfigHandler) getChiefNamesForZone(zoneCode string) map[string]string {
	names := make(map[string]string)
	if zoneCode == "" {
		return names
	}

	roles := []string{"commune_chief", "district_chief", "province_chief"}
	for _, role := range roles {
		name, err := h.repo.GetZoneChiefName(zoneCode, role)
		if err == nil && name != "" {
			names[role] = name
		}
	}
	return names
}

func (h *ModuleConfigHandler) ApprovalQueue(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	role, _ := auth.GetUserRole(c)
	moduleKey := c.Query("module")

	cfg, err := h.repo.GetModuleConfig(moduleKey)
	if err != nil || cfg == nil || !cfg.NeedApproval {
		utils.JSON(c, http.StatusOK, []models.WorkflowApproval{})
		return
	}

	profile, _ := auth.GetProfile(c)
	zonePrefix := ""
	if profile != nil && profile.ZoneCode != nil {
		zonePrefix = *profile.ZoneCode
	}

	approvals, err := h.repo.ListPendingApprovalsForApprover(moduleKey, string(role), zonePrefix)
	if err != nil {
		utils.InternalError(c, "Failed to fetch approval queue")
		return
	}

	_ = userID

	utils.JSON(c, http.StatusOK, approvals)
}

func (h *ModuleConfigHandler) ApproveItem(c *gin.Context) {
	approvalID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid approval ID")
		return
	}

	userID, role := h.getUserContext(c)

	approval, err := h.repo.GetApprovalByID(approvalID)
	if err != nil || approval == nil {
		utils.JSON(c, http.StatusNotFound, gin.H{"error": "Approval not found"})
		return
	}
	if approval.Status != "pending" {
		utils.BadRequest(c, "Already processed")
		return
	}

	steps, _ := h.repo.ListWorkflowSteps(approval.ModuleKey)
	var currentStep *models.WorkflowStep
	for _, s := range steps {
		if s.StepOrder == approval.StepOrder {
			currentStep = &s
			break
		}
	}

	if currentStep != nil && string(role) != currentStep.ApproverRole {
		if !h.canOverride(c) {
			utils.Forbidden(c, "Only "+currentStep.ApproverRole+" can approve this step")
			return
		}
	}

	var req models.ApproveRejectRequest
	c.ShouldBindJSON(&req)

	data := map[string]any{
		"status":      "approved",
		"approved_by": userID.String(),
	}
	if req.Notes != "" {
		data["notes"] = req.Notes
	}

	if err := h.repo.UpdateWorkflowApproval(approvalID, data); err != nil {
		utils.InternalError(c, "Failed to approve")
		return
	}

	remaining, _ := h.repo.GetCurrentApproval(approval.ModuleKey, approval.ItemID)
	if remaining == nil {
		if approval.ModuleKey == "membership" {
			_ = h.repo.UpdateMember(approval.ItemID, map[string]any{"status": "Active"})
		}
		if approval.ModuleKey == "reports" {
			_ = h.repo.UpdateReportDocument(approval.ItemID, map[string]any{"status": "published", "updated_at": time.Now()})
			_ = h.repo.CreateReportReview(&models.ReportReview{
				ID:         uuid.New(),
				ReportID:   approval.ItemID,
				Action:     "approve",
				ReviewerID: userID,
				CreatedAt:  time.Now(),
			})
		}
		utils.JSON(c, http.StatusOK, gin.H{"success": true, "message": "Approved — workflow complete"})
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"success": true, "message": "Approved"})
}

func (h *ModuleConfigHandler) RejectItem(c *gin.Context) {
	approvalID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid approval ID")
		return
	}

	userID, role := h.getUserContext(c)

	approval, err := h.repo.GetApprovalByID(approvalID)
	if err != nil || approval == nil {
		utils.JSON(c, http.StatusNotFound, gin.H{"error": "Approval not found"})
		return
	}
	if approval.Status != "pending" {
		utils.BadRequest(c, "Already processed")
		return
	}

	steps, _ := h.repo.ListWorkflowSteps(approval.ModuleKey)
	var currentStep *models.WorkflowStep
	for _, s := range steps {
		if s.StepOrder == approval.StepOrder {
			currentStep = &s
			break
		}
	}

	if currentStep != nil {
		if string(role) != currentStep.ApproverRole && !h.canOverride(c) {
			utils.Forbidden(c, "Only "+currentStep.ApproverRole+" can reject this step")
			return
		}
		if !currentStep.CanReject && !h.canOverride(c) {
			utils.Forbidden(c, "This step does not allow rejection")
			return
		}
	}

	var req models.ApproveRejectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	data := map[string]any{
		"status":      "rejected",
		"approved_by": userID.String(),
	}
	if req.Notes != "" {
		data["notes"] = req.Notes
	}

	if err := h.repo.UpdateWorkflowApproval(approvalID, data); err != nil {
		utils.InternalError(c, "Failed to reject")
		return
	}

	all, _ := h.repo.ListApprovalHistory(approval.ModuleKey, approval.ItemID)
	for _, a := range all {
		if a.StepOrder > approval.StepOrder && a.Status == "pending" {
			_ = h.repo.UpdateWorkflowApproval(a.ID, map[string]any{
				"status": "rejected",
				"notes":  fmt.Sprintf("Rejected: workflow ended at step %d", approval.StepOrder),
			})
		}
	}
	if approval.ModuleKey == "membership" {
		_ = h.repo.UpdateMember(approval.ItemID, map[string]any{"status": "Suspended"})
	}
	if approval.ModuleKey == "reports" {
		_ = h.repo.UpdateReportDocument(approval.ItemID, map[string]any{"status": "rejected", "updated_at": time.Now()})
		_ = h.repo.CreateReportReview(&models.ReportReview{
			ID:         uuid.New(),
			ReportID:   approval.ItemID,
			Action:     "reject",
			ReviewerID: userID,
			CreatedAt:  time.Now(),
		})
	}

	utils.JSON(c, http.StatusOK, gin.H{"success": true, "message": "Rejected"})
}

func (h *ModuleConfigHandler) getUserContext(c *gin.Context) (uuid.UUID, models.UserRole) {
	userID, _ := auth.GetUserID(c)
	role, _ := auth.GetUserRole(c)
	return userID, role
}

func (h *ModuleConfigHandler) canOverride(c *gin.Context) bool {
	return auth.HasFeature(c, models.FeatureSettings) || auth.HasFeature(c, models.FeatureUsers)
}
