package repository

import (
	"fmt"
	"time"

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
	if doc.Category != "" {
		row["category"] = doc.Category
	}
	if doc.ZoneCode != "" {
		row["zone_code"] = doc.ZoneCode
	}
	if doc.CreatedBy != uuid.Nil {
		row["created_by"] = doc.CreatedBy.String()
	}
	_, _, err := r.AdminClient.From("report_documents").
		Insert(row, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListReportDocuments(category, zoneCode, search string, trash bool) ([]models.ReportDocument, error) {
	q := r.AdminClient.From("report_documents").
		Select("*", "exact", false).
		Order("updated_at", &postgrest.OrderOpts{Ascending: false})

	if trash {
		q = q.Not("deleted_at", "is", "null")
	} else {
		q = q.Is("deleted_at", "null")
	}

	if category != "" {
		q = q.Eq("category", category)
	}
	if zoneCode != "" {
		if len(zoneCode) >= 6 {
			q = q.Like("zone_code", zoneCode[:6]+"%")
		} else {
			q = q.Like("zone_code", zoneCode+"%")
		}
	}
	if search != "" {
		q = q.Or("title.ilike.%"+search+"%,description.ilike.%"+search+"%,content.ilike.%"+search+"%", "")
	}

	var docs []models.ReportDocument
	_, err := q.ExecuteTo(&docs)
	if err != nil {
		return nil, fmt.Errorf("list report documents: %w", err)
	}
	for i := range docs {
		if docs[i].ZoneCode != "" {
			if zone, err := r.GetZoneByCode(docs[i].ZoneCode); err == nil && zone != nil {
				docs[i].ZoneName = zone.NameKh
			}
		}
	}
	return docs, nil
}

func (r *Repository) GetReportDocumentByID(id uuid.UUID) (*models.ReportDocument, error) {
	var docs []models.ReportDocument
	_, err := r.AdminClient.From("report_documents").
		Select("*", "exact", false).
		Eq("id", id.String()).
		Is("deleted_at", "null").
		ExecuteTo(&docs)
	if err != nil {
		return nil, fmt.Errorf("get report document: %w", err)
	}
	if len(docs) == 0 {
		return nil, nil
	}
	doc := &docs[0]
	if doc.ZoneCode != "" {
		if zone, err := r.GetZoneByCode(doc.ZoneCode); err == nil && zone != nil {
			doc.ZoneName = zone.NameKh
		}
	}
	return doc, nil
}

func (r *Repository) UpdateReportDocument(id uuid.UUID, data any) error {
	_, _, err := r.AdminClient.From("report_documents").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) SoftDeleteReportDocument(id uuid.UUID) error {
	now := time.Now()
	_, _, err := r.AdminClient.From("report_documents").
		Update(map[string]any{"deleted_at": now}, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) RestoreReportDocument(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("report_documents").
		Update(map[string]any{"deleted_at": nil}, "", "").
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

func (r *Repository) CreateReportReview(review *models.ReportReview) error {
	_, _, err := r.AdminClient.From("report_reviews").
		Insert(map[string]any{
			"id":          review.ID.String(),
			"report_id":   review.ReportID.String(),
			"action":      review.Action,
			"comment":     review.Comment,
			"reviewer_id": review.ReviewerID.String(),
			"created_at":  review.CreatedAt,
		}, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListReportReviews(reportID uuid.UUID) ([]models.ReportReview, error) {
	var reviews []models.ReportReview
	_, err := r.AdminClient.From("report_reviews").
		Select("*", "exact", false).
		Eq("report_id", reportID.String()).
		Order("created_at", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&reviews)
	if err != nil {
		return nil, fmt.Errorf("list report reviews: %w", err)
	}
	return reviews, nil
}
