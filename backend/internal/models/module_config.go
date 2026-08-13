package models

import (
	"time"

	"github.com/google/uuid"
)

type ModuleConfig struct {
	ModuleKey    string                 `json:"module_key"`
	Enabled      bool                   `json:"enabled"`
	NeedApproval bool                   `json:"need_approval"`
	AllowEdit    bool                   `json:"allow_edit"`
	Settings     map[string]interface{} `json:"settings,omitempty"`
	Steps        []WorkflowStep         `json:"steps,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

type UpdateModuleConfigRequest struct {
	Enabled      *bool                  `json:"enabled,omitempty"`
	NeedApproval *bool                  `json:"need_approval,omitempty"`
	AllowEdit    *bool                  `json:"allow_edit,omitempty"`
	Settings     map[string]interface{} `json:"settings,omitempty"`
}

type WorkflowStep struct {
	ID           uuid.UUID `json:"id"`
	ModuleKey    string    `json:"module_key"`
	StepOrder    int       `json:"step_order"`
	ApproverRole string    `json:"approver_role"`
	CanReject    bool      `json:"can_reject"`
	CreatedAt    time.Time `json:"created_at"`
}

type CreateWorkflowStepRequest struct {
	ApproverRole string `json:"approver_role" binding:"required"`
	CanReject    *bool  `json:"can_reject,omitempty"`
}

type UpdateWorkflowStepRequest struct {
	ApproverRole string `json:"approver_role,omitempty"`
	CanReject    *bool  `json:"can_reject,omitempty"`
}

type ReorderStepsRequest struct {
	StepIDs []uuid.UUID `json:"step_ids" binding:"required,min=1"`
}

type WorkflowApproval struct {
	ID         uuid.UUID  `json:"id"`
	ModuleKey  string     `json:"module_key"`
	ItemID     uuid.UUID  `json:"item_id"`
	StepOrder  int        `json:"step_order"`
	Status     string     `json:"status"`
	ApprovedBy *uuid.UUID `json:"approved_by,omitempty"`
	ApprovedAt *time.Time `json:"approved_at,omitempty"`
	Notes      *string    `json:"notes,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

type ApproveRejectRequest struct {
	Notes string `json:"notes,omitempty"`
}

type ApprovalQueueItem struct {
	ApprovalID    uuid.UUID `json:"approval_id"`
	ModuleKey     string    `json:"module_key"`
	ItemID        uuid.UUID `json:"item_id"`
	StepOrder     int       `json:"step_order"`
	Status        string    `json:"status"`
	ItemName      string    `json:"item_name,omitempty"`
	CreatorName   string    `json:"creator_name,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}
