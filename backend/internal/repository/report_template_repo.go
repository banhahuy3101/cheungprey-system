package repository

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"mime/multipart"

	storage_go "github.com/supabase-community/storage-go"

	"github.com/google/uuid"
	"github.com/supabase-community/postgrest-go"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

const templateBucket = "report-templates"
const reportBucket = "report-documents"

func (r *Repository) EnsureTemplateBucket() error {
	storageURL := r.cfg.SupabaseURL + "/storage/v1"
	client := storage_go.NewClient(storageURL, r.cfg.SupabaseServiceKey, nil)

	buckets, err := client.ListBuckets()
	if err != nil {
		return fmt.Errorf("list buckets: %w", err)
	}
	for _, b := range buckets {
		if b.Id == templateBucket {
			return nil
		}
	}
	_, err = client.CreateBucket(templateBucket, storage_go.BucketOptions{
		Public: false,
	})
	if err != nil {
		return fmt.Errorf("create bucket: %w", err)
	}
	log.Printf("Created storage bucket %s", templateBucket)
	return nil
}

func (r *Repository) EnsureReportBucket() error {
	storageURL := r.cfg.SupabaseURL + "/storage/v1"
	client := storage_go.NewClient(storageURL, r.cfg.SupabaseServiceKey, nil)

	buckets, err := client.ListBuckets()
	if err != nil {
		return fmt.Errorf("list buckets: %w", err)
	}
	for _, b := range buckets {
		if b.Id == reportBucket {
			return nil
		}
	}
	_, err = client.CreateBucket(reportBucket, storage_go.BucketOptions{
		Public: false,
	})
	if err != nil {
		return fmt.Errorf("create bucket: %w", err)
	}
	log.Printf("Created storage bucket %s", reportBucket)
	return nil
}

func (r *Repository) UploadReportFile(data []byte, storagePath string, contentType string) error {
	storageURL := r.cfg.SupabaseURL + "/storage/v1"
	client := storage_go.NewClient(storageURL, r.cfg.SupabaseServiceKey, nil)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	_, err := client.UploadFile(reportBucket, storagePath, bytes.NewReader(data),
		storage_go.FileOptions{
			ContentType: &contentType,
			Upsert:      boolPtr(true),
		},
	)
	return err
}

func (r *Repository) ListReportTemplates(category string) ([]models.ReportTemplate, error) {
	q := r.AdminClient.From("report_templates").
		Select("*", "exact", false).
		Order("created_at", &postgrest.OrderOpts{Ascending: false})
	if category != "" {
		q = q.Eq("category", category)
	}
	var tmpls []models.ReportTemplate
	_, err := q.ExecuteTo(&tmpls)
	if err != nil {
		return nil, fmt.Errorf("list report templates: %w", err)
	}
	return tmpls, nil
}

func (r *Repository) GetReportTemplateByID(id uuid.UUID) (*models.ReportTemplate, error) {
	var tmpls []models.ReportTemplate
	_, err := r.AdminClient.From("report_templates").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&tmpls)
	if err != nil {
		return nil, fmt.Errorf("get report template: %w", err)
	}
	if len(tmpls) == 0 {
		return nil, nil
	}
	return &tmpls[0], nil
}

