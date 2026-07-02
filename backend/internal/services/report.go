package services

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"regexp"
	"time"

	"github.com/signintech/gopdf"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/pkg/periodlabel"
)

type ReportService struct {
	fontDir string
}

func NewReportService(fontDir string) *ReportService {
	absDir, err := filepath.Abs(fontDir)
	if err != nil {
		absDir = fontDir
	}
	return &ReportService{fontDir: absDir}
}

func (s *ReportService) GenerateMemberReport(members []models.Member) ([]byte, error) {
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4Landscape})
	pdf.AddTTFFont("Battambang", filepath.Join(s.fontDir, "Battambang-Regular.ttf"))
	pdf.SetFont("Battambang", "", 10)
	pdf.AddPage()
	pdf.Cell(&gopdf.Rect{W: 277, H: 10}, "Member Report")
	pdf.Br(10)
	for _, m := range members {
		name := fmt.Sprintf("%s %s - %s %s", m.LastNameKh, m.FirstNameKh, m.LastNameEn, m.FirstNameEn)
		pdf.Cell(&gopdf.Rect{W: 277, H: 7}, name)
		pdf.Br(7)
	}
	var buf bytes.Buffer
	if err := pdf.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func formatPerformanceValue(dataType string, val *models.PerformanceData) string {
	if val == nil {
		return "—"
	}
	switch dataType {
	case "number", "text":
		if val.ValueNumber != nil {
			return fmt.Sprintf("%g", *val.ValueNumber)
		}
	case "percentage":
		if val.ValuePercentage != nil {
			return fmt.Sprintf("%g%%", *val.ValuePercentage)
		}
	case "binary":
		if val.ValueBinary != nil {
			if *val.ValueBinary {
				return "បាន/មាន"
			}
			return "មិនបាន/គ្មាន"
		}
	}
	return "—"
}

func fontDataURI(fontDir, filename string) (string, error) {
	data, err := os.ReadFile(filepath.Join(fontDir, filename))
	if err != nil {
		return "", err
	}
	return "data:font/ttf;base64," + base64.StdEncoding.EncodeToString(data), nil
}

func renderPerformanceReportHTML(data *models.PerformanceReportData, fontDir string) ([]byte, error) {
	battambangURI, err := fontDataURI(fontDir, "Battambang-Regular.ttf")
	if err != nil {
		return nil, fmt.Errorf("load khmer font: %w", err)
	}
	battambangBoldURI, err := fontDataURI(fontDir, "Battambang-Bold.ttf")
	if err != nil {
		return nil, fmt.Errorf("load khmer bold font: %w", err)
	}

	funcMap := template.FuncMap{
		"add": func(a, b int) int { return a + b },
		"formatValue": formatPerformanceValue,
	}

	tmpl := template.Must(template.New("report").Funcs(funcMap).Parse(performanceReportHTML))
	periodRangeLabel := periodlabel.FormatKhFromDates(data.Period.StartDate, data.Period.EndDate)
	if periodRangeLabel == "" {
		periodRangeLabel = data.Period.LabelKh
	}
	var htmlBuf bytes.Buffer
	err = tmpl.Execute(&htmlBuf, map[string]any{
		"BattambangFontPath":     template.URL(battambangURI),
		"BattambangBoldFontPath": template.URL(battambangBoldURI),
		"Data":                   data,
		"PeriodRangeLabel":       periodRangeLabel,
		"GeneratedAt":            time.Now().Format("02/01/2006 15:04"),
	})
	if err != nil {
		return nil, fmt.Errorf("render template: %w", err)
	}
	return htmlBuf.Bytes(), nil
}

