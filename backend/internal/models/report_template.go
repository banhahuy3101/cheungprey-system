package models

import (
	"time"

	"github.com/google/uuid"
)

type ReportTemplate struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	FileName  string    `json:"file_name"`
	Format    string    `json:"format"`
	Content   string    `json:"content,omitempty"`
	FileData  string    `json:"file_data,omitempty"`
	CreatedBy uuid.UUID `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UploadReportTemplateRequest struct {
	Name       string `json:"name"`
	FileName   string `json:"file_name" binding:"required"`
	MimeType   string `json:"mime_type" binding:"required"`
	Base64Data string `json:"base64_data" binding:"required"`
}

type ReportTemplateKey struct {
	Key         string `json:"key"`
	Description string `json:"description"`
}

var ReportTemplateKeys = []ReportTemplateKey{
	{Key: "{{party_name}}", Description: "ឈ្មោះគណបក្ស (HTML: {{...}} · Word: {party_name})"},
	{Key: "{{province_name}}", Description: "ខេត្ត"},
	{Key: "{{district_name}}", Description: "ស្រុក"},
	{Key: "{{document_reference_number}}", Description: "លេខយោងឯកសារ"},
	{Key: "{{generation_date_khmer}}", Description: "កាលបរិច្ឆេទខ្មែរ (ក្បាលឯកសារ)"},
	{Key: "{{report_month}}", Description: "ខែ (លេខ)"},
	{Key: "{{report_month_khmer}}", Description: "ខែ (ឈ្មោះខ្មែរ)"},
	{Key: "{{report_year}}", Description: "ឆ្នាំ (លេខ)"},
	{Key: "{{report_year_khmer}}", Description: "ឆ្នាំ (ខ្មែរអត្ត)"},
	{Key: "{{political_situation_summary}}", Description: "I-ក សភាពនយោបាយ (HTML)"},
	{Key: "{{total_crimes_count}}", Description: "សភាពការណ៍បទល្មើស"},
	{Key: "{{total_crimes_count_khmer}}", Description: "សភាពការណ៍បទល្មើស (ខ្មែរ)"},
	{Key: "{{homicide_cases}}", Description: "ឃាតកម្ម"},
	{Key: "{{homicide_cases_khmer}}", Description: "ឃាតកម្ម (ខ្មែរ)"},
	{Key: "{{suicide_cases}}", Description: "អត្តឃាត"},
	{Key: "{{suicide_cases_khmer}}", Description: "អត្តឃាត (ខ្មែរ)"},
	{Key: "{{misdemeanor_cases}}", Description: "បទមជ្ឈិម"},
	{Key: "{{misdemeanor_cases_khmer}}", Description: "បទមជ្ឈិម (ខ្មែរ)"},
	{Key: "{{human_fatalities}}", Description: "មនុស្សស្លាប់"},
	{Key: "{{human_fatalities_khmer}}", Description: "មនុស្សស្លាប់ (ខ្មែរ)"},
	{Key: "{{property_damage_desc}}", Description: "ផ្នែកសម្ភារៈ"},
}
