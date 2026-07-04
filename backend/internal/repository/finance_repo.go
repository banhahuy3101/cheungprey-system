package repository

import (
	"fmt"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) ListFinanceAttachments(financeID uuid.UUID) ([]models.PartyFile, error) {
	type row struct {
		FileID uuid.UUID `json:"file_id"`
	}
	var links []row
	_, err := r.AdminClient.From("finance_attachments").
		Select("file_id", "exact", false).
		Eq("finance_id", financeID.String()).
		ExecuteTo(&links)
	if err != nil {
		return nil, fmt.Errorf("list finance attachments: %w", err)
	}
	var files []models.PartyFile
	for _, link := range links {
		f, err := r.GetFileByID(link.FileID)
		if err != nil || f == nil {
			continue
		}
		f.Base64Content = ""
		files = append(files, *f)
	}
	return files, nil
}

func (r *Repository) AddFinanceAttachment(financeID, fileID uuid.UUID) error {
	_, _, err := r.AdminClient.From("finance_attachments").
		Insert(map[string]any{
			"finance_id": financeID.String(),
			"file_id":    fileID.String(),
		}, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) RemoveFinanceAttachment(financeID, fileID uuid.UUID) error {
	_, _, err := r.AdminClient.From("finance_attachments").
		Delete("", "").
		Eq("finance_id", financeID.String()).
		Eq("file_id", fileID.String()).
		Execute()
	return err
}

func (r *Repository) CreateFinanceBudget(b *models.FinanceBudget) error {
	_, _, err := r.AdminClient.From("finance_budgets").
		Insert(b, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListFinanceBudgets(zoneCode, from, to string) ([]models.FinanceBudget, error) {
	var budgets []models.FinanceBudget
	q := r.AdminClient.From("finance_budgets").Select("*", "exact", false)
	if zoneCode != "" {
		q = q.Eq("zone_code", zoneCode)
	}
	if from != "" {
		q = q.Gte("period_end", from)
	}
	if to != "" {
		q = q.Lte("period_start", to)
	}
	_, err := q.ExecuteTo(&budgets)
	if err != nil {
		return nil, fmt.Errorf("list finance budgets: %w", err)
	}
	return budgets, nil
}

func (r *Repository) GetFinanceBudgetByID(id uuid.UUID) (*models.FinanceBudget, error) {
	var rows []models.FinanceBudget
	_, err := r.AdminClient.From("finance_budgets").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&rows)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return &rows[0], nil
}

func (r *Repository) UpdateFinanceBudget(id uuid.UUID, data any) error {
	_, _, err := r.AdminClient.From("finance_budgets").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteFinanceBudget(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("finance_budgets").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}
