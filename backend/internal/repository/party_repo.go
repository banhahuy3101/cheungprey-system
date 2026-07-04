package repository

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) ListAllZones() ([]models.GeographicZone, error) {
	var zones []models.GeographicZone
	_, err := r.AdminClient.From("geographic_zones").
		Select("*", "exact", false).
		ExecuteTo(&zones)
	if err != nil {
		return nil, fmt.Errorf("list all zones: %w", err)
	}
	return zones, nil
}

func (r *Repository) ListZones(zoneType string) ([]models.GeographicZone, error) {
	var zones []models.GeographicZone
	q := r.AdminClient.From("geographic_zones").Select("*", "exact", false)
	if zoneType != "" {
		q = q.Eq("zone_type", zoneType)
	}
	_, err := q.ExecuteTo(&zones)
	if err != nil {
		return nil, fmt.Errorf("list zones: %w", err)
	}
	return zones, nil
}

func (r *Repository) GetChildren(parentCode string) ([]models.GeographicZone, error) {
	var zones []models.GeographicZone
	_, err := r.AdminClient.From("geographic_zones").
		Select("*", "exact", false).
		Eq("parent_code", parentCode).
		ExecuteTo(&zones)
	if err != nil {
		return nil, fmt.Errorf("get children: %w", err)
	}
	return zones, nil
}

func (r *Repository) ListPartyStructures() ([]models.PartyStructure, error) {
	var structures []models.PartyStructure
	_, err := r.AdminClient.From("party_structures").
		Select("*", "exact", false).
		ExecuteTo(&structures)
	if err != nil {
		return nil, fmt.Errorf("list structures: %w", err)
	}
	return structures, nil
}

func (r *Repository) CreateMember(m *models.Member) error {
	_, _, err := r.AdminClient.From("members").
		Insert(m, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) GetMemberByID(id uuid.UUID) (*models.Member, error) {
	var members []models.Member
	_, err := r.AdminClient.From("members").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&members)
	if err != nil {
		return nil, fmt.Errorf("get member: %w", err)
	}
	if len(members) == 0 {
		return nil, nil
	}
	return &members[0], nil
}

func (r *Repository) ListMembers(status string) ([]models.Member, error) {
	var members []models.Member
	q := r.AdminClient.From("members").Select("*", "exact", false)
	if status != "" {
		q = q.Eq("status", status)
	}
	_, err := q.ExecuteTo(&members)
	if err != nil {
		return nil, fmt.Errorf("list members: %w", err)
	}
	return members, nil
}