func (s *ReportService) htmlToPDF(htmlBytes []byte, opts pdfOptions) ([]byte, error) {
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})
	pdf.AddTTFFont("Battambang", filepath.Join(s.fontDir, "Battambang-Regular.ttf"))
	pdf.SetFont("Battambang", "", 11)
	pdf.AddPage()

	// Strip HTML tags crudely for now (real fix = proper text extraction)
	text := string(htmlBytes)
	text = regexp.MustCompile("<[^>]*>").ReplaceAllString(text, " ")
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")

	pdf.MultiCell(&gopdf.Rect{W: 190, H: 277}, text)
	var buf bytes.Buffer
	if err := pdf.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func (s *ReportService) GeneratePerformanceReport(data *models.PerformanceReportData) ([]byte, error) {
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})
	pdf.AddTTFFont("Battambang", filepath.Join(s.fontDir, "Battambang-Regular.ttf"))
	pdf.SetFont("Battambang", "", 12)
	pdf.AddPage()

	pdf.Cell(&gopdf.Rect{W: 190, H: 8}, "Performance Report")
	pdf.Br(8)
	pdf.Cell(&gopdf.Rect{W: 190, H: 8}, data.Zone.NameKh+" / "+data.Period.LabelKh)
	pdf.Br(10)

	for _, d := range data.Domains {
		pdf.Cell(&gopdf.Rect{W: 190, H: 8}, d.Domain.NameKh)
		pdf.Br(6)
		for _, sd := range d.SubDomains {
			pdf.Cell(&gopdf.Rect{W: 190, H: 8}, "  - "+sd.SubDomain.NameKh)
			pdf.Br(5)
			for _, ind := range sd.Indicators {
				val := ""
				if ind.Value != nil && ind.Value.ValueNumber != nil {
					val = fmt.Sprintf(" = %.2f", *ind.Value.ValueNumber)
				}
				pdf.Cell(&gopdf.Rect{W: 190, H: 8}, "    "+ind.Indicator.NameKh+val)
				pdf.Br(5)
			}
		}
		pdf.Br(4)
	}

	var buf bytes.Buffer
	if err := pdf.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func base64Std(data []byte) string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
	var buf bytes.Buffer
	buf.Grow((len(data) + 2) / 3 * 4)
	for i := 0; i < len(data); i += 3 {
		var b [3]byte
		var n int
		for j := 0; j < 3 && i+j < len(data); j++ {
			b[j] = data[i+j]
			n++
		}
		buf.WriteByte(charset[b[0]>>2])
		buf.WriteByte(charset[((b[0]&0x03)<<4)|(b[1]>>4)])
		if n < 2 {
			buf.WriteString("==")
		} else {
			buf.WriteByte(charset[((b[1]&0x0f)<<2)|(b[2]>>6)])
			if n < 3 {
				buf.WriteByte('=')
			} else {
				buf.WriteByte(charset[b[2]&0x3f])
			}
		}
	}
	return buf.String()
}

const performanceReportHTML = `<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'Battambang';
  src: url({{.BattambangFontPath}}) format('truetype');
  font-weight: normal;
}
@font-face {
  font-family: 'Battambang';
  src: url({{.BattambangBoldFontPath}}) format('truetype');
  font-weight: bold;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Battambang', sans-serif;
  padding: 10px 15px;
  color: #000;
  font-size: 8pt;
}
.report-title {
  font-weight: bold;
  font-size: 14pt;
  text-align: center;
  margin-bottom: 4px;
}
.report-meta {
  text-align: center;
  font-size: 9pt;
  margin-bottom: 10px;
  line-height: 1.5;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
  table-layout: fixed;
}
td, th {
  padding: 2px 4px;
  border: 1px solid #000;
  vertical-align: middle;
  font-size: 8pt;
}
th {
  font-weight: bold;
  background: #e8eef5;
  text-align: center;
}
.domain-row {
  font-weight: bold;
  font-size: 10pt;
  text-align: left;
}
.subdomain-row {
  font-weight: bold;
  font-size: 9pt;
  text-align: left;
}
.indicator-cell {
  width: 75%;
}
.value-cell {
  width: 25%;
  text-align: center;
}
td.value-cell {
  white-space: pre;
}
th.value-cell {
  font-size: 7pt;
  line-height: 1.35;
  white-space: normal;
}
.report-footer {
  margin-top: 8px;
  font-size: 7pt;
  text-align: right;
  color: #444;
}
</style>
</head>
<body>
<h1 class="report-title">របាយការណ៍ទិន្នន័យលទ្ធផលការអនុវត្ត</h1>
<p class="report-meta">
  <strong>ទីតាំង៖</strong> {{.Data.Zone.NameKh}} &nbsp;|&nbsp;
  <strong>រយៈពេល៖</strong> {{.PeriodRangeLabel}}
  {{if .Data.Period.StartDate}} &nbsp;|&nbsp; <strong>ចាប់ពី៖</strong> {{.Data.Period.StartDate}}{{end}}
  {{if .Data.Period.EndDate}} &nbsp;|&nbsp; <strong>ដល់៖</strong> {{.Data.Period.EndDate}}{{end}}
</p>
{{$periodLabel := .PeriodRangeLabel}}
{{$generatedAt := .GeneratedAt}}
<table>
<thead>
<tr>
  <th class="indicator-cell">សូចនាករ</th>
  <th class="value-cell">ទិន្នន័យ ឬព័ត៌មានលទ្ធផលនៃការអនុវត្ត ({{$periodLabel}})</th>
</tr>
</thead>
<tbody>
{{range $di, $d := .Data.Domains}}
<tr><td class="domain-row" colspan="2">{{$d.Domain.Code}}. {{$d.Domain.NameKh}}</td></tr>
{{range $si, $sd := $d.SubDomains}}
<tr><td class="subdomain-row" colspan="2">{{$sd.SubDomain.Code}}. {{$sd.SubDomain.NameKh}}</td></tr>
{{range $ii, $ind := $sd.Indicators}}
<tr>
  <td class="indicator-cell">{{$ind.Indicator.NameKh}}</td>
  <td class="value-cell">{{formatValue $ind.Indicator.DataType $ind.Value}}</td>
</tr>
{{end}}
{{end}}
{{end}}
</tbody>
</table>
<p class="report-footer">បង្កើតនៅ {{$generatedAt}}</p>
</body>
</html>`

