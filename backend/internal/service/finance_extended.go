package service

import (
	"encoding/base64"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func isApprovedFinance(f models.PartyFinance) bool {
	return f.Status == "" || f.Status == models.FinanceStatusApproved
}

func (s *FinanceService) enrichFinance(f *models.PartyFinance) {
	if f == nil {
		return
	}
	s.enrichZoneNames([]models.PartyFinance{*f})
	files, _ := s.repo.ListFinanceAttachments(f.ID)
	f.Attachments = files
}

func (s *FinanceService) linkFiles(financeID uuid.UUID, fileIDs []string) error {
	for _, fid := range fileIDs {
		id, err := uuid.Parse(fid)
		if err != nil {
			continue
		}
		if err := s.repo.AddFinanceAttachment(financeID, id); err != nil {
			return err
		}
	}
	return nil
}

func (s *FinanceService) Analytics(ctx FinanceAccessContext, params models.FinanceListParams) (*models.FinanceAnalytics, error) {
	params.Page = 1
	params.Limit = 0
	result, err := s.List(ctx, params)
	if err != nil {
		return nil, err
	}

	summary, err := s.Summary(ctx, params)
	if err != nil {
		return nil, err
	}

	monthly := map[string]*models.FinanceMonthlyPoint{}
	for _, f := range result.Finances {
		if !isApprovedFinance(f) {
			continue
		}
		month := f.TransactionDate.Format("2006-01")
		pt, ok := monthly[month]
		if !ok {
			pt = &models.FinanceMonthlyPoint{Month: month}
			monthly[month] = pt
		}
		if models.IsFinanceExpense(f.TransactionType) {
			pt.Expense += f.AmountUSD
		} else {
			pt.Income += f.AmountUSD
		}
	}

	monthlyList := make([]models.FinanceMonthlyPoint, 0, len(monthly))
	for _, pt := range monthly {
		pt.Balance = pt.Income - pt.Expense
		monthlyList = append(monthlyList, *pt)
	}
	sort.Slice(monthlyList, func(i, j int) bool {
		return monthlyList[i].Month < monthlyList[j].Month
	})

	budgets, _ := s.ListBudgets(ctx, params.ZoneCode, params.From, params.To)

	return &models.FinanceAnalytics{
		Monthly: monthlyList,
		ByType:  summary.ByType,
		ByZone:  summary.ByZone,
		Budgets: budgets,
		Summary: summary,
	}, nil
}

func (s *FinanceService) ListBudgets(ctx FinanceAccessContext, zoneCode, from, to string) ([]models.FinanceBudget, error) {
	budgets, err := s.repo.ListFinanceBudgets(zoneCode, from, to)
	if err != nil {
		return nil, err
	}
	out := make([]models.FinanceBudget, 0, len(budgets))
	for _, b := range budgets {
		if !ctx.CanAccessZone(b.ZoneCode) {
			continue
		}
		if zone, err := s.repo.GetZoneByCode(b.ZoneCode); err == nil && zone != nil {
			b.ZoneNameKh = zone.NameKh
		}
		actual := s.budgetActual(ctx, b)
		b.ActualUSD = actual
		b.VarianceUSD = b.AmountUSD - actual
		if b.AmountUSD > 0 {
			b.UsedPct = (actual / b.AmountUSD) * 100
		}
		out = append(out, b)
	}
	return out, nil
}

func (s *FinanceService) budgetActual(ctx FinanceAccessContext, b models.FinanceBudget) float64 {
	params := models.FinanceListParams{
		ZoneCode: b.ZoneCode,
		From:     b.PeriodStart,
		To:       b.PeriodEnd,
		Limit:    0,
	}
	result, err := s.List(ctx, params)
	if err != nil {
		return 0
	}
	var total float64
	for _, f := range result.Finances {
		if !isApprovedFinance(f) {
			continue
		}
		switch b.BudgetType {
		case "income":
			if !models.IsFinanceExpense(f.TransactionType) {
				total += f.AmountUSD
			}
		case "expense":
			if models.IsFinanceExpense(f.TransactionType) {
				total += f.AmountUSD
			}
		case "total":
			if models.IsFinanceExpense(f.TransactionType) {
				total += f.AmountUSD
			} else {
				total += f.AmountUSD
			}
		}
	}
	if b.BudgetType == "expense" {
		return total
	}
	return total
}

func (s *FinanceService) CreateBudget(ctx FinanceAccessContext, userID uuid.UUID, req *models.CreateFinanceBudgetRequest) (*models.FinanceBudget, error) {
	if !ctx.CanApprove() {
		return nil, fmt.Errorf("forbidden")
	}
	zoneCode := NormalizeFinanceZoneCode(req.ZoneCode)
	if zoneCode == "" || len(zoneCode) < 6 {
		return nil, fmt.Errorf("invalid zone")
	}
	if !ctx.CanAssignZone(zoneCode) && !ctx.IsAdmin() {
		return nil, fmt.Errorf("forbidden zone")
	}
	b := &models.FinanceBudget{
		ID:          uuid.New(),
		PeriodType:  req.PeriodType,
		PeriodStart: req.PeriodStart,
		PeriodEnd:   req.PeriodEnd,
		ZoneCode:    zoneCode,
		BudgetType:  req.BudgetType,
		AmountUSD:   req.AmountUSD,
		AmountKHR:   req.AmountKHR,
		CreatedBy:   &userID,
	}
	if req.Notes != "" {
		b.Notes = &req.Notes
	}
	if err := s.repo.CreateFinanceBudget(b); err != nil {
		return nil, err
	}
	list, _ := s.ListBudgets(ctx, req.ZoneCode, req.PeriodStart, req.PeriodEnd)
	for _, item := range list {
		if item.ID == b.ID {
			return &item, nil
		}
	}
	return b, nil
}

func (s *FinanceService) UpdateBudget(ctx FinanceAccessContext, id uuid.UUID, req *models.UpdateFinanceBudgetRequest) (*models.FinanceBudget, error) {
	if !ctx.CanApprove() {
		return nil, fmt.Errorf("forbidden")
	}
	existing, err := s.repo.GetFinanceBudgetByID(id)
	if err != nil || existing == nil {
		return nil, fmt.Errorf("not found")
	}
	if !ctx.CanAccessZone(existing.ZoneCode) {
		return nil, fmt.Errorf("forbidden")
	}
	updates := map[string]any{}
	if req.PeriodType != "" {
		updates["period_type"] = req.PeriodType
	}
	if req.PeriodStart != "" {
		updates["period_start"] = req.PeriodStart
	}
	if req.PeriodEnd != "" {
		updates["period_end"] = req.PeriodEnd
	}
	if req.ZoneCode != "" {
		normalized := NormalizeFinanceZoneCode(req.ZoneCode)
		if len(normalized) < 6 {
			return nil, fmt.Errorf("invalid zone")
		}
		if !ctx.CanAssignZone(normalized) && !ctx.IsAdmin() {
			return nil, fmt.Errorf("forbidden zone")
		}
		updates["zone_code"] = normalized
	}
	if req.BudgetType != "" {
		updates["budget_type"] = req.BudgetType
	}
	if req.AmountUSD != nil {
		updates["amount_usd"] = *req.AmountUSD
	}
	if req.AmountKHR != nil {
		updates["amount_khr"] = *req.AmountKHR
	}
	if req.Notes != "" {
		updates["notes"] = req.Notes
	}
	if len(updates) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}
	if err := s.repo.UpdateFinanceBudget(id, updates); err != nil {
		return nil, err
	}
	updated, _ := s.repo.GetFinanceBudgetByID(id)
	if updated == nil {
		return nil, fmt.Errorf("not found")
	}
	list, _ := s.ListBudgets(ctx, updated.ZoneCode, updated.PeriodStart, updated.PeriodEnd)
	for _, item := range list {
		if item.ID == id {
			return &item, nil
		}
	}
	return updated, nil
}

