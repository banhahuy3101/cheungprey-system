package models

import (
	"time"

	"github.com/google/uuid"
)

// --- Chart of Accounts ---

type ChartOfAccount struct {
	AccountCode string  `json:"account_code"`
	NameEn      string  `json:"name_en"`
	NameKh      string  `json:"name_kh"`
	AccountType string  `json:"account_type"`
	ParentCode  *string `json:"parent_code,omitempty"`
	IsActive    bool    `json:"is_active"`
}

type CreateCoARequest struct {
	AccountCode string  `json:"account_code" binding:"required"`
	NameEn      string  `json:"name_en" binding:"required"`
	NameKh      string  `json:"name_kh" binding:"required"`
	AccountType string  `json:"account_type" binding:"required,oneof=asset liability revenue expense"`
	ParentCode  string  `json:"parent_code,omitempty"`
}

type UpdateCoARequest struct {
	NameEn      string `json:"name_en,omitempty"`
	NameKh      string `json:"name_kh,omitempty"`
	AccountType string `json:"account_type,omitempty"`
	IsActive    *bool  `json:"is_active,omitempty"`
}

// --- FMS Budgets ---

type FMSBudget struct {
	ID              uuid.UUID  `json:"id"`
	ZoneCode        string     `json:"zone_code"`
	FiscalYear      int        `json:"fiscal_year"`
	AccountCode     string     `json:"account_code"`
	AllocatedAmount float64    `json:"allocated_amount"`
	SpentAmount     float64    `json:"spent_amount"`
	ReservedAmount  float64    `json:"reserved_amount"`
	Status          string     `json:"status"`
	CreatedBy       *uuid.UUID `json:"created_by,omitempty"`
	ApprovedBy      *uuid.UUID `json:"approved_by,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	// Enriched
	AccountNameKh string `json:"account_name_kh,omitempty"`
	AccountNameEn string `json:"account_name_en,omitempty"`
	ZoneNameKh    string `json:"zone_name_kh,omitempty"`
	Remaining     float64 `json:"remaining,omitempty"`
	UsedPct       float64 `json:"used_pct,omitempty"`
}

type CreateFMSBudgetRequest struct {
	ZoneCode        string  `json:"zone_code" binding:"required"`
	FiscalYear      int     `json:"fiscal_year" binding:"required"`
	AccountCode     string  `json:"account_code" binding:"required"`
	AllocatedAmount float64 `json:"allocated_amount" binding:"required"`
}

type UpdateFMSBudgetRequest struct {
	AllocatedAmount *float64 `json:"allocated_amount,omitempty"`
	Status          string   `json:"status,omitempty"`
}

// --- FMS Transactions (Immutable Ledger) ---

const (
	FMSTransactionStatusDraft          = "draft"
	FMSTransactionStatusPendingApproval = "pending_approval"
	FMSTransactionStatusExecuted       = "executed"
	FMSTransactionStatusRejected       = "rejected"
)

type FMSTransaction struct {
	ID             uuid.UUID  `json:"id"`
	ZoneCode       string     `json:"zone_code"`
	AccountCode    string     `json:"account_code"`
	Type           string     `json:"type"`
	AmountUSD      float64    `json:"amount_usd"`
	AmountKHR      float64    `json:"amount_khr"`
	Description    string     `json:"description,omitempty"`
	DocumentRefs   []string   `json:"document_refs,omitempty"`
	Status         string     `json:"status"`
	CreatedBy      *uuid.UUID `json:"created_by,omitempty"`
	ApprovedBy     *uuid.UUID `json:"approved_by,omitempty"`
	RejectionReason *string   `json:"rejection_reason,omitempty"`
	ReversalOf     *uuid.UUID `json:"reversal_of,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	ExecutedAt     *time.Time `json:"executed_at,omitempty"`
	// Enriched
	AccountNameKh string `json:"account_name_kh,omitempty"`
	AccountNameEn string `json:"account_name_en,omitempty"`
	ZoneNameKh    string `json:"zone_name_kh,omitempty"`
	CreatedByName string `json:"created_by_name,omitempty"`
}

type CreateFMSTransactionRequest struct {
	ZoneCode    string   `json:"zone_code" binding:"required"`
	AccountCode string   `json:"account_code" binding:"required"`
	Type        string   `json:"type" binding:"required,oneof=income expense"`
	AmountUSD   float64  `json:"amount_usd"`
	AmountKHR   float64  `json:"amount_khr"`
	Description string   `json:"description,omitempty"`
	DocumentRefs []string `json:"document_refs,omitempty"`
}

type RejectFMSTransactionRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type FMSTransactionListParams struct {
	ZoneCode    string
	AccountCode string
	Type        string
	Status      string
	From        string
	To          string
	Page        int
	Limit       int
}

type FMSTransactionListResult struct {
	Transactions []FMSTransaction `json:"transactions"`
	Total        int              `json:"total"`
	Page         int              `json:"page"`
	Limit        int              `json:"limit"`
}

// --- FMS Dashboard ---

type FMSDashboard struct {
	Summary     FMSFinanceSummary   `json:"summary"`
	BudgetVsActual []FMSBudgetActual `json:"budget_vs_actual"`
	Monthly     []FMSMonthlyPoint   `json:"monthly"`
	ByAccount   []FMSAccountBreakdown `json:"by_account"`
}

type FMSFinanceSummary struct {
	TotalIncomeUSD  float64 `json:"total_income_usd"`
	TotalExpenseUSD float64 `json:"total_expense_usd"`
	BalanceUSD      float64 `json:"balance_usd"`
	TotalIncomeKHR  float64 `json:"total_income_khr"`
	TotalExpenseKHR float64 `json:"total_expense_khr"`
	BalanceKHR      float64 `json:"balance_khr"`
}

type FMSBudgetActual struct {
	AccountCode     string  `json:"account_code"`
	AccountNameKh   string  `json:"account_name_kh"`
	Allocated       float64 `json:"allocated"`
	Spent           float64 `json:"spent"`
	Remaining       float64 `json:"remaining"`
	UsedPct         float64 `json:"used_pct"`
}

type FMSMonthlyPoint struct {
	Month   string  `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
	Balance float64 `json:"balance"`
}

type FMSAccountBreakdown struct {
	AccountCode   string  `json:"account_code"`
	AccountNameKh string  `json:"account_name_kh"`
	Total         float64 `json:"total"`
}

// --- Audit Log ---

type FMSAuditLogEntry struct {
	ID          int64     `json:"id"`
	TableName   string    `json:"table_name"`
	RecordID    uuid.UUID `json:"record_id"`
	Action      string    `json:"action"`
	UserID      *uuid.UUID `json:"user_id,omitempty"`
	IPAddress   string    `json:"ip_address,omitempty"`
	OldData     any       `json:"old_data,omitempty"`
	NewData     any       `json:"new_data,omitempty"`
	PerformedAt time.Time `json:"performed_at"`
}

type FMSAuditLogParams struct {
	TableName string
	RecordID  string
	Action    string
	From      string
	To        string
	Page      int
	Limit     int
}
