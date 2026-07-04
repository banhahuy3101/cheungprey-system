package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
)

type FMSService struct {
	repo *repository.Repository
}

func NewFMSService(repo *repository.Repository) *FMSService {
	return &FMSService{repo: repo}
}

// --- Chart of Accounts ---

func (s *FMSService) ListCoA() ([]models.ChartOfAccount, error) {
	return s.repo.ListCoA()
}

func (s *FMSService) GetCoA(code string) (*models.ChartOfAccount, error) {
	return s.repo.GetCoAByCode(code)
}

func (s *FMSService) CreateCoA(req *models.CreateCoARequest) (*models.ChartOfAccount, error) {
	code := strings.TrimSpace(req.AccountCode)
	existing, _ := s.repo.GetCoAByCode(code)
	if existing != nil {
		return nil, fmt.Errorf("account code already exists")
	}
	account := &models.ChartOfAccount{
		AccountCode: code,
		NameEn:      req.NameEn,
		NameKh:      req.NameKh,
		AccountType: req.AccountType,
		IsActive:    true,
	}
	if req.ParentCode != "" {
		p := req.ParentCode
		account.ParentCode = &p
	}
	if err := s.repo.CreateCoA(account); err != nil {
		return nil, err
	}
	return account, nil
}

func (s *FMSService) UpdateCoA(code string, req *models.UpdateCoARequest) (*models.ChartOfAccount, error) {
	existing, err := s.repo.GetCoAByCode(code)
	if err != nil || existing == nil {
		return nil, fmt.Errorf("not found")
	}
	updates := map[string]any{}
	if req.NameEn != "" {
		updates["name_en"] = req.NameEn
	}
	if req.NameKh != "" {
		updates["name_kh"] = req.NameKh
	}
	if req.AccountType != "" {
		updates["account_type"] = req.AccountType
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if len(updates) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}
	if err := s.repo.UpdateCoA(code, updates); err != nil {
		return nil, err
	}
	return s.repo.GetCoAByCode(code)
}

// --- FMS Budgets ---

func (s *FMSService) CreateBudget(userID uuid.UUID, req *models.CreateFMSBudgetRequest) (*models.FMSBudget, error) {
	coa, _ := s.repo.GetCoAByCode(req.AccountCode)
	if coa == nil {
		return nil, fmt.Errorf("invalid account code")
	}
	budget := &models.FMSBudget{
		ID:              uuid.New(),
		ZoneCode:        req.ZoneCode,
		FiscalYear:      req.FiscalYear,
		AccountCode:     req.AccountCode,
		AllocatedAmount: req.AllocatedAmount,
		SpentAmount:     0,
		ReservedAmount:  0,
		Status:          models.FMSTransactionStatusDraft,
		CreatedBy:       &userID,
	}
	if err := s.repo.CreateFMSBudget(budget); err != nil {
		return nil, err
	}
	return s.enrichBudget(budget)
}

func (s *FMSService) ListBudgets(zoneCode string, fiscalYear int, accountCode string) ([]models.FMSBudget, error) {
	budgets, err := s.repo.ListFMSBudgets(zoneCode, fiscalYear, accountCode)
	if err != nil {
		return nil, err
	}
	for i := range budgets {
		b, _ := s.enrichBudget(&budgets[i])
		budgets[i] = *b
	}
	return budgets, nil
}

func (s *FMSService) GetBudgetByID(id uuid.UUID) (*models.FMSBudget, error) {
	b, err := s.repo.GetFMSBudgetByID(id)
	if err != nil || b == nil {
		return nil, err
	}
	return s.enrichBudget(b)
}

func (s *FMSService) UpdateBudget(id uuid.UUID, req *models.UpdateFMSBudgetRequest) (*models.FMSBudget, error) {
	existing, err := s.repo.GetFMSBudgetByID(id)
	if err != nil || existing == nil {
		return nil, fmt.Errorf("not found")
	}
	updates := map[string]any{}
	if req.AllocatedAmount != nil {
		updates["allocated_amount"] = *req.AllocatedAmount
	}
	if req.Status != "" {
		if !isValidFMSBudgetStatus(req.Status) {
			return nil, fmt.Errorf("invalid status")
		}
		updates["status"] = req.Status
	}
	if len(updates) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}
	if err := s.repo.UpdateFMSBudget(id, updates); err != nil {
		return nil, err
	}
	return s.repo.GetFMSBudgetByID(id)
}

