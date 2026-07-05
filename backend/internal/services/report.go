package services

import (
	"bytes"
	"context"
	"fmt"
	htmltemplate "html/template"
	"io"
	"os"
	"path/filepath"
	"text/template"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/pkg/pdf"
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

const (
	reportFontRegular = "fonts/Battambang-Regular.ttf"
	reportFontBold    = "fonts/Battambang-Bold.ttf"
)

func copyReportFonts(destDir, sourceDir string) error {
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return err
	}
	for _, name := range []string{"Battambang-Regular.ttf", "Battambang-Bold.ttf"} {
		src := filepath.Join(sourceDir, name)
		dst := filepath.Join(destDir, name)
		in, err := os.Open(src)
		if err != nil {
			return fmt.Errorf("open font %s: %w", name, err)
		}
		out, err := os.Create(dst)
		if err != nil {
			in.Close()
			return fmt.Errorf("create font %s: %w", name, err)
		}
		_, copyErr := io.Copy(out, in)
		closeErr := errorsJoin(in.Close(), out.Close())
		if copyErr != nil {
			return fmt.Errorf("copy font %s: %w", name, copyErr)
		}
		if closeErr != nil {
			return closeErr
		}
	}
	return nil
}

func errorsJoin(errs ...error) error {
	for _, err := range errs {
		if err != nil {
			return err
		}
	}
	return nil
}

type pdfOptions struct {
	landscape                      bool
	showPageNumbers                bool
	paperWidth, paperHeight        float64
	marginTop, marginBottom        float64
	marginLeft, marginRight        float64
}

func portraitA4PDFOptions(showPageNumbers ...bool) pdfOptions {
	opts := pdfOptions{
		paperWidth: 8.27, paperHeight: 11.69,
		marginTop: 0.55, marginBottom: 0.55,
		marginLeft: 0.65, marginRight: 0.55,
	}
	if len(showPageNumbers) > 0 {
		opts.showPageNumbers = showPageNumbers[0]
	}
	return opts
}

func landscapeA4PDFOptions() pdfOptions {
	return pdfOptions{
		landscape:   true,
		paperWidth: 16.5, paperHeight: 11.7,
		marginTop: 0.3, marginBottom: 0.3,
		marginLeft: 0.3, marginRight: 0.3,
	}
}

func (s *ReportService) GenerateMemberReport(members []models.Member) ([]byte, error) {
	return s.htmlToPDF(func() ([]byte, error) {
		return renderMemberReportHTML(members, reportFontRegular, reportFontBold)
	}, landscapeA4PDFOptions())
}

