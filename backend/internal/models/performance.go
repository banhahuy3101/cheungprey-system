package models

import (
	"time"

	"github.com/google/uuid"
)

type PerformanceDomain struct {
	ID        uuid.UUID `json:"id"`
	Code      string    `json:"code"`
	NameKh    string    `json:"name_kh"`
	NameEn    string    `json:"name_en"`
	SortOrder int       `json:"sort_order"`
}

type PerformanceSubDomain struct {
	ID        uuid.UUID `json:"id"`
	DomainID  uuid.UUID `json:"domain_id"`
	Code      string    `json:"code"`
	NameKh    string    `json:"name_kh"`
	NameEn    string    `json:"name_en"`
	SortOrder int       `json:"sort_order"`
}

type PerformanceIndicator struct {
	ID          uuid.UUID `json:"id"`
	SubDomainID uuid.UUID `json:"sub_domain_id"`
	Code        string    `json:"code"`
	NameKh      string    `json:"name_kh"`
	NameEn      *string   `json:"name_en,omitempty"`
	DataType    string    `json:"data_type"`
	UnitKh      *string   `json:"unit_kh,omitempty"`
	UnitEn      *string   `json:"unit_en,omitempty"`
	SortOrder   int       `json:"sort_order"`
}

type PerformancePeriod struct {
	ID        uuid.UUID `json:"id"`
	LabelKh   string    `json:"label_kh"`
	LabelEn   string    `json:"label_en"`
	StartDate string    `json:"start_date"`
	EndDate   string    `json:"end_date"`
	SortOrder int       `json:"sort_order"`
}

type PerformanceData struct {
	ID              uuid.UUID  `json:"id"`
	ZoneID          string     `json:"zone_id"`
	IndicatorID     uuid.UUID  `json:"indicator_id"`
	PeriodID        uuid.UUID  `json:"period_id"`
	ValueNumber     *float64   `json:"value_number,omitempty"`
	ValuePercentage *float64   `json:"value_percentage,omitempty"`
	ValueBinary     *bool      `json:"value_binary,omitempty"`
	CreatedBy       *uuid.UUID `json:"created_by,omitempty"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type CreatePerformanceDataRequest struct {
	ZoneID          string   `json:"zone_id" binding:"required"`
	IndicatorID     string   `json:"indicator_id" binding:"required"`
	PeriodID        string   `json:"period_id" binding:"required"`
	ValueNumber     *float64 `json:"value_number,omitempty"`
	ValuePercentage *float64 `json:"value_percentage,omitempty"`
	ValueBinary     *bool    `json:"value_binary,omitempty"`
}

type BulkCreatePerformanceDataRequest struct {
	ZoneID   string                              `json:"zone_id" binding:"required"`
	PeriodID string                              `json:"period_id" binding:"required"`
	Values   []BulkPerformanceDataValue          `json:"values" binding:"required"`
}

type CreateDomainRequest struct {
	Code      string `json:"code" binding:"required"`
	NameKh    string `json:"name_kh" binding:"required"`
	NameEn    string `json:"name_en"`
	SortOrder int    `json:"sort_order"`
}

type UpdateDomainRequest struct {
	Code      string `json:"code"`
	NameKh    string `json:"name_kh"`
	NameEn    string `json:"name_en"`
	SortOrder *int   `json:"sort_order"`
}

type CreateSubDomainRequest struct {
	DomainID  string `json:"domain_id" binding:"required"`
	Code      string `json:"code" binding:"required"`
	NameKh    string `json:"name_kh" binding:"required"`
	NameEn    string `json:"name_en"`
	SortOrder int    `json:"sort_order"`
}

type UpdateSubDomainRequest struct {
	DomainID  string `json:"domain_id"`
	Code      string `json:"code"`
	NameKh    string `json:"name_kh"`
	NameEn    string `json:"name_en"`
	SortOrder *int   `json:"sort_order"`
}

type CreateIndicatorRequest struct {
	SubDomainID string `json:"sub_domain_id" binding:"required"`
	Code        string `json:"code" binding:"required"`
	NameKh      string `json:"name_kh" binding:"required"`
	NameEn      string `json:"name_en"`
	DataType    string `json:"data_type" binding:"required"`
	UnitKh      string `json:"unit_kh"`
	UnitEn      string `json:"unit_en"`
	SortOrder   int    `json:"sort_order"`
}

type UpdateIndicatorRequest struct {
	SubDomainID string `json:"sub_domain_id"`
	Code        string `json:"code"`
	NameKh      string `json:"name_kh"`
	NameEn      string `json:"name_en"`
	DataType    string `json:"data_type"`
	UnitKh      string `json:"unit_kh"`
	UnitEn      string `json:"unit_en"`
	SortOrder   *int   `json:"sort_order"`
}

type CreatePerformancePeriodRequest struct {
	StartDate string `json:"start_date" binding:"required"`
	EndDate   string `json:"end_date" binding:"required"`
}

type BulkPerformanceDataValue struct {
	IndicatorID     string   `json:"indicator_id"`
	IndicatorCode   string   `json:"indicator_code"`
	ValueNumber     *float64 `json:"value_number,omitempty"`
	ValuePercentage *float64 `json:"value_percentage,omitempty"`
	ValueBinary     *bool    `json:"value_binary,omitempty"`
}

type PerformanceDataWithIndicator struct {
	ID                uuid.UUID  `json:"id"`
	ZoneID            string     `json:"zone_id"`
	IndicatorID       uuid.UUID  `json:"indicator_id"`
	PeriodID          uuid.UUID  `json:"period_id"`
	ValueNumber       *float64   `json:"value_number,omitempty"`
	ValuePercentage   *float64   `json:"value_percentage,omitempty"`
	ValueBinary       *bool      `json:"value_binary,omitempty"`
	CreatedBy         *uuid.UUID `json:"created_by,omitempty"`
	UpdatedAt         time.Time  `json:"updated_at"`
	IndicatorNameKh   string     `json:"indicator_name_kh"`
	IndicatorCode     string     `json:"indicator_code"`
	SubDomainCode     string     `json:"sub_domain_code"`
	DomainCode        string     `json:"domain_code"`
	DataType          string     `json:"data_type"`
	UnitKh            *string    `json:"unit_kh,omitempty"`
}

type PerformanceSubmissionSummary struct {
	ZoneID         string    `json:"zone_id"`
	PeriodID       uuid.UUID `json:"period_id"`
	IndicatorCount int       `json:"indicator_count"`
	ZoneName       string    `json:"zone_name,omitempty"`
	PeriodLabel    string    `json:"period_label,omitempty"`
}

type PerformanceReportData struct {
	Zone      GeographicZone
	Period    PerformancePeriod
	Domains   []PerformanceReportDomain
}

type PerformanceReportDomain struct {
	Domain     PerformanceDomain
	SubDomains []PerformanceReportSubDomain
}

type PerformanceReportSubDomain struct {
	SubDomain  PerformanceSubDomain
	Indicators []PerformanceReportIndicator
}

type PerformanceReportIndicator struct {
	Indicator  PerformanceIndicator
	Value      *PerformanceData
}
