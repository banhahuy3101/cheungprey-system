package services

import (
	"archive/zip"
	"bytes"
	"strings"
	"testing"

	docx "github.com/lukasjarosch/go-docx"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func minimalDocxXML(text string) []byte {
	xml := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>` + text + `</w:t></w:r></w:p>
  </w:body>
</w:document>`
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, _ := zw.Create("word/document.xml")
	_, _ = w.Write([]byte(xml))
	_ = zw.Close()
	return buf.Bytes()
}

func sampleReportDoc() *models.ReportDocument {
	m, y := 6, 2026
	return &models.ReportDocument{
		PartyName:                 "គណបក្សប្រជាជនកម្ពុជា",
		ProvinceName:              "កំពង់ចាម",
		DistrictName:              "ជើងព្រៃ",
		ReportMonth:               &m,
		ReportYear:                &y,
		PoliticalSituationSummary: "<p>សភាពស្ងប់ស្ងាត់</p>",
		TotalCrimesCount:          5,
		HomicideCases:             2,
	}
}

func TestReplaceDocxPlaceholdersUserTemplate(t *testing.T) {
	text := strings.Join([]string{
		"{party_name}",
		"ខេត្ត{province_name} · ស្រុក{district_name}",
		"ខែ{report_month_khmer} ឆ្នាំ{report_year_khmer}",
		"{political_situation_summary}",
		"សភាពការណ៍បទល្មើស: {total_crimes_count_khmer}",
		"ឃាតកម្ម: {homicide_cases_khmer}",
	}, "\n")

	raw := minimalDocxXML(text)
	dx, err := docx.OpenBytes(raw)
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	if err := replaceDocxPlaceholders(dx, reportDocxPlaceholderMap(sampleReportDoc())); err != nil {
		t.Fatalf("replace: %v", err)
	}

	var out bytes.Buffer
	if err := dx.Write(&out); err != nil {
		t.Fatalf("write: %v", err)
	}
	if strings.Contains(out.String(), "{party_name}") {
		t.Fatal("party_name placeholder was not replaced")
	}
}
