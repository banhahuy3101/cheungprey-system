package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type SponsorshipRecord struct {
	ID                  uuid.UUID  `json:"id"`
	EntryNo             int        `json:"entry_no"`
	RecordID            int        `json:"record_id"` // BRD alias for entry_no
	FiscalYear          int        `json:"fiscal_year"`
	EntryClassification string     `json:"entry_classification"` // donation, expense, subtotal, grassroots_operations, social_humanitarian, education_support, public_infrastructure
	Category            string     `json:"category"`             // BRD alias for classification / stream
	SectionGroup        string     `json:"section_group"`
	ContributorName     string     `json:"contributor_name"`
	DonorName           string     `json:"donor_name"` // BRD alias for contributor_name
	Representatives     string     `json:"representatives,omitempty"`
	RecordPeriod        string     `json:"record_period"`
	IsExpenseTotal      bool       `json:"is_expense_total"`
	ExpenseLabel        string     `json:"expense_label,omitempty"`
	IsExpenseLabel      string     `json:"is_expense_label,omitempty"`
	ExpenseAmountUSD    float64    `json:"expense_amount_usd"`
	ExpenseAmountKHR    int64      `json:"expense_amount_khr"`
	AmountUSD           float64    `json:"amount_usd"`
	CurrencyUSD         float64    `json:"currency_usd"` // BRD alias for amount_usd
	AmountKHR           int64      `json:"amount_khr"`
	CurrencyKHR         int64      `json:"currency_khr"` // BRD alias for amount_khr
	UsageDescription    string     `json:"usage_description"`
	AllocationPurpose   string     `json:"allocation_purpose"` // BRD alias for usage_description
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

func (r *SponsorshipRecord) SyncAliases() {
	if r.RecordID == 0 && r.EntryNo > 0 {
		r.RecordID = r.EntryNo
	}
	if r.EntryNo == 0 && r.RecordID > 0 {
		r.EntryNo = r.RecordID
	}
	if r.DonorName == "" && r.ContributorName != "" {
		r.DonorName = r.ContributorName
	}
	if r.ContributorName == "" && r.DonorName != "" {
		r.ContributorName = r.DonorName
	}
	if r.Category == "" && r.EntryClassification != "" {
		r.Category = r.EntryClassification
	}
	if r.EntryClassification == "" && r.Category != "" {
		r.EntryClassification = r.Category
	}
	if r.AllocationPurpose == "" && r.UsageDescription != "" {
		r.AllocationPurpose = r.UsageDescription
	}
	if r.UsageDescription == "" && r.AllocationPurpose != "" {
		r.UsageDescription = r.AllocationPurpose
	}
	if r.IsExpenseLabel == "" && r.ExpenseLabel != "" {
		r.IsExpenseLabel = r.ExpenseLabel
	}
	if r.ExpenseLabel == "" && r.IsExpenseLabel != "" {
		r.ExpenseLabel = r.IsExpenseLabel
	}

	usd := r.AmountUSD
	if usd == 0 && r.ExpenseAmountUSD != 0 {
		usd = r.ExpenseAmountUSD
	} else if usd == 0 && r.CurrencyUSD != 0 {
		usd = r.CurrencyUSD
	}
	r.AmountUSD = usd
	r.ExpenseAmountUSD = usd
	r.CurrencyUSD = usd

	khr := r.AmountKHR
	if khr == 0 && r.ExpenseAmountKHR != 0 {
		khr = r.ExpenseAmountKHR
	} else if khr == 0 && r.CurrencyKHR != 0 {
		khr = r.CurrencyKHR
	}
	r.AmountKHR = khr
	r.ExpenseAmountKHR = khr
	r.CurrencyKHR = khr
}

func (r *SponsorshipRecord) UnmarshalJSON(data []byte) error {
	type Alias SponsorshipRecord
	aux := struct {
		*Alias
	}{
		Alias: (*Alias)(r),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	r.SyncAliases()
	return nil
}

func (s *SponsorshipItem) SyncAliases() {
	usd := s.AmountUSD
	if usd == 0 && s.ExpenseAmountUSD != 0 {
		usd = s.ExpenseAmountUSD
	} else if usd == 0 && s.CashAllocationUSD != 0 {
		usd = s.CashAllocationUSD
	}
	s.AmountUSD = usd
	s.ExpenseAmountUSD = usd
	s.CashAllocationUSD = usd

	khr := s.AmountKHR
	if khr == 0 && s.ExpenseAmountKHR != 0 {
		khr = s.ExpenseAmountKHR
	} else if khr == 0 && s.CashAllocationKHR != 0 {
		khr = s.CashAllocationKHR
	}
	s.AmountKHR = khr
	s.ExpenseAmountKHR = khr
	s.CashAllocationKHR = khr
}

type SponsorshipItem struct {
	ID                uuid.UUID `json:"id"`
	RecordID          uuid.UUID `json:"record_id"`
	ItemName          string    `json:"item_name"`
	ItemQty           float64   `json:"item_qty"`
	ItemUnit          string    `json:"item_unit"`
	AmountUSD         float64   `json:"amount_usd"`
	AmountKHR         int64     `json:"amount_khr"`
	ExpenseAmountUSD  float64   `json:"expense_amount_usd"`
	ExpenseAmountKHR  int64     `json:"expense_amount_khr"`
	IsExpenseLabel    string    `json:"is_expense_label,omitempty"`
	CashAllocationUSD float64   `json:"cash_allocation_usd"`
	CashAllocationKHR int64     `json:"cash_allocation_khr"`
	UsageDescription  string    `json:"usage_description,omitempty"`
	Remarks           string    `json:"remarks,omitempty"`
	ItemNotes         string    `json:"item_notes,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

func (s *SponsorshipItem) UnmarshalJSON(data []byte) error {
	type Alias SponsorshipItem
	aux := struct {
		*Alias
	}{
		Alias: (*Alias)(s),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	if s.AmountUSD == 0 {
		if s.ExpenseAmountUSD != 0 {
			s.AmountUSD = s.ExpenseAmountUSD
		} else if s.CashAllocationUSD != 0 {
			s.AmountUSD = s.CashAllocationUSD
		}
	}
	if s.ExpenseAmountUSD == 0 {
		s.ExpenseAmountUSD = s.AmountUSD
	}
	if s.CashAllocationUSD == 0 {
		s.CashAllocationUSD = s.AmountUSD
	}

	if s.AmountKHR == 0 {
		if s.ExpenseAmountKHR != 0 {
			s.AmountKHR = s.ExpenseAmountKHR
		} else if s.CashAllocationKHR != 0 {
			s.AmountKHR = s.CashAllocationKHR
		}
	}
	if s.ExpenseAmountKHR == 0 {
		s.ExpenseAmountKHR = s.AmountKHR
	}
	if s.CashAllocationKHR == 0 {
		s.CashAllocationKHR = s.AmountKHR
	}
	return nil
}

type SponsorshipItemInput struct {
	ItemName          string  `json:"item_name" binding:"required"`
	ItemQty           float64 `json:"item_qty" binding:"required"`
	ItemUnit          string  `json:"item_unit" binding:"required"`
	AmountUSD         float64 `json:"amount_usd"`
	AmountKHR         int64   `json:"amount_khr"`
	ExpenseAmountUSD  float64 `json:"expense_amount_usd"`
	ExpenseAmountKHR  int64   `json:"expense_amount_khr"`
	IsExpenseLabel    string  `json:"is_expense_label"`
	CashAllocationUSD float64 `json:"cash_allocation_usd"`
	CashAllocationKHR int64   `json:"cash_allocation_khr"`
	UsageDescription  string  `json:"usage_description"`
	Remarks           string  `json:"remarks"`
	ItemNotes         string  `json:"item_notes"`
}

func (s *SponsorshipItemInput) UnmarshalJSON(data []byte) error {
	type Alias SponsorshipItemInput
	aux := struct {
		*Alias
	}{
		Alias: (*Alias)(s),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	if s.AmountUSD == 0 {
		if s.ExpenseAmountUSD != 0 {
			s.AmountUSD = s.ExpenseAmountUSD
		} else if s.CashAllocationUSD != 0 {
			s.AmountUSD = s.CashAllocationUSD
		}
	}
	if s.ExpenseAmountUSD == 0 {
		s.ExpenseAmountUSD = s.AmountUSD
	}
	if s.CashAllocationUSD == 0 {
		s.CashAllocationUSD = s.AmountUSD
	}

	if s.AmountKHR == 0 {
		if s.ExpenseAmountKHR != 0 {
			s.AmountKHR = s.ExpenseAmountKHR
		} else if s.CashAllocationKHR != 0 {
			s.AmountKHR = s.CashAllocationKHR
		}
	}
	if s.ExpenseAmountKHR == 0 {
		s.ExpenseAmountKHR = s.AmountKHR
	}
	if s.CashAllocationKHR == 0 {
		s.CashAllocationKHR = s.AmountKHR
	}
	return nil
}

type SponsorshipWithItems struct {
	SponsorshipRecord
	Items         []SponsorshipItem `json:"items"`
	InKindItems   []SponsorshipItem `json:"in_kind_items"` // BRD alias
	CreatedByName string            `json:"created_by_name,omitempty"`
	ReviewerName  string            `json:"reviewer_name,omitempty"`
	ApproverName  string            `json:"approver_name,omitempty"`
}

type CreateSponsorshipRequest struct {
	EntryNo             *int                   `json:"entry_no"`
	RecordID            *int                   `json:"record_id"`
	FiscalYear          int                    `json:"fiscal_year"`
	EntryClassification string                 `json:"entry_classification"`
	Category            string                 `json:"category"`
	SectionGroup        string                 `json:"section_group"`
	ContributorName     string                 `json:"contributor_name"`
	DonorName           string                 `json:"donor_name"`
	Representatives     string                 `json:"representatives"`
	RecordPeriod        string                 `json:"record_period"`
	IsExpenseTotal      bool                   `json:"is_expense_total"`
	ExpenseLabel        string                 `json:"expense_label"`
	IsExpenseLabel      string                 `json:"is_expense_label"`
	ExpenseAmountUSD    float64                `json:"expense_amount_usd"`
	ExpenseAmountKHR    int64                  `json:"expense_amount_khr"`
	AmountUSD           float64                `json:"amount_usd"`
	CurrencyUSD         float64                `json:"currency_usd"`
	AmountKHR           int64                  `json:"amount_khr"`
	CurrencyKHR         int64                  `json:"currency_khr"`
	UsageDescription    string                 `json:"usage_description"`
	AllocationPurpose   string                 `json:"allocation_purpose"`
	Remarks             string                 `json:"remarks"`
	Items               []SponsorshipItemInput `json:"items"`
	InKindItems         []SponsorshipItemInput `json:"in_kind_items"`
	SubmitImmediately   bool                   `json:"submit_immediately"`
}

type UpdateSponsorshipRequest struct {
	EntryNo             *int                   `json:"entry_no"`
	RecordID            *int                   `json:"record_id"`
	FiscalYear          int                    `json:"fiscal_year"`
	EntryClassification string                 `json:"entry_classification"`
	Category            string                 `json:"category"`
	SectionGroup        string                 `json:"section_group"`
	ContributorName     string                 `json:"contributor_name"`
	DonorName           string                 `json:"donor_name"`
	Representatives     string                 `json:"representatives"`
	RecordPeriod        string                 `json:"record_period"`
	IsExpenseTotal      bool                   `json:"is_expense_total"`
	ExpenseLabel        string                 `json:"expense_label"`
	IsExpenseLabel      string                 `json:"is_expense_label"`
	ExpenseAmountUSD    float64                `json:"expense_amount_usd"`
	ExpenseAmountKHR    int64                  `json:"expense_amount_khr"`
	AmountUSD           float64                `json:"amount_usd"`
	CurrencyUSD         float64                `json:"currency_usd"`
	AmountKHR           int64                  `json:"amount_khr"`
	CurrencyKHR         int64                  `json:"currency_khr"`
	UsageDescription    string                 `json:"usage_description"`
	AllocationPurpose   string                 `json:"allocation_purpose"`
	Remarks             string                 `json:"remarks"`
	Items               []SponsorshipItemInput `json:"items"`
	InKindItems         []SponsorshipItemInput `json:"in_kind_items"`
}

type SponsorshipStatusRequest struct {
	Notes string `json:"notes"`
}

type SponsorshipFilterParams struct {
	FiscalYear   int    `form:"fiscal_year"`
	SectionGroup string `form:"section_group"`
	Category     string `form:"category"`
	DonorName    string `form:"donor_name"`
	RecordPeriod string `form:"record_period"`
	Status       string `form:"status"`
	Search       string `form:"search"`
	Page         int    `form:"page"`
	Limit        int    `form:"limit"`
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
	TotalUSD         float64               `json:"total_usd"`
	TotalKHR         int64                 `json:"total_khr"`
	TotalRecords     int                   `json:"total_records"`
	DraftRecords     int                   `json:"draft_records"`
	PendingReview    int                   `json:"pending_review"`
	ApprovedRecords  int                   `json:"approved_records"`
	SectionSubtotals []SectionSubtotal     `json:"section_subtotals"`
	InventoryRollup  []InventoryRollupItem `json:"inventory_rollup"`
}
