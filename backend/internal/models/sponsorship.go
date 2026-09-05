package models

import (
	"time"

	"github.com/google/uuid"
)

type SponsorshipRecord struct {
	ID                  uuid.UUID  `json:"id"`
	EntryNo             int        `json:"entry_no"`
	EntryClassification string     `json:"entry_classification"` // donation, expense, subtotal
	SectionGroup        string     `json:"section_group"`
	ContributorName     string     `json:"contributor_name"`
	RecordPeriod        string     `json:"record_period"`
	TargetLocation      string     `json:"target_location"`
	AmountUSD           float64    `json:"amount_usd"`
	AmountKHR           int64      `json:"amount_khr"`
	UsageDescription    string     `json:"usage_description"`
	Remarks             string     `json:"remarks,omitempty"`
	Status              string     `json:"status"` // draft, submitted, reviewed, approved, returned
	CreatedBy           *uuid.UUID `json:"created_by,omitempty"`
	ReviewerID          *uuid.UUID `json:"reviewer_id,omitempty"`
	ReviewedAt          *time.Time `json:"reviewed_at,omitempty"`
	ReviewerNotes       string     `json:"reviewer_notes,omitempty"`
	ApproverID          *uuid.UUID `json:"approver_id,omitempty"`
	ApprovedAt          *time.Time `json:"approved_at,omitempty"`
	ApproverNotes       string     `json:"approver_notes,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type SponsorshipItem struct {
	ID                uuid.UUID `json:"id"`
	RecordID          uuid.UUID `json:"record_id"`
	ItemName          string    `json:"item_name"`
	ItemQty           float64   `json:"item_qty"`
	ItemUnit          string    `json:"item_unit"`
	CashAllocationUSD float64   `json:"cash_allocation_usd"`
	CashAllocationKHR int64     `json:"cash_allocation_khr"`
	ItemNotes         string    `json:"item_notes,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type SponsorshipItemInput struct {
	ItemName          string  `json:"item_name" binding:"required"`
	ItemQty           float64 `json:"item_qty" binding:"required"`
	ItemUnit          string  `json:"item_unit" binding:"required"`
	CashAllocationUSD float64 `json:"cash_allocation_usd"`
	CashAllocationKHR int64   `json:"cash_allocation_khr"`
	ItemNotes         string  `json:"item_notes"`
}

type SponsorshipWithItems struct {
	SponsorshipRecord
	Items         []SponsorshipItem `json:"items"`
	CreatedByName string            `json:"created_by_name,omitempty"`
	ReviewerName  string            `json:"reviewer_name,omitempty"`
	ApproverName  string            `json:"approver_name,omitempty"`
}

type CreateSponsorshipRequest struct {
	EntryNo             *int                   `json:"entry_no"`
	EntryClassification string                 `json:"entry_classification"`
	SectionGroup        string                 `json:"section_group" binding:"required"`
	ContributorName     string                 `json:"contributor_name" binding:"required"`
	RecordPeriod        string                 `json:"record_period" binding:"required"`
	TargetLocation      string                 `json:"target_location" binding:"required"`
	AmountUSD           float64                `json:"amount_usd"`
	AmountKHR           int64                  `json:"amount_khr"`
	UsageDescription    string                 `json:"usage_description" binding:"required"`
	Remarks             string                 `json:"remarks"`
	Items               []SponsorshipItemInput `json:"items"`
	SubmitImmediately   bool                   `json:"submit_immediately"`
}

type UpdateSponsorshipRequest struct {
	EntryNo             *int                   `json:"entry_no"`
	EntryClassification string                 `json:"entry_classification"`
	SectionGroup        string                 `json:"section_group" binding:"required"`
	ContributorName     string                 `json:"contributor_name" binding:"required"`
	RecordPeriod        string                 `json:"record_period" binding:"required"`
	TargetLocation      string                 `json:"target_location" binding:"required"`
	AmountUSD           float64                `json:"amount_usd"`
	AmountKHR           int64                  `json:"amount_khr"`
	UsageDescription    string                 `json:"usage_description" binding:"required"`
	Remarks             string                 `json:"remarks"`
	Items               []SponsorshipItemInput `json:"items"`
}

type SponsorshipStatusRequest struct {
	Notes string `json:"notes"`
}

type SponsorshipFilterParams struct {
	SectionGroup   string `form:"section_group"`
	RecordPeriod   string `form:"record_period"`
	TargetLocation string `form:"target_location"`
	Status         string `form:"status"`
	Search         string `form:"search"`
	Page           int    `form:"page"`
	Limit          int    `form:"limit"`
}

type InventoryRollupItem struct {
	ItemName string  `json:"item_name"`
	ItemUnit string  `json:"item_unit"`
	TotalQty float64 `json:"total_qty"`
}

type SectionSubtotal struct {
	SectionGroup    string  `json:"section_group"`
	TotalUSD        float64 `json:"total_usd"`
	TotalKHR        int64   `json:"total_khr"`
	RecordCount     int     `json:"record_count"`
	MaterialEntries int     `json:"material_entries"`
}

type SponsorshipSummary struct {
	TotalUSD        float64               `json:"total_usd"`
	TotalKHR        int64                 `json:"total_khr"`
	TotalRecords    int                   `json:"total_records"`
	DraftRecords    int                   `json:"draft_records"`
	PendingReview   int                   `json:"pending_review"`
	ApprovedRecords int                   `json:"approved_records"`
	SectionSubtotals []SectionSubtotal    `json:"section_subtotals"`
	InventoryRollup  []InventoryRollupItem `json:"inventory_rollup"`
}
