package repository

import (
	"fmt"
	"sort"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

// --- Chart of Accounts ---

func (r *Repository) ListCoA() ([]models.ChartOfAccount, error) {
	var accounts []models.ChartOfAccount
	_, err := r.AdminClient.From("chart_of_accounts").
		Select("*", "exact", false).
		ExecuteTo(&accounts)
	if err != nil {
		return nil, fmt.Errorf("list chart_of_accounts: %w", err)
	}
	return accounts, nil
}

func (r *Repository) GetCoAByCode(code string) (*models.ChartOfAccount, error) {
	var accounts []models.ChartOfAccount
	_, err := r.AdminClient.From("chart_of_accounts").
		Select("*", "exact", false).
		Eq("account_code", code).
		ExecuteTo(&accounts)
	if err != nil {
		return nil, fmt.Errorf("get chart_of_accounts: %w", err)
	}
	if len(accounts) == 0 {
		return nil, nil
	}
	return &accounts[0], nil
}

func (r *Repository) CreateCoA(a *models.ChartOfAccount) error {
	_, _, err := r.AdminClient.From("chart_of_accounts").
		Insert(a, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpdateCoA(code string, data any) error {
	_, _, err := r.AdminClient.From("chart_of_accounts").
		Update(data, "", "").
		Eq("account_code", code).
		Execute()
	return err
}

// --- FMS Budgets ---

func (r *Repository) CreateFMSBudget(b *models.FMSBudget) error {
	_, _, err := r.AdminClient.From("fms_budgets").
		Insert(b, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) GetFMSBudgetByID(id uuid.UUID) (*models.FMSBudget, error) {
	var budgets []models.FMSBudget
	_, err := r.AdminClient.From("fms_budgets").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&budgets)
	if err != nil {
		return nil, fmt.Errorf("get fms_budget: %w", err)
	}
	if len(budgets) == 0 {
		return nil, nil
	}
	return &budgets[0], nil
}

func (r *Repository) ListFMSBudgets(zoneCode string, fiscalYear int, accountCode string) ([]models.FMSBudget, error) {
	var budgets []models.FMSBudget
	q := r.AdminClient.From("fms_budgets").Select("*", "exact", false)
	if zoneCode != "" {
		q = q.Eq("zone_code", zoneCode)
	}
	if fiscalYear > 0 {
		q = q.Eq("fiscal_year", strconv.Itoa(fiscalYear))
	}
	if accountCode != "" {
		q = q.Eq("account_code", accountCode)
	}
	_, err := q.ExecuteTo(&budgets)
	if err != nil {
		return nil, fmt.Errorf("list fms_budgets: %w", err)
	}
	return budgets, nil
}

func (r *Repository) UpdateFMSBudget(id uuid.UUID, data any) error {
	_, _, err := r.AdminClient.From("fms_budgets").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

// --- FMS Transactions ---

func (r *Repository) CreateFMSTransaction(t *models.FMSTransaction) error {
	_, _, err := r.AdminClient.From("fms_transactions").
		Insert(t, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) GetFMSTransactionByID(id uuid.UUID) (*models.FMSTransaction, error) {
	var txns []models.FMSTransaction
	_, err := r.AdminClient.From("fms_transactions").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&txns)
	if err != nil {
		return nil, fmt.Errorf("get fms_transaction: %w", err)
	}
	if len(txns) == 0 {
		return nil, nil
	}
	return &txns[0], nil
}

func (r *Repository) ListFMSTransactions(params models.FMSTransactionListParams) (*models.FMSTransactionListResult, error) {
	var txns []models.FMSTransaction
	q := r.AdminClient.From("fms_transactions").Select("*", "exact", false)
	if params.ZoneCode != "" {
		q = q.Eq("zone_code", params.ZoneCode)
	}
	if params.AccountCode != "" {
		q = q.Eq("account_code", params.AccountCode)
	}
	if params.Type != "" {
		q = q.Eq("type", params.Type)
	}
	if params.Status != "" {
		q = q.Eq("status", params.Status)
	}
	if params.From != "" {
		if t, err := time.Parse("2006-01-02", params.From); err == nil {
			q = q.Gte("created_at", t.Format(time.RFC3339))
		}
	}
	if params.To != "" {
		if t, err := time.Parse("2006-01-02", params.To); err == nil {
			end := t.Add(24*time.Hour - time.Nanosecond)
			q = q.Lte("created_at", end.Format(time.RFC3339))
		}
	}
	_, err := q.ExecuteTo(&txns)
	if err != nil {
		return nil, fmt.Errorf("list fms_transactions: %w", err)
	}

	sort.Slice(txns, func(i, j int) bool {
		return txns[i].CreatedAt.After(txns[j].CreatedAt)
	})

	total := len(txns)
	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit == 0 {
		return &models.FMSTransactionListResult{
			Transactions: txns,
			Total:        total,
			Page:         1,
			Limit:        total,
		}, nil
	}
	if limit < 1 {
		limit = 20
	}
	start := (page - 1) * limit
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}

	return &models.FMSTransactionListResult{
		Transactions: txns[start:end],
		Total:        total,
		Page:         page,
		Limit:        limit,
	}, nil
}

func (r *Repository) UpdateFMSTransaction(id uuid.UUID, data any) error {
	_, _, err := r.AdminClient.From("fms_transactions").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) GetFMSAllTransactions(params models.FMSTransactionListParams) ([]models.FMSTransaction, error) {
	params.Page = 1
	params.Limit = 0
	result, err := r.ListFMSTransactions(params)
	if err != nil {
		return nil, err
	}
	return result.Transactions, nil
}

// --- Audit Log ---

func (r *Repository) InsertFMSAuditLog(tableName string, recordID uuid.UUID, action string, userID *uuid.UUID, ipAddress string, oldData, newData any) error {
	entry := map[string]any{
		"table_name": tableName,
		"record_id":  recordID.String(),
		"action":     action,
		"ip_address": ipAddress,
	}
	if userID != nil {
		entry["user_id"] = userID.String()
	}
	if oldData != nil {
		entry["old_data"] = oldData
	}
	if newData != nil {
		entry["new_data"] = newData
	}
	_, _, err := r.AdminClient.From("fms_audit_log").
		Insert(entry, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListFMSAuditLog(params models.FMSAuditLogParams) ([]models.FMSAuditLogEntry, error) {
	var entries []models.FMSAuditLogEntry
	q := r.AdminClient.From("fms_audit_log").Select("*", "exact", false)
	if params.TableName != "" {
		q = q.Eq("table_name", params.TableName)
	}
	if params.RecordID != "" {
		q = q.Eq("record_id", params.RecordID)
	}
	if params.Action != "" {
		q = q.Eq("action", params.Action)
	}
	if params.From != "" {
		q = q.Gte("performed_at", params.From)
	}
	if params.To != "" {
		q = q.Lte("performed_at", params.To)
	}
	_, err := q.ExecuteTo(&entries)
	if err != nil {
		return nil, fmt.Errorf("list fms_audit_log: %w", err)
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].PerformedAt.After(entries[j].PerformedAt)
	})

	max := len(entries)
	if params.Limit > 0 && params.Limit < max {
		max = params.Limit
	}
	return entries[:max], nil
}
