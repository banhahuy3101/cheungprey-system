package repository

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/supabase-community/postgrest-go"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

// --- Demographics ---

func (r *Repository) GetDemographics(memberID uuid.UUID) (*models.MemberDemographics, error) {
	var demos []models.MemberDemographics
	_, err := r.AdminClient.From("member_demographics").
		Select("*", "exact", false).
		Eq("member_id", memberID.String()).
		ExecuteTo(&demos)
	if err != nil {
		return nil, fmt.Errorf("get demographics: %w", err)
	}
	if len(demos) == 0 {
		return nil, nil
	}
	return &demos[0], nil
}

func (r *Repository) UpsertDemographics(d *models.MemberDemographics) error {
	_, _, err := r.AdminClient.From("member_demographics").
		Upsert(d, "member_id", "", "").
		Execute()
	return err
}

// --- Dues ---

func (r *Repository) ListDues(memberID uuid.UUID) ([]models.MemberDue, error) {
	var dues []models.MemberDue
	_, err := r.AdminClient.From("member_dues").
		Select("*", "exact", false).
		Eq("member_id", memberID.String()).
		Order("payment_date.desc", nil).
		ExecuteTo(&dues)
	if err != nil {
		return nil, fmt.Errorf("list dues: %w", err)
	}
	return dues, nil
}

