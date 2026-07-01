package repository

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/supabase-community/postgrest-go"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) CreateReportDocument(doc *models.ReportDocument) error {
	row := map[string]any{
		"id":                          doc.ID.String(),
		"party_name":                  doc.PartyName,
		"province_name":               doc.ProvinceName,
		"district_name":               doc.DistrictName,
		"document_reference_number":   doc.DocumentReferenceNumber,
		"generation_date_khmer":       doc.GenerationDateKhmer,
		"political_situation_summary": doc.PoliticalSituationSummary,
		"total_crimes_count":          doc.TotalCrimesCount,
		"homicide_cases":              doc.HomicideCases,
		"suicide_cases":               doc.SuicideCases,
		"misdemeanor_cases":           doc.MisdemeanorCases,
		"human_fatalities":            doc.HumanFatalities,
		"property_damage_desc":        doc.PropertyDamageDesc,
		"status":                      doc.Status,
		"created_at":                  doc.CreatedAt,
		"updated_at":                  doc.UpdatedAt,
	}
	if doc.ReportMonth != nil {
		row["report_month"] = *doc.ReportMonth
	}
	if doc.ReportYear != nil {
		row["report_year"] = *doc.ReportYear
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
