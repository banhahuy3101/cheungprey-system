package services

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/pkg/periodlabel"
)

func ReportDocumentReplacements(doc *models.ReportDocument) map[string]string {
	month := 0
	year := 0
	if doc.ReportMonth != nil {
		month = *doc.ReportMonth
	}
	if doc.ReportYear != nil {
		year = *doc.ReportYear
	}

	khInt := func(n int) string { return periodlabel.ToKhmerDigits(n) }

	return map[string]string{
		"{{party_name}}":                doc.PartyName,
		"{{province_name}}":             doc.ProvinceName,
		"{{district_name}}":             doc.DistrictName,
		"{{document_reference_number}}": doc.DocumentReferenceNumber,
		"{{generation_date_khmer}}":     doc.GenerationDateKhmer,
		"{{report_month}}":              strconv.Itoa(month),
		"{{report_month_khmer}}":        periodlabel.KhmerMonthName(month),
		"{{report_year}}":               strconv.Itoa(year),
		"{{report_year_khmer}}":         khInt(year),
		"{{political_situation_summary}}": doc.PoliticalSituationSummary,
		"{{total_crimes_count}}":        strconv.Itoa(doc.TotalCrimesCount),
		"{{total_crimes_count_khmer}}":  khInt(doc.TotalCrimesCount),
		"{{homicide_cases}}":            strconv.Itoa(doc.HomicideCases),
		"{{homicide_cases_khmer}}":      khInt(doc.HomicideCases),
		"{{suicide_cases}}":             strconv.Itoa(doc.SuicideCases),
		"{{suicide_cases_khmer}}":       khInt(doc.SuicideCases),
		"{{misdemeanor_cases}}":         strconv.Itoa(doc.MisdemeanorCases),
		"{{misdemeanor_cases_khmer}}":   khInt(doc.MisdemeanorCases),
		"{{human_fatalities}}":          strconv.Itoa(doc.HumanFatalities),
		"{{human_fatalities_khmer}}":    khInt(doc.HumanFatalities),
		"{{property_damage_desc}}":      doc.PropertyDamageDesc,
	}
}

func ApplyReportTemplate(html string, doc *models.ReportDocument) string {
	out := html
	for key, value := range ReportDocumentReplacements(doc) {
		out = strings.ReplaceAll(out, key, value)
	}
	return out
}

func (s *ReportService) GeneratePartyReportFromTemplate(doc *models.ReportDocument, templateHTML string) ([]byte, error) {
	merged := ApplyReportTemplate(templateHTML, doc)
	merged = injectKhmerFonts(merged, s.fontDir)
	return s.htmlToPDF([]byte(merged), portraitA4PDFOptions())
}

func injectKhmerFonts(html, fontDir string) string {
	if strings.Contains(html, "@font-face") {
		return html
	}
	fontCSS := fmt.Sprintf(`<style>
@font-face {
  font-family: 'Battambang';
  src: url('file://%s/Battambang-Regular.ttf') format('truetype');
  font-weight: normal;
}
@font-face {
  font-family: 'Battambang';
  src: url('file://%s/Battambang-Bold.ttf') format('truetype');
  font-weight: bold;
}
body { font-family: 'Battambang', sans-serif; }
</style>`, fontDir, fontDir)

	if strings.Contains(strings.ToLower(html), "<head>") {
		return strings.Replace(html, "<head>", "<head>"+fontCSS, 1)
	}
	return fontCSS + html
}

type pdfOptions struct {
	landscape                      bool
	paperWidth, paperHeight        float64
	marginTop, marginBottom        float64
	marginLeft, marginRight        float64
}

func portraitA4PDFOptions() pdfOptions {
	return pdfOptions{
		paperWidth: 8.27, paperHeight: 11.69,
		marginTop: 0.55, marginBottom: 0.55,
		marginLeft: 0.65, marginRight: 0.55,
	}
}

func landscapeA4PDFOptions() pdfOptions {
	return pdfOptions{
		landscape: true,
		paperWidth: 16.5, paperHeight: 11.7,
		marginTop: 0.3, marginBottom: 0.3,
		marginLeft: 0.3, marginRight: 0.3,
	}
}
