package services

import (
	"bytes"
	"fmt"
	"text/template"
	"time"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

const financeReportHTML = `<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="UTF-8">
<style>
@font-face { font-family: 'Battambang'; src: url('{{.BattambangFontPath}}') format('truetype'); }
@font-face { font-family: 'Battambang'; font-weight: bold; src: url('{{.BattambangBoldFontPath}}') format('truetype'); }
body { font-family: 'Battambang', sans-serif; font-size: 11pt; color: #111; margin: 24px; }
h1 { font-size: 16pt; text-align: center; margin-bottom: 4px; }
.sub { text-align: center; color: #555; margin-bottom: 18px; font-size: 10pt; }
.stats { display: flex; gap: 12px; margin-bottom: 16px; }
.stat { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 6px; }
.stat-label { font-size: 9pt; color: #666; }
.stat-value { font-size: 13pt; font-weight: bold; margin-top: 4px; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }
th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: left; }
th { background: #f3f4f6; }
.num { text-align: right; }
.section { margin-top: 18px; }
.section h2 { font-size: 12pt; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
.income { color: #059669; }
.expense { color: #dc2626; }
.footer { margin-top: 24px; font-size: 8pt; color: #888; text-align: center; }
</style>
</head>
<body>
<h1>របាយការណ៍ហិរញ្ញវត្ថុ</h1>
<div class="sub">{{.Data.ZoneNameKh}} · {{.Data.PeriodFrom}} – {{.Data.PeriodTo}}</div>
<div class="stats">
  <div class="stat"><div class="stat-label">ចំណូលសរុប</div><div class="stat-value income">{{formatUSD .Data.Summary.TotalIncome}}</div></div>
  <div class="stat"><div class="stat-label">ចំណាយសរុប</div><div class="stat-value expense">{{formatUSD .Data.Summary.TotalExpense}}</div></div>
  <div class="stat"><div class="stat-label">សមតុល្យ</div><div class="stat-value">{{formatUSD .Data.Summary.Balance}}</div></div>
</div>
{{if .Data.ByZone}}
<div class="section"><h2>សង្ខេបតាមតំបន់</h2>
<table><thead><tr><th>តំបន់</th><th class="num">ចំណូល</th><th class="num">ចំណាយ</th><th class="num">សមតុល្យ</th></tr></thead><tbody>
{{range .Data.ByZone}}<tr><td>{{.ZoneNameKh}}</td><td class="num income">{{formatUSD .TotalIncome}}</td><td class="num expense">{{formatUSD .TotalExpense}}</td><td class="num">{{formatUSD .Balance}}</td></tr>{{end}}
</tbody></table></div>
{{end}}
{{if .Data.Budgets}}
<div class="section"><h2>ថវិកា vs ការពិត</h2>
<table><thead><tr><th>តំបន់</th><th>ប្រភេទ</th><th class="num">ថវិកា</th><th class="num">ការពិត</th><th class="num">%</th></tr></thead><tbody>
{{range .Data.Budgets}}<tr><td>{{.ZoneNameKh}}</td><td>{{.BudgetType}}</td><td class="num">{{formatUSD .AmountUSD}}</td><td class="num">{{formatUSD .ActualUSD}}</td><td class="num">{{printf "%.0f" .UsedPct}}%</td></tr>{{end}}
</tbody></table></div>
{{end}}
{{if .Data.Transactions}}
<div class="section"><h2>ប្រតិបត្តិការ ({{len .Data.Transactions}})</h2>
<table><thead><tr><th>កាលបរិច្ឆេទ</th><th>តំបន់</th><th>ប្រភេទ</th><th class="num">USD</th><th>កំណត់សម្គាល់</th></tr></thead><tbody>
{{range .Data.Transactions}}<tr><td>{{formatDate .TransactionDate}}</td><td>{{.ZoneNameKh}}</td><td>{{.TransactionType}}</td><td class="num">{{formatUSD .AmountUSD}}</td><td>{{deref .Notes}}</td></tr>{{end}}
</tbody></table></div>
{{end}}
<div class="footer">បង្កើតនៅ {{.Data.GeneratedAt}}</div>
</body></html>`

func renderFinanceReportHTML(data *models.FinanceReportData, regularFont, boldFont string) ([]byte, error) {
	funcMap := template.FuncMap{
		"formatUSD": func(v float64) string { return fmt.Sprintf("$%.2f", v) },
		"formatDate": func(t time.Time) string { return t.Format("02/01/2006") },
		"deref": func(s *string) string {
			if s == nil {
				return ""
			}
			return *s
		},
	}
	tmpl := template.Must(template.New("finance").Funcs(funcMap).Parse(financeReportHTML))
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, map[string]any{
		"BattambangFontPath":     regularFont,
		"BattambangBoldFontPath": boldFont,
		"Data":                   data,
	}); err != nil {
		return nil, fmt.Errorf("render finance report: %w", err)
	}
	return buf.Bytes(), nil
}

func (s *ReportService) GenerateFinanceReport(data *models.FinanceReportData) ([]byte, error) {
	return s.htmlToPDF(func() ([]byte, error) {
		return renderFinanceReportHTML(data, reportFontRegular, reportFontBold)
	}, portraitA4PDFOptions())
}
