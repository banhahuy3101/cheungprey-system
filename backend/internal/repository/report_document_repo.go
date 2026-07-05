package repository

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/supabase-community/postgrest-go"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) CreateReportDocument(doc *models.ReportDocument) error {
	row := map[string]any{
		"id":          doc.ID.String(),
		"title":       doc.Title,
		"description": doc.Description,
		"content":     doc.Content,
		"status":      doc.Status,
		"created_at":  doc.CreatedAt,
		"updated_at":  doc.UpdatedAt,
	}
	if doc.CreatedBy != uuid.Nil {
		row["created_by"] = doc.CreatedBy.String()
	}
	_, _, err := r.AdminClient.From("report_documents").
		Insert(row, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListReportDocuments() ([]models.ReportDocument, error) {
	var docs []models.ReportDocument
	_, err := r.AdminClient.From("report_documents").
		Select("*", "exact", false).
		Order("updated_at", &postgrest.OrderOpts{Ascending: false}).
		ExecuteTo(&docs)
	if err != nil {
		return nil, fmt.Errorf("list report documents: %w", err)
	}
	return docs, nil
}

func (r *Repository) GetReportDocumentByID(id uuid.UUID) (*models.ReportDocument, error) {
	var docs []models.ReportDocument
	_, err := r.AdminClient.From("report_documents").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&docs)
	if err != nil {
		return nil, fmt.Errorf("get report document: %w", err)
	}
	if len(docs) == 0 {
		return nil, nil
	}
	return &docs[0], nil
}

func (r *Repository) UpdateReportDocument(id uuid.UUID, data any) error {
	_, _, err := r.AdminClient.From("report_documents").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteReportDocument(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("report_documents").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}