// --- FMS Transactions ---

func (s *FMSService) CreateTransaction(userID uuid.UUID, req *models.CreateFMSTransactionRequest) (*models.FMSTransaction, error) {
	coa, _ := s.repo.GetCoAByCode(req.AccountCode)
	if coa == nil {
		return nil, fmt.Errorf("invalid account code")
	}

	txn := &models.FMSTransaction{
		ID:          uuid.New(),
		ZoneCode:    req.ZoneCode,
		AccountCode: req.AccountCode,
		Type:        req.Type,
		AmountUSD:   req.AmountUSD,
		AmountKHR:   req.AmountKHR,
		Description: req.Description,
		DocumentRefs: req.DocumentRefs,
		Status:      models.FMSTransactionStatusPendingApproval,
		CreatedBy:   &userID,
	}

	if err := s.repo.CreateFMSTransaction(txn); err != nil {
		return nil, err
	}
	return s.enrichTransaction(txn)
}

func (s *FMSService) GetTransaction(id uuid.UUID) (*models.FMSTransaction, error) {
	txn, err := s.repo.GetFMSTransactionByID(id)
	if err != nil || txn == nil {
		return nil, err
	}
	return s.enrichTransaction(txn)
}

func (s *FMSService) ListTransactions(params models.FMSTransactionListParams) (*models.FMSTransactionListResult, error) {
	result, err := s.repo.ListFMSTransactions(params)
	if err != nil {
		return nil, err
	}
	for i := range result.Transactions {
		t, _ := s.enrichTransaction(&result.Transactions[i])
		result.Transactions[i] = *t
	}
	return result, nil
}

func (s *FMSService) ApproveTransaction(userID uuid.UUID, id uuid.UUID) (*models.FMSTransaction, error) {
	txn, err := s.repo.GetFMSTransactionByID(id)
	if err != nil || txn == nil {
		return nil, fmt.Errorf("not found")
	}
	if txn.Status != models.FMSTransactionStatusPendingApproval {
		return nil, fmt.Errorf("transaction is not pending approval")
	}

	if err := s.checkBudgetCeiling(txn); err != nil {
		return nil, err
	}

	now := time.Now()
	updates := map[string]any{
		"status":      models.FMSTransactionStatusExecuted,
		"approved_by": userID.String(),
		"executed_at": now.Format(time.RFC3339),
	}
	if err := s.repo.UpdateFMSTransaction(id, updates); err != nil {
		return nil, err
	}

	s.updateBudgetSpent(txn)

	return s.repo.GetFMSTransactionByID(id)
}

func (s *FMSService) RejectTransaction(userID uuid.UUID, id uuid.UUID, reason string) (*models.FMSTransaction, error) {
	txn, err := s.repo.GetFMSTransactionByID(id)
	if err != nil || txn == nil {
		return nil, fmt.Errorf("not found")
	}
	if txn.Status != models.FMSTransactionStatusPendingApproval {
		return nil, fmt.Errorf("transaction is not pending approval")
	}
	updates := map[string]any{
		"status":           models.FMSTransactionStatusRejected,
		"approved_by":      userID.String(),
		"rejection_reason": reason,
	}
	if err := s.repo.UpdateFMSTransaction(id, updates); err != nil {
		return nil, err
	}
	return s.repo.GetFMSTransactionByID(id)
}

