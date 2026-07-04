package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
)

type FinanceService struct {
	repo *repository.Repository
}

func NewFinanceService(repo *repository.Repository) *FinanceService {
	return &FinanceService{repo: repo}
}

func (s *FinanceService) AccessContext(userID uuid.UUID, profile *models.Profile) FinanceAccessContext {
	ctx := FinanceAccessFromProfile(userID, profile)
	if ctx.ZoneCode != "" {
		return ctx
	}
	perm := NewPermissionService(s.repo)
	if z := perm.ResolveProfileZoneCode(profile); z != "" {
		ctx.ZoneCode = z
	}
	return ctx
}

func (s *FinanceService) filterAccessible(ctx FinanceAccessContext, finances []models.PartyFinance) []models.PartyFinance {
	if ctx.IsAdmin() {
		return finances
	}
	out := make([]models.PartyFinance, 0, len(finances))
	for _, f := range finances {
		if ctx.CanAccessZone(f.ZoneCode) {
			out = append(out, f)
		}
	}
	return out
}

func (s *FinanceService) enrichZoneNames(finances []models.PartyFinance) {
	cache := map[string]string{}
	for i := range finances {
		code := finances[i].ZoneCode
		if code == "" {
			continue
		}
		name, ok := cache[code]
		if !ok {
			zone, err := s.repo.GetZoneByCode(code)
			if err == nil && zone != nil {
				name = zone.NameKh
			}
			cache[code] = name
		}
		finances[i].ZoneNameKh = name
	}
}