func (r *Repository) CreateDue(d *models.MemberDue) error {
	_, _, err := r.AdminClient.From("member_dues").
		Insert(d, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) GetDuesSummary(memberID uuid.UUID) (*models.DuesSummary, error) {
	dues, err := r.ListDues(memberID)
	if err != nil {
		return nil, err
	}
	summary := &models.DuesSummary{}
	for _, d := range dues {
		if d.PaymentStatus == "Paid" {
			summary.TotalPaid += d.Amount
		}
		summary.PaymentCount++
		if summary.LastPaymentDate == nil {
			t := d.PaymentDate.Format("2006-01-02")
			summary.LastPaymentDate = &t
			summary.LastPaymentAmount = d.Amount
		}
	}
	return summary, nil
}

// --- Status History ---

func (r *Repository) ListStatusHistory(memberID uuid.UUID) ([]models.MemberStatusHistory, error) {
	var history []models.MemberStatusHistory
	_, err := r.AdminClient.From("member_status_history").
		Select("*", "exact", false).
		Eq("member_id", memberID.String()).
		Order("changed_at.desc", nil).
		ExecuteTo(&history)
	if err != nil {
		return nil, fmt.Errorf("list status history: %w", err)
	}
	return history, nil
}

func (r *Repository) CreateStatusHistory(h *models.MemberStatusHistory) error {
	_, _, err := r.AdminClient.From("member_status_history").
		Insert(h, false, "", "", "").
		Execute()
	return err
}

// --- Activity ---

func (r *Repository) ListActivity(memberID uuid.UUID) ([]models.MemberActivity, error) {
	var activities []models.MemberActivity
	_, err := r.AdminClient.From("member_activity").
		Select("*", "exact", false).
		Eq("member_id", memberID.String()).
		Order("activity_date.desc", nil).
		ExecuteTo(&activities)
	if err != nil {
		return nil, fmt.Errorf("list activity: %w", err)
	}
	return activities, nil
}

func (r *Repository) CreateActivity(a *models.MemberActivity) error {
	_, _, err := r.AdminClient.From("member_activity").
		Insert(a, false, "", "", "").
		Execute()
	return err
}

// --- Positions ---

func (r *Repository) ListPositions(memberID uuid.UUID) ([]models.MemberPosition, error) {
	var positions []models.MemberPosition
	_, err := r.AdminClient.From("member_positions").
		Select("*", "exact", false).
		Eq("member_id", memberID.String()).
		Order("start_date.desc", nil).
		ExecuteTo(&positions)
	if err != nil {
		return nil, fmt.Errorf("list positions: %w", err)
	}
	return positions, nil
}

func (r *Repository) CreatePosition(p *models.MemberPosition) error {
	_, _, err := r.AdminClient.From("member_positions").
		Upsert(p, "", "", "").
		Execute()
	return err
}

func (r *Repository) DeactivateCurrentPositions(memberID uuid.UUID) error {
	_, _, err := r.AdminClient.From("member_positions").
		Update(map[string]any{"is_current": false}, "", "").
		Eq("member_id", memberID.String()).
		Eq("is_current", "true").
		Execute()
	return err
}

// --- Cards ---

func (r *Repository) ListCards(memberID uuid.UUID) ([]models.MemberCard, error) {
	var cards []models.MemberCard
	_, err := r.AdminClient.From("member_cards").
		Select("*", "exact", false).
		Eq("member_id", memberID.String()).
		Order("issued_at.desc", nil).
		ExecuteTo(&cards)
	if err != nil {
		return nil, fmt.Errorf("list cards: %w", err)
	}
	return cards, nil
}

func (r *Repository) IssueCard(c *models.MemberCard) error {
	_, _, err := r.AdminClient.From("member_cards").
		Insert(c, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpdateCard(cardID uuid.UUID, data map[string]any) error {
	_, _, err := r.AdminClient.From("member_cards").
		Update(data, "", "").
		Eq("id", cardID.String()).
		Execute()
	return err
}

// --- Filtered Search ---

func (r *Repository) ListMembersFiltered(f models.MemberFilter) ([]models.Member, error) {
	var members []models.Member
	q := r.AdminClient.From("members").Select("*", "exact", false)

	if f.Status != "" {
		q = q.Eq("status", f.Status)
	}
	if f.Gender != "" {
		q = q.Eq("gender", f.Gender)
	}
	if f.PartyRole != "" {
		q = q.Eq("party_role", f.PartyRole)
	}
	if f.JoinFrom != "" {
		q = q.Gte("join_date", f.JoinFrom)
	}
	if f.JoinTo != "" {
		q = q.Lte("join_date", f.JoinTo)
	}
	if f.AgeFrom > 0 {
		targetYear := fmt.Sprintf("%d-12-31", 2026-f.AgeFrom)
		q = q.Lte("date_of_birth", targetYear)
	}
	if f.AgeTo > 0 {
		targetYear := fmt.Sprintf("%d-01-01", 2026-f.AgeTo)
		q = q.Gte("date_of_birth", targetYear)
	}

	sortBy := "join_date"
	if f.SortBy != "" && f.SortBy != "created_at" {
		sortBy = f.SortBy
	}
	ascending := false
	if f.SortOrder == "asc" {
		ascending = true
	}
	q = q.Order(sortBy, &postgrest.OrderOpts{Ascending: ascending})

	if f.Limit <= 0 {
		f.Limit = 50
	}
	if f.Page < 1 {
		f.Page = 1
	}
	offset := (f.Page - 1) * f.Limit
	q = q.Range(offset, offset+f.Limit-1, "")

	_, err := q.ExecuteTo(&members)
	if err != nil {
		return nil, fmt.Errorf("list members filtered: %w", err)
	}

	if f.ZoneCode != "" {
		var filtered []models.Member
		for _, m := range members {
			if strings.HasPrefix(m.RegisteredVillageCode, f.ZoneCode) {
				filtered = append(filtered, m)
			}
		}
		members = filtered
	}

	if f.Search != "" {
		s := strings.ToLower(f.Search)
		var filtered []models.Member
		for _, m := range members {
			if strings.Contains(strings.ToLower(m.LastNameKh), s) ||
				strings.Contains(strings.ToLower(m.FirstNameKh), s) ||
				strings.Contains(strings.ToLower(m.LastNameEn), s) ||
				strings.Contains(strings.ToLower(m.FirstNameEn), s) ||
				strings.Contains(m.MembershipCardNo, s) ||
				strings.Contains(m.PhoneNumber, s) {
				filtered = append(filtered, m)
			}
		}
		members = filtered
	}

	if members == nil {
		members = []models.Member{}
	}

	return members, nil
}

// --- Stats ---

func (r *Repository) GetMembershipStats() (*models.MembershipStats, error) {
	members, err := r.ListMembers("")
	if err != nil {
		return nil, err
	}

	stats := &models.MembershipStats{
		TotalMembers: len(members),
		ByGender:     map[string]int{},
		ByStatus:     map[string]int{},
		ByZone:       map[string]int{},
		ByType:       map[string]int{},
		ByTier:       map[string]int{},
	}

	for _, m := range members {
		stats.ByGender[m.Gender]++
		stats.ByStatus[m.Status]++
		if m.Status == "Active" {
			stats.ActiveMembers++
		}
		stats.ByZone[m.RegisteredVillageCode]++

		if m.MembershipType != nil {
			stats.ByType[*m.MembershipType]++
		}
		if m.MembershipTier != nil {
			stats.ByTier[*m.MembershipTier]++
		}
	}

	return stats, nil
}

// --- Bulk ---

func (r *Repository) CreateMemberBatch(members []models.Member) ([]models.Member, []error) {
	var created []models.Member
	var errs []error
	for _, m := range members {
		if err := r.CreateMember(&m); err != nil {
			errs = append(errs, fmt.Errorf("member %s: %w", m.MembershipCardNo, err))
		} else {
			created = append(created, m)
		}
	}
	return created, errs
}