func (s *FMSService) ReverseTransaction(userID uuid.UUID, id uuid.UUID) (*models.FMSTransaction, error) {
	original, err := s.repo.GetFMSTransactionByID(id)
	if err != nil || original == nil {
		return nil, fmt.Errorf("not found")
	}
	if original.Status != models.FMSTransactionStatusExecuted {
		return nil, fmt.Errorf("only executed transactions can be reversed")
	}
	if original.ReversalOf != nil {
		return nil, fmt.Errorf("cannot reverse a reversal entry")
	}

	reversal := &models.FMSTransaction{
		ID:          uuid.New(),
		ZoneCode:    original.ZoneCode,
		AccountCode: original.AccountCode,
		Description: fmt.Sprintf("Reversal of %s", original.ID.String()),
		DocumentRefs: []string{},
		Status:      models.FMSTransactionStatusExecuted,
		CreatedBy:   &userID,
		ApprovedBy:  &userID,
		ReversalOf:  &original.ID,
	}
	now := time.Now()
	reversal.ExecutedAt = &now

	if original.Type == "income" {
		reversal.Type = "expense"
	} else {
		reversal.Type = "income"
	}
	reversal.AmountUSD = original.AmountUSD
	reversal.AmountKHR = original.AmountKHR

	if err := s.repo.CreateFMSTransaction(reversal); err != nil {
		return nil, err
	}

	s.reverseBudgetSpent(original)

	return s.enrichTransaction(reversal)
}

// --- Dashboard ---

func (s *FMSService) GetDashboard(zoneCode string, fiscalYear int) (*models.FMSDashboard, error) {
	dash := &models.FMSDashboard{}

	params := models.FMSTransactionListParams{ZoneCode: zoneCode}
	txns, err := s.repo.GetFMSAllTransactions(params)
	if err != nil {
		return nil, err
	}

	summary := models.FMSFinanceSummary{}
	monthlyMap := map[string]*models.FMSMonthlyPoint{}
	accountMap := map[string]float64{}

	for _, t := range txns {
		if t.Status != models.FMSTransactionStatusExecuted {
			continue
		}
		if t.Type == "income" {
			summary.TotalIncomeUSD += t.AmountUSD
			summary.TotalIncomeKHR += t.AmountKHR
		} else {
			summary.TotalExpenseUSD += t.AmountUSD
			summary.TotalExpenseKHR += t.AmountKHR
		}
		month := t.CreatedAt.Format("2006-01")
		mp, ok := monthlyMap[month]
		if !ok {
			mp = &models.FMSMonthlyPoint{Month: month}
			monthlyMap[month] = mp
		}
		if t.Type == "income" {
			mp.Income += t.AmountUSD
		} else {
			mp.Expense += t.AmountUSD
		}
		mp.Balance = mp.Income - mp.Expense

		accountMap[t.AccountCode] += t.AmountUSD
	}

	summary.BalanceUSD = summary.TotalIncomeUSD - summary.TotalExpenseUSD
	summary.BalanceKHR = summary.TotalIncomeKHR - summary.TotalExpenseKHR
	dash.Summary = summary

	for _, mp := range monthlyMap {
		dash.Monthly = append(dash.Monthly, *mp)
	}
	sortMonthly(dash.Monthly)

	for code, total := range accountMap {
		coa, _ := s.repo.GetCoAByCode(code)
		name := code
		if coa != nil {
			name = coa.NameKh
		}
		dash.ByAccount = append(dash.ByAccount, models.FMSAccountBreakdown{
			AccountCode:   code,
			AccountNameKh: name,
			Total:         total,
		})
	}

	budgets, _ := s.repo.ListFMSBudgets(zoneCode, fiscalYear, "")
	for _, b := range budgets {
		remaining := b.AllocatedAmount - b.SpentAmount
		usedPct := 0.0
		if b.AllocatedAmount > 0 {
			usedPct = (b.SpentAmount / b.AllocatedAmount) * 100
		}
		coa, _ := s.repo.GetCoAByCode(b.AccountCode)
		name := b.AccountCode
		if coa != nil {
			name = coa.NameKh
		}
		dash.BudgetVsActual = append(dash.BudgetVsActual, models.FMSBudgetActual{
			AccountCode:   b.AccountCode,
			AccountNameKh: name,
			Allocated:     b.AllocatedAmount,
			Spent:         b.SpentAmount,
			Remaining:     remaining,
			UsedPct:       usedPct,
		})
	}

	return dash, nil
}

// --- Audit Log ---

func (s *FMSService) ListAuditLog(params models.FMSAuditLogParams) ([]models.FMSAuditLogEntry, error) {
	return s.repo.ListFMSAuditLog(params)
}

