package services

import (
	"testing"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/google/uuid"
)

func TestPerformanceReportTemplateExecutes(t *testing.T) {
	svc := NewReportService("../../fonts")
	data := &models.PerformanceReportData{
		Zone: models.GeographicZone{NameKh: "បន្ទាយនាង"},
		Period: models.PerformancePeriod{
			LabelKh:   "test",
			StartDate: "2022-01-01",
			EndDate:   "2026-06-30",
		},
		Domains: []models.PerformanceReportDomain{
			{
				Domain: models.PerformanceDomain{Code: "VII", NameKh: "Domain VII"},
				SubDomains: []models.PerformanceReportSubDomain{
					{
						SubDomain: models.PerformanceSubDomain{Code: "7.2", NameKh: "Sub"},
						Indicators: []models.PerformanceReportIndicator{
							{
								Indicator: models.PerformanceIndicator{
									NameKh:   "Indicator",
									DataType: "binary",
								},
								Value: &models.PerformanceData{
									ID:          uuid.New(),
									ValueBinary: boolPtr(true),
								},
							},
						},
					},
				},
			},
		},
	}

	// Template render only — skip Chrome PDF step.
	fontDir := svc.fontDir
	if _, err := renderPerformanceReportHTML(data, fontDir); err != nil {
		t.Fatalf("template execute: %v", err)
	}
}

func boolPtr(v bool) *bool { return &v }