func (s *FinanceService) DeleteBudget(ctx FinanceAccessContext, id uuid.UUID) error {
	if !ctx.CanApprove() {
		return fmt.Errorf("forbidden")
	}
	b, err := s.repo.GetFinanceBudgetByID(id)
	if err != nil || b == nil {
		return fmt.Errorf("not found")
	}
	if !ctx.CanAccessZone(b.ZoneCode) {
		return fmt.Errorf("forbidden")
	}
	return s.repo.DeleteFinanceBudget(id)
}

func (s *FinanceService) Submit(ctx FinanceAccessContext, id uuid.UUID) (*models.PartyFinance, error) {
	f, err := s.repo.GetFinanceByID(id)
	if err != nil || f == nil {
		return nil, fmt.Errorf("not found")
	}
	if !ctx.CanSubmit(f) {
		return nil, fmt.Errorf("forbidden")
	}
	now := time.Now()
	if err := s.repo.UpdateFinance(id, map[string]any{
		"status":       models.FinanceStatusSubmitted,
		"submitted_at": now,
	}); err != nil {
		return nil, err
	}
	return s.GetByID(ctx, id)
}

func (s *FinanceService) Approve(ctx FinanceAccessContext, userID, id uuid.UUID) (*models.PartyFinance, error) {
	f, err := s.repo.GetFinanceByID(id)
	if err != nil || f == nil {
		return nil, fmt.Errorf("not found")
	}
	if !ctx.CanApproveFinance(f) {
		return nil, fmt.Errorf("forbidden")
	}
	if err := s.repo.UpdateFinance(id, map[string]any{
		"status":            models.FinanceStatusApproved,
		"approved_by":       userID,
		"rejection_reason":  nil,
	}); err != nil {
		return nil, err
	}
	return s.GetByID(ctx, id)
}

