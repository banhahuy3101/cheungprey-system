package models

import (
	"mime/multipart"
	"time"

	"github.com/google/uuid"
)

type ReportTemplate struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	Format      string    `json:"format"`
	FileName    string    `json:"file_name"`
	FileSize    int64     `json:"file_size"`
	StoragePath string    `json:"storage_path"`
	Content     string    `json:"content,omitempty"`
	Keys        []string  `json:"keys"`
	CreatedBy   uuid.UUID `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateReportTemplateRequest struct {
	Name        string                `form:"name" binding:"required"`
	Description string                `form:"description"`
	Category    string                `form:"category"`
	Format      string                `form:"format" binding:"required,oneof=docx html"`
	File        *multipart.FileHeader `form:"file"`
	Content     string                `form:"content"`
}

type ReportTemplateKey struct {
	ID           uuid.UUID `json:"id"`
	TemplateID   uuid.UUID `json:"template_id"`
	KeyName      string    `json:"key_name"`
	DisplayLabel string    `json:"display_label"`
	Category     string    `json:"category"`
	FieldType    string    `json:"field_type"`
	DefaultValue string    `json:"default_value"`
	IsRequired   bool      `json:"is_required"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