func renderMemberReportHTML(members []models.Member, regularFont, boldFont string) ([]byte, error) {
	funcMap := template.FuncMap{
		"add": func(a, b int) int { return a + b },
	}

	tmpl := template.Must(template.New("report").Funcs(funcMap).Parse(memberReportHTML))
	var htmlBuf bytes.Buffer
	err := tmpl.Execute(&htmlBuf, map[string]any{
		"BattambangFontPath":     regularFont,
		"BattambangBoldFontPath": boldFont,
		"Members":                members,
		"Total":                  len(members),
		"GeneratedAt":            time.Now().Format("2006-01-02 15:04:05"),
	})
	if err != nil {
		return nil, fmt.Errorf("render template: %w", err)
	}
	return htmlBuf.Bytes(), nil
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

func renderPerformanceReportHTML(data *models.PerformanceReportData, regularFont, boldFont string) ([]byte, error) {
	funcMap := template.FuncMap{
		"add":         func(a, b int) int { return a + b },
		"formatValue": formatPerformanceValue,
	}

	tmpl := template.Must(template.New("report").Funcs(funcMap).Parse(performanceReportHTML))
	periodRangeLabel := periodlabel.FormatKhFromDates(data.Period.StartDate, data.Period.EndDate)
	if periodRangeLabel == "" {
		periodRangeLabel = data.Period.LabelKh
	}
	var htmlBuf bytes.Buffer
	err := tmpl.Execute(&htmlBuf, map[string]any{
		"BattambangFontPath":     regularFont,
		"BattambangBoldFontPath": boldFont,
		"Data":                   data,
		"PeriodRangeLabel":       periodRangeLabel,
		"GeneratedAt":            time.Now().Format("02/01/2006 15:04"),
	})
	if err != nil {
		return nil, fmt.Errorf("render template: %w", err)
	}
	return htmlBuf.Bytes(), nil
}

func (s *ReportService) htmlToPDF(renderHTML func() ([]byte, error), opts pdfOptions) ([]byte, error) {
	if _, err := pdf.ResolveChromePath(); err != nil {
		return nil, err
	}
	tmpDir, err := os.MkdirTemp("", "cheungprey-html-pdf-*")
	if err != nil {
		return nil, fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	if err := copyReportFonts(filepath.Join(tmpDir, "fonts"), s.fontDir); err != nil {
		return nil, fmt.Errorf("prepare khmer fonts: %w", err)
	}

	htmlBytes, err := renderHTML()
	if err != nil {
		return nil, err
	}

	htmlPath := filepath.Join(tmpDir, "report.html")
	if err := os.WriteFile(htmlPath, htmlBytes, 0644); err != nil {
		return nil, fmt.Errorf("write html: %w", err)
	}

	reportURL := "file://" + htmlPath

	ctx, cancel := pdf.ChromeAllocator(context.Background())
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	var pdfBuf []byte
	err = chromedp.Run(ctx,
		chromedp.Navigate(reportURL),
		chromedp.ActionFunc(func(ctx context.Context) error {
			return chromedp.EvaluateAsDevTools(`document.fonts.ready.then(() => 1)`, nil).Do(ctx)
		}),
		chromedp.ActionFunc(func(ctx context.Context) error {
			var err error
			builder := page.PrintToPDF().
				WithPrintBackground(true).
				WithPaperWidth(opts.paperWidth).
				WithPaperHeight(opts.paperHeight).
				WithMarginTop(opts.marginTop).
				WithMarginBottom(opts.marginBottom).
				WithMarginLeft(opts.marginLeft).
				WithMarginRight(opts.marginRight)
			if opts.landscape {
				builder = builder.WithLandscape(true)
			}
			if opts.showPageNumbers {
				builder = builder.
					WithDisplayHeaderFooter(true).
					WithFooterTemplate(`<div style="width:100%;text-align:center;font-size:9pt;font-family:'Battambang',sans-serif;color:#475569;">ទំព័រ <span class="pageNumber"></span></div>`)
			}
			pdfBuf, _, err = builder.Do(ctx)
			return err
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("generate pdf: %w", err)
	}
	if len(pdfBuf) < 4 || string(pdfBuf[:4]) != "%PDF" {
		return nil, fmt.Errorf("generate pdf: invalid pdf output")
	}
	return pdfBuf, nil
}

func (s *ReportService) GeneratePerformanceReport(data *models.PerformanceReportData) ([]byte, error) {
	return s.htmlToPDF(func() ([]byte, error) {
		return renderPerformanceReportHTML(data, reportFontRegular, reportFontBold)
	}, landscapeA4PDFOptions())
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
  src: url('{{.BattambangFontPath}}') format('truetype');
  font-weight: normal;
}
@font-face {
  font-family: 'Battambang';
  src: url('{{.BattambangBoldFontPath}}') format('truetype');
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
  src: url('{{.BattambangFontPath}}') format('truetype');
  font-weight: normal;
}
@font-face {
  font-family: 'Battambang';
  src: url('{{.BattambangBoldFontPath}}') format('truetype');
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

func (s *ReportService) GenerateReportPDF(doc *models.ReportDocument, showPageNumbers ...bool) ([]byte, error) {
	return s.htmlToPDF(func() ([]byte, error) {
		return renderSimpleReportHTML(doc, reportFontRegular, reportFontBold)
	}, portraitA4PDFOptions(showPageNumbers...))
}

// Deprecated alias — use GenerateReportPDF.
func (s *ReportService) GeneratePartyReportDocument(doc *models.ReportDocument) ([]byte, error) {
	return s.GenerateReportPDF(doc)
}

func renderSimpleReportHTML(doc *models.ReportDocument, regularFont, boldFont string) ([]byte, error) {
	tmpl := htmltemplate.Must(htmltemplate.New("simpleReport").Parse(simpleReportHTML))
	var htmlBuf bytes.Buffer
	err := tmpl.Execute(&htmlBuf, map[string]any{
		"BattambangFontPath":     regularFont,
		"BattambangBoldFontPath": boldFont,
		"Doc":                    doc,
		"Content":                htmltemplate.HTML(doc.Content),
	})
	if err != nil {
		return nil, fmt.Errorf("render report template: %w", err)
	}
	return htmlBuf.Bytes(), nil
}

const simpleReportHTML = `<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'Battambang';
  src: url('{{.BattambangFontPath}}') format('truetype');
  font-weight: normal;
}
@font-face {
  font-family: 'Battambang';
  src: url('{{.BattambangBoldFontPath}}') format('truetype');
  font-weight: bold;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Battambang', sans-serif;
  color: #0f172a;
  font-size: 11pt;
  line-height: 1.75;
  padding: 0.05in 0.1in;
}
.report-content { font-size: 11pt; }
.report-content p { margin: 0.5em 0; }
.report-content h1 { font-size: 16pt; margin: 1em 0 0.4em; }
.report-content h2 { font-size: 14pt; margin: 0.85em 0 0.35em; }
.report-content h3 { font-size: 12pt; margin: 0.75em 0 0.3em; }
.report-content h4 { font-size: 11pt; margin: 0.65em 0 0.25em; }
.report-content ul, .report-content ol { padding-left: 1.4em; margin: 0.45em 0; }
.report-content blockquote {
  border-left: 3px solid #cbd5e1;
  padding-left: 0.85em;
  margin: 0.65em 0;
  color: #64748b;
}
.report-content img { max-width: 100%; height: auto; margin: 0.65em 0; border-radius: 4px; }
.report-content table { width: 100%; border-collapse: collapse; margin: 0.65em 0; font-size: 10pt; }
.report-content th, .report-content td {
  border: 1px solid #cbd5e1;
  padding: 5px 7px;
  vertical-align: top;
}
.report-content th { background: #f8fafc; font-weight: bold; }
.report-content mark { border-radius: 2px; padding: 0 2px; }
.report-content pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.75em 0.9em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.65em 0;
  font-size: 9.5pt;
}
.report-content code {
  background: #f1f5f9;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.92em;
}
</style>
</head>
<body>
<div class="report-content">{{.Content}}</div>
</body>
</html>`