const memberReportHTML = `<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'Battambang';
  src: url({{.BattambangFontPath}}) format('truetype');
  font-weight: normal;
}
@font-face {
  font-family: 'Battambang';
  src: url({{.BattambangBoldFontPath}}) format('truetype');
  font-weight: bold;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Battambang', sans-serif;
  padding: 20px 30px;
  color: #333;
}
h1 {
  font-family: 'Battambang', sans-serif;
  font-weight: bold;
  font-size: 20px;
  text-align: center;
  margin-bottom: 5px;
  color: #1a5276;
}
.subtitle {
  text-align: center;
  font-size: 11px;
  margin-bottom: 15px;
  color: #666;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px;
}
th {
  font-weight: bold;
  background: #2980b9;
  color: white;
  padding: 5px 4px;
  text-align: center;
  white-space: nowrap;
}
td {
  padding: 4px;
  border: 1px solid #bdc3c7;
  vertical-align: middle;
}
tr:nth-child(even) td { background: #f0f3f4; }
.text-center { text-align: center; }
</style>
</head>
<body>
<h1>របាយការណ៍សមាជិកបក្ស</h1>
<p class="subtitle">កាលបរិច្ឆេទ: {{.GeneratedAt}} | ចំនួនសរុប: {{.Total}} នាក់</p>
<table>
<thead>
<tr>
  <th>ល.រ</th>
  <th>លេខសមាជិក</th>
  <th>ឈ្មោះខ្មែរ</th>
  <th>ឈ្មោះឡាតាំង</th>
  <th>ភេទ</th>
  <th>ថ្ងៃខែឆ្នាំកំណើត</th>
  <th>លេខទូរស័ព្ទ</th>
  <th>តួនាទី</th>
  <th>ស្ថានភាព</th>
</tr>
</thead>
<tbody>
{{range $i, $m := .Members}}
<tr>
  <td class="text-center">{{add $i 1}}</td>
  <td>{{$m.MembershipCardNo}}</td>
  <td>{{$m.LastNameKh}} {{$m.FirstNameKh}}</td>
  <td>{{$m.LastNameEn}} {{$m.FirstNameEn}}</td>
  <td class="text-center">{{if eq $m.Gender "Female"}}ស្រី{{else}}ប្រុស{{end}}</td>
  <td class="text-center">{{$m.DateOfBirth}}</td>
  <td>{{$m.PhoneNumber}}</td>
  <td>{{$m.PartyRole}}</td>
  <td class="text-center">{{if eq $m.Status "inactive"}}អសកម្ម{{else}}សកម្ម{{end}}</td>
</tr>
{{end}}
</tbody>
</table>
</body>
</html>`

func (s *ReportService) GeneratePartyReportDocument(doc *models.ReportDocument) ([]byte, error) {
	fontDir := s.fontDir
	battambangPath := filepath.Join(fontDir, "Battambang-Regular.ttf")
	battambangBoldPath := filepath.Join(fontDir, "Battambang-Bold.ttf")

	reportMonth := 0
	reportYear := 0
	if doc.ReportMonth != nil {
		reportMonth = *doc.ReportMonth
	}
	if doc.ReportYear != nil {
		reportYear = *doc.ReportYear
	}

	funcMap := template.FuncMap{
		"khmerDigits": periodlabel.ToKhmerDigits,
		"khmerMonth":  periodlabel.KhmerMonthName,
	}

	tmpl := template.Must(template.New("partyReport").Funcs(funcMap).Parse(partyReportHTML))
	var htmlBuf bytes.Buffer
	err := tmpl.Execute(&htmlBuf, map[string]any{
		"BattambangFontPath":     "file://" + battambangPath,
		"BattambangBoldFontPath": "file://" + battambangBoldPath,
		"Doc":                    doc,
		"ReportMonth":            reportMonth,
		"ReportYear":             reportYear,
		"PoliticalHTML":          template.HTML(doc.PoliticalSituationSummary),
	})
	if err != nil {
		return nil, fmt.Errorf("render party report template: %w", err)
	}

	return s.htmlToPDF(htmlBuf.Bytes(), portraitA4PDFOptions())
}