func (r *Repository) UpdateMember(id uuid.UUID, data any) error {
	_, _, err := r.AdminClient.From("members").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteMember(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("members").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) CreateVoter(v *models.VoterInsight) error {
	_, _, err := r.AdminClient.From("voter_insights").
		Insert(v, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListVoters(communeCode string, sentiment string) ([]models.VoterInsight, error) {
	var voters []models.VoterInsight
	q := r.AdminClient.From("voter_insights").Select("*", "exact", false)
	if communeCode != "" {
		q = q.Eq("commune_code", communeCode)
	}
	if sentiment != "" {
		q = q.Eq("voter_sentiment", sentiment)
	}
	_, err := q.ExecuteTo(&voters)
	if err != nil {
		return nil, fmt.Errorf("list voters: %w", err)
	}
	return voters, nil
}

func (r *Repository) CreateFinance(f *models.PartyFinance) error {
	_, _, err := r.AdminClient.From("party_finances").
		Insert(f, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) GetFinanceByID(id uuid.UUID) (*models.PartyFinance, error) {
	var finances []models.PartyFinance
	_, err := r.AdminClient.From("party_finances").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&finances)
	if err != nil {
		return nil, fmt.Errorf("get finance: %w", err)
	}
	if len(finances) == 0 {
		return nil, nil
	}
	return &finances[0], nil
}

func (r *Repository) UpdateFinance(id uuid.UUID, data any) error {
	_, _, err := r.AdminClient.From("party_finances").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteFinance(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("party_finances").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) ListFinances(params models.FinanceListParams) (*models.FinanceListResult, error) {
	var finances []models.PartyFinance
	q := r.AdminClient.From("party_finances").Select("*", "exact", false)
	if params.TransactionType != "" {
		q = q.Eq("transaction_type", params.TransactionType)
	} else if params.Direction == "expense" {
		q = q.Eq("transaction_type", models.FinanceTypeExpense)
	}
	if params.Status != "" {
		q = q.Eq("status", params.Status)
	}
	if params.From != "" {
		if t, err := time.Parse("2006-01-02", params.From); err == nil {
			q = q.Gte("transaction_date", t.Format(time.RFC3339))
		}
	}
	if params.To != "" {
		if t, err := time.Parse("2006-01-02", params.To); err == nil {
			end := t.Add(24*time.Hour - time.Nanosecond)
			q = q.Lte("transaction_date", end.Format(time.RFC3339))
		}
	}
	_, err := q.ExecuteTo(&finances)
	if err != nil {
		return nil, fmt.Errorf("list finances: %w", err)
	}

	if params.Direction == "income" {
		filtered := finances[:0]
		for _, f := range finances {
			if !models.IsFinanceExpense(f.TransactionType) {
				filtered = append(filtered, f)
			}
		}
		finances = filtered
	}

	if params.Search != "" {
		needle := strings.ToLower(params.Search)
		filtered := finances[:0]
		for _, f := range finances {
			if financeMatchesSearch(f, needle) {
				filtered = append(filtered, f)
			}
		}
		finances = filtered
	}

	sort.Slice(finances, func(i, j int) bool {
		return finances[i].TransactionDate.After(finances[j].TransactionDate)
	})

	total := len(finances)
	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit == 0 {
		return &models.FinanceListResult{
			Finances: finances,
			Total:    total,
			Page:     1,
			Limit:    total,
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

	return &models.FinanceListResult{
		Finances: finances[start:end],
		Total:    total,
		Page:     page,
		Limit:    limit,
	}, nil
}

func financeMatchesSearch(f models.PartyFinance, needle string) bool {
	fields := []string{
		f.TransactionType,
		f.PaymentMethod,
	}
	if f.ContributorNameKh != nil {
		fields = append(fields, *f.ContributorNameKh)
	}
	if f.ContributorNameEn != nil {
		fields = append(fields, *f.ContributorNameEn)
	}
	if f.ReferenceNumber != nil {
		fields = append(fields, *f.ReferenceNumber)
	}
	if f.Notes != nil {
		fields = append(fields, *f.Notes)
	}
	for _, s := range fields {
		if strings.Contains(strings.ToLower(s), needle) {
			return true
		}
	}
	return false
}

func (r *Repository) ListFinancesAll(params models.FinanceListParams) ([]models.PartyFinance, error) {
	params.Page = 1
	params.Limit = 0
	result, err := r.ListFinances(params)
	if err != nil {
		return nil, err
	}
	return result.Finances, nil
}

func (r *Repository) CreateFile(f *models.PartyFile) error {
	_, _, err := r.AdminClient.From("party_files").
		Insert(f, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListFiles(memberID string) ([]models.PartyFile, error) {
	var files []models.PartyFile
	q := r.AdminClient.From("party_files").Select("*", "exact", false)
	if memberID != "" {
		q = q.Eq("member_id", memberID)
	}
	_, err := q.ExecuteTo(&files)
	if err != nil {
		return nil, fmt.Errorf("list files: %w", err)
	}
	return files, nil
}

func (r *Repository) GetFileByID(id uuid.UUID) (*models.PartyFile, error) {
	var files []models.PartyFile
	_, err := r.AdminClient.From("party_files").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&files)
	if err != nil {
		return nil, fmt.Errorf("get file: %w", err)
	}
	if len(files) == 0 {
		return nil, nil
	}
	return &files[0], nil
}

func (r *Repository) DeleteFile(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("party_files").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) GetFinanceSummary(params models.FinanceListParams) (*models.FinanceSummary, error) {
	params.Page = 1
	params.Limit = 0
	result, err := r.ListFinances(params)
	if err != nil {
		return nil, err
	}

	summary := &models.FinanceSummary{
		ByType: map[string]float64{},
	}
	for _, f := range result.Finances {
		if models.IsFinanceExpense(f.TransactionType) {
			summary.TotalExpense += f.AmountUSD
		} else {
			summary.TotalIncome += f.AmountUSD
		}
		summary.TotalKHR += f.AmountKHR
		summary.ByType[f.TransactionType] += f.AmountUSD
	}
	summary.TotalUSD = summary.TotalIncome
	summary.Balance = summary.TotalIncome - summary.TotalExpense
	return summary, nil
}
