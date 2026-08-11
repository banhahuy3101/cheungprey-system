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
	utils.JSON(c, http.StatusOK, configs)
}

func (h *ModuleConfigHandler) UpdateModule(c *gin.Context) {
	moduleKey := c.Param("key")
	if moduleKey == "dashboard" || moduleKey == "settings" {
		utils.BadRequest(c, "Cannot disable dashboard or settings module")
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
	moduleKey := c.Query("module")
	itemID, err := uuid.Parse(c.Param("itemId"))
	if err != nil {
		utils.BadRequest(c, "Invalid item ID")
		return
	}

	history, err := h.repo.ListApprovalHistory(moduleKey, itemID)
	if err != nil {
		utils.InternalError(c, "Failed to fetch approval history")
		return
	}

	utils.JSON(c, http.StatusOK, history)
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

	var req models.ApproveRejectRequest
	c.ShouldBindJSON(&req)

	userID, _ := auth.GetUserID(c)
	now := time.Now()

	data := map[string]any{
		"status":      "approved",
		"approved_by": userID.String(),
		"approved_at": now.Format(time.RFC3339),
	}
	if req.Notes != "" {
		notes := req.Notes
		data["notes"] = notes
	}

	if err := h.repo.UpdateWorkflowApproval(approvalID, data); err != nil {
		utils.InternalError(c, "Failed to approve")
		return
	}

	approval, _ := h.repo.GetApprovalByID(approvalID)
	if approval != nil {
		remaining, _ := h.repo.GetCurrentApproval(approval.ModuleKey, approval.ItemID)
		if remaining == nil {
			if approval.ModuleKey == "membership" {
				_ = h.repo.UpdateMember(approval.ItemID, map[string]any{"status": "Active"})
			}
			utils.JSON(c, http.StatusOK, gin.H{"success": true, "message": "Approved — workflow complete"})
			return
		}
	}

	utils.JSON(c, http.StatusOK, gin.H{"success": true, "message": "Approved"})
}

func (h *ModuleConfigHandler) RejectItem(c *gin.Context) {
	approvalID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid approval ID")
		return
	}

	var req models.ApproveRejectRequest
	c.ShouldBindJSON(&req)

	userID, _ := auth.GetUserID(c)
	now := time.Now()

	data := map[string]any{
		"status":      "rejected",
		"approved_by": userID.String(),
		"approved_at": now.Format(time.RFC3339),
	}
	if req.Notes != "" {
		notes := req.Notes
		data["notes"] = notes
	}

	if err := h.repo.UpdateWorkflowApproval(approvalID, data); err != nil {
		utils.InternalError(c, "Failed to reject")
		return
	}

	approval, _ := h.repo.GetApprovalByID(approvalID)
	if approval != nil {
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
	}

	utils.JSON(c, http.StatusOK, gin.H{"success": true, "message": "Rejected"})
}