func (s *FinanceService) List(ctx FinanceAccessContext, params models.FinanceListParams) (*models.FinanceListResult, error) {
	result, err := s.repo.ListFinances(params)
	if err != nil {
		return nil, err
	}
	filtered := s.filterAccessible(ctx, result.Finances)

	if params.ZoneCode != "" && ctx.CanAccessZone(params.ZoneCode) {
		scope := params.ZoneCode
		narrowed := filtered[:0]
		for _, f := range filtered {
			if f.ZoneCode == scope || ZoneUnderScope(scope, f.ZoneCode) {
				narrowed = append(narrowed, f)
			}
		}
		filtered = narrowed
	}

	total := len(filtered)
	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit == 0 {
		limit = total
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

	pageItems := filtered[start:end]
	s.enrichZoneNames(pageItems)

	return &models.FinanceListResult{
		Finances: pageItems,
		Total:    total,
		Page:     page,
		Limit:    limit,
	}, nil
}

func (s *FinanceService) Summary(ctx FinanceAccessContext, params models.FinanceListParams) (*models.FinanceSummary, error) {
	params.Page = 1
	params.Limit = 0
	result, err := s.List(ctx, params)
	if err != nil {
		return nil, err
	}

	summary := &models.FinanceSummary{
		ByType: map[string]float64{},
		ByZone: []models.FinanceZoneBreakdown{},
	}
	byZone := map[string]*models.FinanceZoneBreakdown{}

	for _, f := range result.Finances {
		if !isApprovedFinance(f) {
			continue
		}
		if models.IsFinanceExpense(f.TransactionType) {
			summary.TotalExpense += f.AmountUSD
		} else {
			summary.TotalIncome += f.AmountUSD
		}
		summary.TotalKHR += f.AmountKHR
		summary.ByType[f.TransactionType] += f.AmountUSD

		zb, ok := byZone[f.ZoneCode]
		if !ok {
			zb = &models.FinanceZoneBreakdown{ZoneCode: f.ZoneCode}
			byZone[f.ZoneCode] = zb
		}
		if models.IsFinanceExpense(f.TransactionType) {
			zb.TotalExpense += f.AmountUSD
		} else {
			zb.TotalIncome += f.AmountUSD
		}
	}

	for _, zb := range byZone {
		zb.Balance = zb.TotalIncome - zb.TotalExpense
		if zone, err := s.repo.GetZoneByCode(zb.ZoneCode); err == nil && zone != nil {
			zb.ZoneNameKh = zone.NameKh
			zb.ZoneType = zone.ZoneType
		}
		summary.ByZone = append(summary.ByZone, *zb)
	}

	switch params.Direction {
	case "expense":
		summary.TotalUSD = summary.TotalExpense
	case "income":
		summary.TotalUSD = summary.TotalIncome
	default:
		summary.TotalUSD = summary.TotalIncome
	}
	summary.Balance = summary.TotalIncome - summary.TotalExpense

	budgets, _ := s.ListBudgets(ctx, params.ZoneCode, params.From, params.To)
	summary.Budgets = budgets

	return summary, nil
}

func (s *FinanceService) GetByID(ctx FinanceAccessContext, id uuid.UUID) (*models.PartyFinance, error) {
	f, err := s.repo.GetFinanceByID(id)
	if err != nil || f == nil {
		return f, err
	}
	if !ctx.CanAccessZone(f.ZoneCode) {
		return nil, fmt.Errorf("forbidden")
	}
	s.enrichFinance(f)
	return f, nil
}

func (s *FinanceService) Create(ctx FinanceAccessContext, userID uuid.UUID, req *models.CreateFinanceRequest) (*models.PartyFinance, error) {
	if !ctx.CanCreateFinance() {
		return nil, fmt.Errorf("forbidden")
	}

	zoneCode := NormalizeFinanceZoneCode(req.ZoneCode)
	if zoneCode == "" || len(zoneCode) < 6 {
		return nil, fmt.Errorf("invalid zone")
	}
	if !ctx.CanAssignZone(zoneCode) {
		if ctx.ZoneCode == "" {
			return nil, fmt.Errorf("profile zone missing")
		}
		return nil, fmt.Errorf("forbidden zone")
	}

	if !isValidFinanceType(req.TransactionType) {
		return nil, fmt.Errorf("invalid transaction type")
	}

	finance := &models.PartyFinance{
		ID:              uuid.New(),
		ZoneCode:        zoneCode,
		CreatedBy:       &userID,
		Status:          ctx.DefaultCreateStatus(),
		TransactionType: req.TransactionType,
		AmountUSD:       req.AmountUSD,
		AmountKHR:       req.AmountKHR,
		PaymentMethod:   req.PaymentMethod,
		TransactionDate: parseFinanceDate(req.TransactionDate),
	}
	if req.MemberID != "" {
		mid, err := uuid.Parse(req.MemberID)
		if err == nil {
			finance.MemberID = &mid
		}
	}
	if req.ContributorNameKh != "" {
		finance.ContributorNameKh = &req.ContributorNameKh
	}
	if req.ContributorNameEn != "" {
		finance.ContributorNameEn = &req.ContributorNameEn
	}
	if req.ReferenceNumber != "" {
		finance.ReferenceNumber = &req.ReferenceNumber
	}
	if req.Notes != "" {
		finance.Notes = &req.Notes
	}

	if err := s.repo.CreateFinance(finance); err != nil {
		return nil, err
	}
	if len(req.FileIDs) > 0 {
		_ = s.linkFiles(finance.ID, req.FileIDs)
	}
	s.enrichFinance(finance)
	return finance, nil
}

func (s *FinanceService) Update(ctx FinanceAccessContext, id uuid.UUID, req *models.UpdateFinanceRequest) (*models.PartyFinance, error) {
	existing, err := s.repo.GetFinanceByID(id)
	if err != nil || existing == nil {
		return nil, fmt.Errorf("not found")
	}
	if !ctx.CanModifyFinance(existing) {
		return nil, fmt.Errorf("forbidden")
	}

	updates := map[string]any{}
	if req.ZoneCode != "" {
		normalized := NormalizeFinanceZoneCode(req.ZoneCode)
		if !ctx.CanAssignZone(normalized) {
			return nil, fmt.Errorf("forbidden zone")
		}
		updates["zone_code"] = normalized
	}
	if req.TransactionType != "" {
		if !isValidFinanceType(req.TransactionType) {
			return nil, fmt.Errorf("invalid transaction type")
		}
		updates["transaction_type"] = req.TransactionType
	}
	if req.AmountUSD != nil {
		updates["amount_usd"] = *req.AmountUSD
	}
	if req.AmountKHR != nil {
		updates["amount_khr"] = *req.AmountKHR
	}
	if req.PaymentMethod != "" {
		updates["payment_method"] = req.PaymentMethod
	}
	if req.TransactionDate != "" {
		updates["transaction_date"] = parseFinanceDate(req.TransactionDate)
	}
	if req.MemberID != "" {
		mid, err := uuid.Parse(req.MemberID)
		if err == nil {
			updates["member_id"] = mid
		}
	}
	if req.ContributorNameKh != "" {
		updates["contributor_name_kh"] = req.ContributorNameKh
	}
	if req.ContributorNameEn != "" {
		updates["contributor_name_en"] = req.ContributorNameEn
	}
	if req.ReferenceNumber != "" {
		updates["reference_number"] = req.ReferenceNumber
	}
	if req.Notes != "" {
		updates["notes"] = req.Notes
	}

	if len(updates) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	if err := s.repo.UpdateFinance(id, updates); err != nil {
		return nil, err
	}
	return s.GetByID(ctx, id)
}

func (s *FinanceService) Delete(ctx FinanceAccessContext, id uuid.UUID) error {
	existing, err := s.repo.GetFinanceByID(id)
	if err != nil || existing == nil {
		return fmt.Errorf("not found")
	}
	if !ctx.CanModifyFinance(existing) {
		return fmt.Errorf("forbidden")
	}
	return s.repo.DeleteFinance(id)
}

func parseFinanceDate(raw string) time.Time {
	if raw == "" {
		return time.Now()
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02T15:04:05", raw); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02", raw); err == nil {
		return t
	}
	return time.Now()
}

func isValidFinanceType(t string) bool {
	for _, allowed := range models.FinanceTransactionTypes {
		if t == allowed {
			return true
		}
	}
	return false
}