func (s *FinanceService) Reject(ctx FinanceAccessContext, id uuid.UUID, reason string) (*models.PartyFinance, error) {
	f, err := s.repo.GetFinanceByID(id)
	if err != nil || f == nil {
		return nil, fmt.Errorf("not found")
	}
	if !ctx.CanApproveFinance(f) {
		return nil, fmt.Errorf("forbidden")
	}
	if err := s.repo.UpdateFinance(id, map[string]any{
		"status":            models.FinanceStatusRejected,
		"rejection_reason":  reason,
	}); err != nil {
		return nil, err
	}
	return s.GetByID(ctx, id)
}

func (s *FinanceService) AddAttachment(ctx FinanceAccessContext, userID, financeID uuid.UUID, req *models.AddFinanceAttachmentRequest) (*models.PartyFile, error) {
	f, err := s.repo.GetFinanceByID(financeID)
	if err != nil || f == nil {
		return nil, fmt.Errorf("not found")
	}
	if !ctx.CanAccessZone(f.ZoneCode) {
		return nil, fmt.Errorf("forbidden")
	}
	if f.Status == models.FinanceStatusApproved && !ctx.CanApprove() {
		return nil, fmt.Errorf("forbidden")
	}

	raw, err := base64.StdEncoding.DecodeString(req.Base64Data)
	if err != nil {
		return nil, fmt.Errorf("invalid base64")
	}

	file := &models.PartyFile{
		ID:            uuid.New(),
		FileName:      req.FileName,
		MimeType:      req.MimeType,
		Base64Content: req.Base64Data,
		FileSize:      len(raw),
		UploadedBy:    &userID,
	}
	if err := s.repo.CreateFile(file); err != nil {
		return nil, err
	}
	if err := s.repo.AddFinanceAttachment(financeID, file.ID); err != nil {
		return nil, err
	}
	file.Base64Content = ""
	return file, nil
}

func (s *FinanceService) BuildReportData(ctx FinanceAccessContext, params models.FinanceListParams) (*models.FinanceReportData, error) {
	params.Limit = 0
	params.Page = 1
	summary, err := s.Summary(ctx, params)
	if err != nil {
		return nil, err
	}
	analytics, err := s.Analytics(ctx, params)
	if err != nil {
		return nil, err
	}
	list, err := s.List(ctx, params)
	if err != nil {
		return nil, err
	}

	zoneName := params.ZoneCode
	if params.ZoneCode != "" {
		if z, err := s.repo.GetZoneByCode(params.ZoneCode); err == nil && z != nil {
			zoneName = z.NameKh
		}
	} else if ctx.ZoneCode != "" {
		params.ZoneCode = ctx.ZoneCode
		if z, err := s.repo.GetZoneByCode(ctx.ZoneCode); err == nil && z != nil {
			zoneName = z.NameKh
		}
	} else {
		zoneName = "ទូទាំងស្រុក"
	}

	fromLabel := params.From
	toLabel := params.To
	if fromLabel == "" {
		fromLabel = "—"
	}
	if toLabel == "" {
		toLabel = "—"
	}

	txs := make([]models.PartyFinance, 0)
	for _, f := range list.Finances {
		if isApprovedFinance(f) {
			txs = append(txs, f)
		}
	}

	return &models.FinanceReportData{
		ZoneCode:     params.ZoneCode,
		ZoneNameKh:   zoneName,
		PeriodFrom:   fromLabel,
		PeriodTo:     toLabel,
		GeneratedAt:  time.Now().Format("02/01/2006 15:04"),
		Summary:      *summary,
		ByZone:       summary.ByZone,
		Monthly:      analytics.Monthly,
		Budgets:      analytics.Budgets,
		Transactions: txs,
	}, nil
}

func financeStatusLabel(status string) string {
	switch status {
	case models.FinanceStatusDraft:
		return "ព្រាង"
	case models.FinanceStatusSubmitted:
		return "បានដាក់ស្នើ"
	case models.FinanceStatusApproved:
		return "បានអនុម័ត"
	case models.FinanceStatusRejected:
		return "បានបដិសេធ"
	default:
		return status
	}
}

func formatMoneyUSD(v float64) string {
	return fmt.Sprintf("$%.2f", v)
}

func truncateNotes(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
