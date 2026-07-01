package repository

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/supabase-community/postgrest-go"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) CreateReportTemplate(t *models.ReportTemplate) error {
	row := map[string]any{
		"id":         t.ID.String(),
		"name":       t.Name,
		"file_name":  t.FileName,
		"format":     t.Format,
		"content":    t.Content,
		"created_by": t.CreatedBy.String(),
		"created_at": t.CreatedAt,
		"updated_at": t.UpdatedAt,
	}
	if t.FileData != "" {
		row["file_data"] = t.FileData
	}
	_, _, err := r.AdminClient.From("report_templates").
		Insert(row, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListReportTemplates() ([]models.ReportTemplate, error) {
	var rows []models.ReportTemplate
	_, err := r.AdminClient.From("report_templates").
		Select("*", "exact", false).
		Order("updated_at", &postgrest.OrderOpts{Ascending: false}).
		ExecuteTo(&rows)
	if err != nil {
		return nil, fmt.Errorf("list report templates: %w", err)
	}
	return rows, nil
}

func (r *Repository) GetReportTemplateByID(id uuid.UUID) (*models.ReportTemplate, error) {
	var rows []models.ReportTemplate
	_, err := r.AdminClient.From("report_templates").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&rows)
	if err != nil {
		return nil, fmt.Errorf("get report template: %w", err)
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return &rows[0], nil
}

func (r *Repository) DeleteReportTemplate(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("report_templates").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}