const partyReportHTML = `<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'Battambang';
  src: url({{.BattambangFontPath}}) format('truetype');
  font-weight: normal;
}
@font-face {
  font-family: 'Battambang';
  src: url({{.BattambangBoldFontPath}}) format('truetype');
  font-weight: bold;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Battambang', sans-serif;
  color: #000;
  font-size: 11pt;
  line-height: 1.6;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
}
.header-left, .header-right {
  width: 48%;
  font-size: 10pt;
  line-height: 1.5;
}
.header-right {
  text-align: right;
}
.doc-title {
  text-align: center;
  font-weight: bold;
  font-size: 13pt;
  margin: 12px 0 6px;
  text-decoration: underline;
}
.doc-subtitle {
  text-align: center;
  font-size: 11pt;
  margin-bottom: 16px;
}
.section-title {
  font-weight: bold;
  margin: 14px 0 8px;
}
.narrative {
  text-align: justify;
  margin-bottom: 14px;
  white-space: pre-wrap;
}
.stats-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}
.stats-table td, .stats-table th {
  border: 1px solid #000;
  padding: 6px 8px;
  vertical-align: middle;
  font-size: 10.5pt;
}
.stats-table th {
  font-weight: bold;
  text-align: center;
  background: #f3f3f3;
}
.num {
  text-align: center;
  width: 80px;
}
</style>
</head>
<body>
<div class="header-row">
  <div class="header-left">
    <div>{{.Doc.PartyName}}</div>
    <div>ខេត្ត{{.Doc.ProvinceName}}</div>
    <div>ស្រុក{{.Doc.DistrictName}}</div>
    {{if .Doc.DocumentReferenceNumber}}<div>លេខ {{.Doc.DocumentReferenceNumber}}</div>{{end}}
  </div>
  <div class="header-right">
    {{if .Doc.GenerationDateKhmer}}{{.Doc.GenerationDateKhmer}}{{end}}
  </div>
</div>

<div class="doc-title">របាយការណ៍ស្ដីពីសភាពនយោបាយ និងសន្តិសុខ</div>
<div class="doc-subtitle">ខែ{{khmerMonth .ReportMonth}} ឆ្នាំ{{khmerDigits .ReportYear}}</div>

<div class="section-title">I. សភាពនយោបាយ និងសន្តិសុខ</div>
<div class="section-title" style="font-weight:normal;">ក. សភាពនយោបាយ និងសន្តិសុខទូទៅ</div>
<div class="narrative">{{.PoliticalHTML}}</div>

<div class="section-title" style="font-weight:normal;">ខ. ស្ថិតិបទល្មើស និងគ្រោះថ្នាក់</div>
<table class="stats-table">
  <thead>
    <tr>
      <th>ខ្លឹមសារ</th>
      <th class="num">ចំនួន</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>សភាពការណ៍បទល្មើស កើតឡើង</td>
      <td class="num">{{khmerDigits .Doc.TotalCrimesCount}}</td>
    </tr>
    <tr>
      <td>ឃាតកម្ម</td>
      <td class="num">{{khmerDigits .Doc.HomicideCases}}</td>
    </tr>
    <tr>
      <td>អត្តឃាត</td>
      <td class="num">{{khmerDigits .Doc.SuicideCases}}</td>
    </tr>
    <tr>
      <td>បទមជ្ឈិម</td>
      <td class="num">{{khmerDigits .Doc.MisdemeanorCases}}</td>
    </tr>
    <tr>
      <td>ផ្នែកមនុស្ស ស្លាប់</td>
      <td class="num">{{khmerDigits .Doc.HumanFatalities}}</td>
    </tr>
    <tr>
      <td>ផ្នែកសម្ភារៈ</td>
      <td>{{.Doc.PropertyDamageDesc}}</td>
    </tr>
  </tbody>
</table>
</body>
</html>`