func (r *Repository) CreateReportTemplate(tmpl *models.ReportTemplate) error {
	keys := tmpl.Keys
	if keys == nil {
		keys = []string{}
	}
	row := map[string]any{
		"id":           tmpl.ID.String(),
		"name":         tmpl.Name,
		"description":  tmpl.Description,
		"category":     tmpl.Category,
		"format":       tmpl.Format,
		"file_name":    tmpl.FileName,
		"file_size":    tmpl.FileSize,
		"storage_path": tmpl.StoragePath,
		"content":      tmpl.Content,
		"keys":         keys,
		"created_by":   tmpl.CreatedBy.String(),
		"created_at":   tmpl.CreatedAt,
		"updated_at":   tmpl.UpdatedAt,
	}
	_, _, err := r.AdminClient.From("report_templates").
		Insert(row, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpdateReportTemplate(tmpl *models.ReportTemplate) error {
	keys := tmpl.Keys
	if keys == nil {
		keys = []string{}
	}
	row := map[string]any{
		"name":         tmpl.Name,
		"description":  tmpl.Description,
		"category":     tmpl.Category,
		"format":       tmpl.Format,
		"file_name":    tmpl.FileName,
		"file_size":    tmpl.FileSize,
		"storage_path": tmpl.StoragePath,
		"content":      tmpl.Content,
		"keys":         keys,
		"updated_at":   tmpl.UpdatedAt,
	}
	_, _, err := r.AdminClient.From("report_templates").
		Update(row, "", "").
		Eq("id", tmpl.ID.String()).
		Execute()
	return err
}

func (r *Repository) DeleteReportTemplate(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("report_templates").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DuplicateReportTemplate(tmpl *models.ReportTemplate) error {
	keys := tmpl.Keys
	if keys == nil {
		keys = []string{}
	}
	row := map[string]any{
		"id":           tmpl.ID.String(),
		"name":         tmpl.Name,
		"description":  tmpl.Description,
		"category":     tmpl.Category,
		"format":       tmpl.Format,
		"file_name":    tmpl.FileName,
		"file_size":    tmpl.FileSize,
		"storage_path": tmpl.StoragePath,
		"content":      tmpl.Content,
		"keys":         keys,
		"created_by":   tmpl.CreatedBy.String(),
		"created_at":   tmpl.CreatedAt,
		"updated_at":   tmpl.UpdatedAt,
	}
	_, _, err := r.AdminClient.From("report_templates").
		Insert(row, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) CopyTemplateFile(srcPath, dstPath string) error {
	storageURL := r.cfg.SupabaseURL + "/storage/v1"
	client := storage_go.NewClient(storageURL, r.cfg.SupabaseServiceKey, nil)

	data, err := client.DownloadFile(templateBucket, srcPath)
	if err != nil {
		return fmt.Errorf("download source file: %w", err)
	}

	contentType := "application/octet-stream"
	if len(data) > 0 {
		contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	}

	_, err = client.UploadFile(templateBucket, dstPath, bytes.NewReader(data),
		storage_go.FileOptions{
			ContentType: &contentType,
		},
	)
	return err
}

func (r *Repository) UploadTemplateFileData(data []byte, storagePath string, contentType string) error {
	storageURL := r.cfg.SupabaseURL + "/storage/v1"
	client := storage_go.NewClient(storageURL, r.cfg.SupabaseServiceKey, nil)

	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err := client.UploadFile(templateBucket, storagePath, bytes.NewReader(data),
		storage_go.FileOptions{
			ContentType: &contentType,
			Upsert:      boolPtr(true),
		},
	)
	return err
}

func (r *Repository) UploadTemplateFile(file *multipart.FileHeader, storagePath string) error {
	src, err := file.Open()
	if err != nil {
		return fmt.Errorf("open uploaded file: %w", err)
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return fmt.Errorf("read uploaded file: %w", err)
	}

	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	return r.UploadTemplateFileData(data, storagePath, contentType)
}

func (r *Repository) DownloadTemplateFile(storagePath string) ([]byte, error) {
	storageURL := r.cfg.SupabaseURL + "/storage/v1"
	client := storage_go.NewClient(storageURL, r.cfg.SupabaseServiceKey, nil)

	return client.DownloadFile(templateBucket, storagePath)
}

func (r *Repository) DeleteTemplateFile(storagePath string) error {
	storageURL := r.cfg.SupabaseURL + "/storage/v1"
	client := storage_go.NewClient(storageURL, r.cfg.SupabaseServiceKey, nil)

	_, err := client.RemoveFile(templateBucket, []string{storagePath})
	return err
}

func boolPtr(b bool) *bool {
	return &b
}

func (r *Repository) ListReportTemplateKeys(templateID uuid.UUID) ([]models.ReportTemplateKey, error) {
	var keys []models.ReportTemplateKey
	_, err := r.AdminClient.From("report_template_keys").
		Select("*", "exact", false).
		Eq("template_id", templateID.String()).
		Order("created_at", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&keys)
	if err != nil {
		return nil, fmt.Errorf("list template keys: %w", err)
	}
	return keys, nil
}

func (r *Repository) CreateReportTemplateKey(key *models.ReportTemplateKey) error {
	row := map[string]any{
		"id":            key.ID.String(),
		"template_id":   key.TemplateID.String(),
		"key_name":      key.KeyName,
		"display_label": key.DisplayLabel,
		"category":      key.Category,
		"field_type":    key.FieldType,
		"default_value": key.DefaultValue,
		"is_required":   key.IsRequired,
		"created_at":    key.CreatedAt,
		"updated_at":    key.UpdatedAt,
	}
	_, _, err := r.AdminClient.From("report_template_keys").
		Insert(row, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpsertReportTemplateKey(key *models.ReportTemplateKey) error {
	var existing []models.ReportTemplateKey
	_, err := r.AdminClient.From("report_template_keys").
		Select("id", "exact", false).
		Eq("template_id", key.TemplateID.String()).
		Eq("key_name", key.KeyName).
		ExecuteTo(&existing)
	if err == nil && len(existing) > 0 {
		row := map[string]any{
			"display_label": key.DisplayLabel,
			"category":      key.Category,
			"field_type":    key.FieldType,
			"default_value": key.DefaultValue,
			"is_required":   key.IsRequired,
			"updated_at":    key.UpdatedAt,
		}
		_, _, err = r.AdminClient.From("report_template_keys").
			Update(row, "", "").
			Eq("id", existing[0].ID.String()).
			Execute()
		return err
	}
	return r.CreateReportTemplateKey(key)
}
