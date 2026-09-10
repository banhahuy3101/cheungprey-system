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
	ID           uuid.UUID  `json:"id"`
	ModuleKey    string     `json:"module_key"`
	StepOrder    int        `json:"step_order"`
	StepLabel    string     `json:"step_label"`
	ZoneLevel    string     `json:"zone_level,omitempty"`
	ApproverRole string     `json:"approver_role,omitempty"`
	ApproverID   *uuid.UUID `json:"approver_id,omitempty"`
	CanReject    bool       `json:"can_reject"`
	CanEdit      bool       `json:"can_edit"`
	CreatedAt    time.Time  `json:"created_at"`
}

type CreateWorkflowStepRequest struct {
	StepLabel  string     `json:"step_label,omitempty"`
	AssignType string     `json:"assign_type,omitempty"` // "zone_chief" (by assign) or "custom" (by custom profile)
	ZoneLevel  string     `json:"zone_level,omitempty"`  // "commune_chief", "district_chief", "province_chief", "village_chief"
	ApproverID *uuid.UUID `json:"approver_id,omitempty"` // custom profile user ID
	CanReject  *bool      `json:"can_reject,omitempty"`
	CanEdit    *bool      `json:"can_edit,omitempty"`
}

type UpdateWorkflowStepRequest struct {
	StepOrder  *int       `json:"step_order,omitempty"`
	StepLabel  *string    `json:"step_label,omitempty"`
	AssignType *string    `json:"assign_type,omitempty"`
	ZoneLevel  *string    `json:"zone_level,omitempty"`
	ApproverID *uuid.UUID `json:"approver_id,omitempty"`
	CanReject  *bool      `json:"can_reject,omitempty"`
	CanEdit    *bool      `json:"can_edit,omitempty"`
}

type ReorderStepsRequest struct {
	StepIDs []uuid.UUID `json:"step_ids" binding:"required,min=1"`
}

type WorkflowApproval struct {
	ID           uuid.UUID  `json:"id"`
	ModuleKey    string     `json:"module_key"`
	ItemID       uuid.UUID  `json:"item_id"`
	StepOrder    int        `json:"step_order"`
	StepLabel    string     `json:"step_label"`
	ApproverRole string     `json:"approver_role"`
	CanReject    bool       `json:"can_reject"`
	CanEdit      bool       `json:"can_edit"`
	Status       string     `json:"status"`
	ApproverID   *uuid.UUID `json:"approver_id,omitempty"`
	ApprovedBy   *uuid.UUID `json:"approved_by,omitempty"`
	ApprovedAt   *time.Time `json:"approved_at,omitempty"`
	Notes        *string    `json:"notes,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
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