// --- Internal helpers ---

func (s *FMSService) checkBudgetCeiling(txn *models.FMSTransaction) error {
	if txn.Type != "expense" {
		return nil
	}
	budgets, err := s.repo.ListFMSBudgets(
		txn.ZoneCode,
		time.Now().Year(),
		txn.AccountCode,
	)
	if err != nil || len(budgets) == 0 {
		return fmt.Errorf("no budget found for account %s in zone %s", txn.AccountCode, txn.ZoneCode)
	}
	budget := budgets[0]
	if budget.Status != "approved" && budget.Status != "active" {
		return fmt.Errorf("budget is not approved for this account")
	}
	spent := budget.SpentAmount + budget.ReservedAmount
	remaining := budget.AllocatedAmount - spent
	if txn.AmountUSD > 0 && txn.AmountUSD > remaining {
		return fmt.Errorf("insufficient budget allocation: allocated %.2f, remaining %.2f, requested %.2f",
			budget.AllocatedAmount, remaining, txn.AmountUSD)
	}
	if txn.AmountKHR > 0 {
		remainingKHR := budget.AllocatedAmount - spent
		if txn.AmountKHR > remainingKHR {
			return fmt.Errorf("insufficient budget allocation (KHR)")
		}
	}
	return nil
}

func (s *FMSService) updateBudgetSpent(txn *models.FMSTransaction) {
	if txn.Type != "expense" {
		return
	}
	budgets, err := s.repo.ListFMSBudgets(txn.ZoneCode, time.Now().Year(), txn.AccountCode)
	if err != nil || len(budgets) == 0 {
		return
	}
	budget := budgets[0]
	amount := txn.AmountUSD
	if amount == 0 {
		amount = txn.AmountKHR
	}
	_ = s.repo.UpdateFMSBudget(budget.ID, map[string]any{
		"spent_amount": budget.SpentAmount + amount,
	})
}

func (s *FMSService) reverseBudgetSpent(txn *models.FMSTransaction) {
	if txn.Type != "expense" {
		return
	}
	budgets, err := s.repo.ListFMSBudgets(txn.ZoneCode, time.Now().Year(), txn.AccountCode)
	if err != nil || len(budgets) == 0 {
		return
	}
	budget := budgets[0]
	newSpent := budget.SpentAmount - txn.AmountUSD
	if newSpent < 0 {
		newSpent = 0
	}
	_ = s.repo.UpdateFMSBudget(budget.ID, map[string]any{
		"spent_amount": newSpent,
	})
}

func (s *FMSService) enrichBudget(b *models.FMSBudget) (*models.FMSBudget, error) {
	b.Remaining = b.AllocatedAmount - b.SpentAmount
	if b.AllocatedAmount > 0 {
		b.UsedPct = (b.SpentAmount / b.AllocatedAmount) * 100
	}
	if coa, err := s.repo.GetCoAByCode(b.AccountCode); err == nil && coa != nil {
		b.AccountNameKh = coa.NameKh
		b.AccountNameEn = coa.NameEn
	}
	if zone, err := s.repo.GetZoneByCode(b.ZoneCode); err == nil && zone != nil {
		b.ZoneNameKh = zone.NameKh
	}
	return b, nil
}

func (s *FMSService) enrichTransaction(t *models.FMSTransaction) (*models.FMSTransaction, error) {
	if coa, err := s.repo.GetCoAByCode(t.AccountCode); err == nil && coa != nil {
		t.AccountNameKh = coa.NameKh
		t.AccountNameEn = coa.NameEn
	}
	if zone, err := s.repo.GetZoneByCode(t.ZoneCode); err == nil && zone != nil {
		t.ZoneNameKh = zone.NameKh
	}
	return t, nil
}

func isValidFMSBudgetStatus(s string) bool {
	return s == "draft" || s == "pending_review" || s == "approved" || s == "active"
}

func sortMonthly(points []models.FMSMonthlyPoint) {
	for i := 0; i < len(points); i++ {
		for j := i + 1; j < len(points); j++ {
			if points[i].Month > points[j].Month {
				points[i], points[j] = points[j], points[i]
			}
		}
	}
}
