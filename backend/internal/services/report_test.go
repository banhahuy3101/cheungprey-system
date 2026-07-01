package services

import (
	"bytes"
	"strings"
	"testing"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/pkg/pdf"
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

func TestPerformanceReportHTMLKhmerFonts(t *testing.T) {
	svc := NewReportService("../../fonts")
	data := &models.PerformanceReportData{
		Zone: models.GeographicZone{NameKh: "ស្រុកជើងព្រៃ"},
		Period: models.PerformancePeriod{
			LabelKh:   "ឆ្នាំ ២០២៦",
			StartDate: "2022-01-01",
			EndDate:   "2026-06-30",
		},
		Domains: []models.PerformanceReportDomain{
			{
				Domain: models.PerformanceDomain{Code: "VII", NameKh: "វិស័យសេដ្ឋកិច្ច"},
				SubDomains: []models.PerformanceReportSubDomain{
					{
						SubDomain: models.PerformanceSubDomain{Code: "7.2", NameKh: "កសិកម្ម"},
						Indicators: []models.PerformanceReportIndicator{
							{
								Indicator: models.PerformanceIndicator{
									NameKh:   "ចំនួនកសិករប្រើប្រាស់បច្ចេកវិទ្យាថ្មី",
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

	html, err := renderPerformanceReportHTML(data, svc.fontDir)
	if err != nil {
		t.Fatalf("render html: %v", err)
	}
	if !bytes.Contains(html, []byte("data:font/ttf;base64,")) {
		t.Fatal("expected embedded khmer font data URI in html")
	}
	if !bytes.Contains(html, []byte("ស្រុកជើងព្រៃ")) {
		t.Fatal("expected khmer text in html")
	}
}

func TestPerformanceReportPDFKhmer(t *testing.T) {
	if _, err := pdf.ResolveChromePath(); err != nil {
		t.Skip("chrome not available:", err)
	}

	svc := NewReportService("../../fonts")
	data := &models.PerformanceReportData{
		Zone: models.GeographicZone{NameKh: "ស្រុកជើងព្រៃ"},
		Period: models.PerformancePeriod{
			LabelKh:   "ឆ្នាំ ២០២៦",
			StartDate: "2022-01-01",
			EndDate:   "2026-06-30",
		},
		Domains: []models.PerformanceReportDomain{
			{
				Domain: models.PerformanceDomain{Code: "VII", NameKh: "វិស័យសេដ្ឋកិច្ច"},
				SubDomains: []models.PerformanceReportSubDomain{
					{
						SubDomain: models.PerformanceSubDomain{Code: "7.2", NameKh: "កសិកម្ម"},
						Indicators: []models.PerformanceReportIndicator{
							{
								Indicator: models.PerformanceIndicator{
									NameKh:   "ចំនួនកសិករប្រើប្រាស់បច្ចេកវិទ្យាថ្មី",
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

	pdfBytes, err := svc.GeneratePerformanceReport(data)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "chrome") {
			t.Skip("chrome unavailable:", err)
		}
		t.Fatalf("generate pdf: %v", err)
	}
	if len(pdfBytes) < 100 || pdfBytes[0] != '%' || pdfBytes[1] != 'P' || pdfBytes[2] != 'D' || pdfBytes[3] != 'F' {
		t.Fatalf("expected PDF header, got %d bytes", len(pdfBytes))
	}
}

func boolPtr(v bool) *bool { return &v }
