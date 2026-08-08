package models

import (
	"time"

	"github.com/google/uuid"
)

type ReportDocument struct {
	ID                        uuid.UUID  `json:"id"`
	Title                     string     `json:"title"`
	Description               string     `json:"description"`
	Content                   string     `json:"content"`
	Category                  string     `json:"category"`
	ZoneCode                  string     `json:"zone_code,omitempty"`
	ZoneName                  string     `json:"zone_name,omitempty"`
	PartyName                 string     `json:"party_name"`
	ProvinceName              string     `json:"province_name"`
	DistrictName              string     `json:"district_name"`
	DocumentReferenceNumber   string     `json:"document_reference_number"`
	GenerationDateKhmer       string     `json:"generation_date_khmer"`
	ReportMonth               *int       `json:"report_month,omitempty"`
	ReportYear                *int       `json:"report_year,omitempty"`
	PoliticalSituationSummary string     `json:"political_situation_summary"`
	TotalCrimesCount          int        `json:"total_crimes_count"`
	HomicideCases             int        `json:"homicide_cases"`
	SuicideCases              int        `json:"suicide_cases"`
	MisdemeanorCases          int        `json:"misdemeanor_cases"`
	HumanFatalities           int        `json:"human_fatalities"`
	PropertyDamageDesc        string     `json:"property_damage_desc"`
	Status                    string     `json:"status"`
	RequireSignature          bool       `json:"require_signature"`
	CreatedBy                 uuid.UUID  `json:"created_by"`
	CreatedAt                 time.Time  `json:"created_at"`
	UpdatedAt                 time.Time  `json:"updated_at"`
	DeletedAt                 *time.Time `json:"deleted_at,omitempty"`
}

type ReportDocumentPayload struct {
	PartyName                 string `json:"party_name"`
	ProvinceName              string `json:"province_name" binding:"required"`
	DistrictName              string `json:"district_name" binding:"required"`
	DocumentReferenceNumber   string `json:"document_reference_number"`
	GenerationDateKhmer       string `json:"generation_date_khmer"`
	ReportMonth               int    `json:"report_month" binding:"required,min=1,max=12"`
	ReportYear                int    `json:"report_year" binding:"required,min=2000,max=2100"`
	PoliticalSituationSummary string `json:"political_situation_summary"`
	TotalCrimesCount          int    `json:"total_crimes_count"`
	HomicideCases             int    `json:"homicide_cases"`
	SuicideCases              int    `json:"suicide_cases"`
	MisdemeanorCases          int    `json:"misdemeanor_cases"`
	HumanFatalities           int    `json:"human_fatalities"`
	PropertyDamageDesc        string `json:"property_damage_desc"`
	Status                    string `json:"status,omitempty"`
	RequireSignature          *bool  `json:"require_signature,omitempty"`
}

type CreateReportDocumentRequest = ReportDocumentPayload

type UpdateReportDocumentRequest = ReportDocumentPayload

type CreateSimpleReportDocumentRequest struct {
	Title            string `json:"title" binding:"required"`
	Description      string `json:"description" binding:"required"`
	Content          string `json:"content" binding:"required"`
	Category         string `json:"category"`
	RequireSignature *bool  `json:"require_signature,omitempty"`
}

type UpdateSimpleReportDocumentRequest struct {
	Title            string `json:"title" binding:"required"`
	Description      string `json:"description" binding:"required"`
	Content          string `json:"content" binding:"required"`
	Category         string `json:"category"`
	RequireSignature *bool  `json:"require_signature,omitempty"`
}

type ReportReview struct {
	ID         uuid.UUID `json:"id"`
	ReportID   uuid.UUID `json:"report_id"`
	Action     string    `json:"action"`
	Comment    string    `json:"comment,omitempty"`
	ReviewerID uuid.UUID `json:"reviewer_id"`
	Signature  *string   `json:"signature,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}
