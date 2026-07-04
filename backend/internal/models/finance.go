package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	FinanceStatusDraft     = "draft"
	FinanceStatusSubmitted = "submitted"
	FinanceStatusApproved  = "approved"
	FinanceStatusRejected  = "rejected"
)

type FinanceBudget struct {
	ID          uuid.UUID  `json:"id"`
	PeriodType  string     `json:"period_type"`
	PeriodStart string     `json:"period_start"`
	PeriodEnd   string     `json:"period_end"`
	ZoneCode    string     `json:"zone_code"`
	BudgetType  string     `json:"budget_type"`
	AmountUSD   float64    `json:"amount_usd"`
	AmountKHR   float64    `json:"amount_khr"`
	Notes       *string    `json:"notes,omitempty"`
	CreatedBy   *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	ZoneNameKh  string     `json:"zone_name_kh,omitempty"`
	ActualUSD   float64    `json:"actual_usd,omitempty"`
	VarianceUSD float64    `json:"variance_usd,omitempty"`
	UsedPct     float64    `json:"used_pct,omitempty"`
}

type CreateFinanceBudgetRequest struct {
	PeriodType  string  `json:"period_type" binding:"required,oneof=month quarter year"`
	PeriodStart string  `json:"period_start" binding:"required"`
	PeriodEnd   string  `json:"period_end" binding:"required"`
	ZoneCode    string  `json:"zone_code" binding:"required"`
	BudgetType  string  `json:"budget_type" binding:"required,oneof=income expense total"`
	AmountUSD   float64 `json:"amount_usd"`
	AmountKHR   float64 `json:"amount_khr"`
	Notes       string  `json:"notes,omitempty"`
}

type UpdateFinanceBudgetRequest struct {
	PeriodType  string   `json:"period_type,omitempty"`
	PeriodStart string   `json:"period_start,omitempty"`
	PeriodEnd   string   `json:"period_end,omitempty"`
	ZoneCode    string   `json:"zone_code,omitempty"`
	BudgetType  string   `json:"budget_type,omitempty"`
	AmountUSD   *float64 `json:"amount_usd,omitempty"`
	AmountKHR   *float64 `json:"amount_khr,omitempty"`
	Notes       string   `json:"notes,omitempty"`
}

type FinanceMonthlyPoint struct {
	Month   string  `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
	Balance float64 `json:"balance"`
}

type FinanceAnalytics struct {
	Monthly  []FinanceMonthlyPoint  `json:"monthly"`
	ByType   map[string]float64     `json:"by_type"`
	ByZone   []FinanceZoneBreakdown `json:"by_zone"`
	Budgets  []FinanceBudget        `json:"budgets"`
	Summary  *FinanceSummary        `json:"summary"`
}

type FinanceReportData struct {
	ZoneCode     string
	ZoneNameKh   string
	PeriodFrom   string
	PeriodTo     string
	GeneratedAt  string
	Summary      FinanceSummary
	ByZone       []FinanceZoneBreakdown
	Monthly      []FinanceMonthlyPoint
	Budgets      []FinanceBudget
	Transactions []PartyFinance
}

type RejectFinanceRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type AddFinanceAttachmentRequest struct {
	FileName   string `json:"file_name" binding:"required"`
	MimeType   string `json:"mime_type" binding:"required"`
	Base64Data string `json:"base64_data" binding:"required"`
}
