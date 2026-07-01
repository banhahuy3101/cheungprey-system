package services

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/go-pdf/fpdf"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/pkg/periodlabel"
)

const (
	khmerFontFamily = "Battambang"
)

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

func (s *ReportService) generatePerformanceReportPDF(data *models.PerformanceReportData) ([]byte, error) {
	regularFont := filepath.Join(s.fontDir, "Battambang-Regular.ttf")
	boldFont := filepath.Join(s.fontDir, "Battambang-Bold.ttf")
	if _, err := os.Stat(regularFont); err != nil {
		return nil, fmt.Errorf("khmer font missing: %w", err)
	}
	if _, err := os.Stat(boldFont); err != nil {
		return nil, fmt.Errorf("khmer bold font missing: %w", err)
	}

	pdf := fpdf.New("L", "mm", "A4", s.fontDir)
	pdf.SetMargins(10, 10, 10)
	pdf.SetAutoPageBreak(true, 12)
	pdf.AddPage()

	pdf.AddUTF8Font(khmerFontFamily, "", "Battambang-Regular.ttf")
	pdf.AddUTF8Font(khmerFontFamily, "B", "Battambang-Bold.ttf")

	periodRangeLabel := periodlabel.FormatKhFromDates(data.Period.StartDate, data.Period.EndDate)
	if periodRangeLabel == "" {
		periodRangeLabel = data.Period.LabelKh
	}

	pdf.SetFont(khmerFontFamily, "B", 14)
	pdf.CellFormat(0, 8, "របាយការណ៍ទិន្នន័យលទ្ធផលការអនុវត្ត", "", 1, "C", false, 0, "")

	pdf.SetFont(khmerFontFamily, "", 9)
	meta := fmt.Sprintf("ទីតាំង៖ %s  |  រយៈពេល៖ %s", data.Zone.NameKh, periodRangeLabel)
	if data.Period.StartDate != "" {
		meta += fmt.Sprintf("  |  ចាប់ពី៖ %s", data.Period.StartDate)
	}
	if data.Period.EndDate != "" {
		meta += fmt.Sprintf("  |  ដល់៖ %s", data.Period.EndDate)
	}
	pdf.MultiCell(0, 5, meta, "", "C", false)
	pdf.Ln(3)

	const (
		colIndicator = 200.0
		colValue     = 77.0
		lineH        = 5.0
	)

	drawTableHeader := func() {
		pdf.SetFont(khmerFontFamily, "B", 8)
		pdf.SetFillColor(232, 238, 245)
		x, y := pdf.GetXY()
		pdf.Rect(x, y, colIndicator+colValue, 7, "F")
		pdf.CellFormat(colIndicator, 7, "សូចនាករ", "1", 0, "C", false, 0, "")
		pdf.CellFormat(colValue, 7, fmt.Sprintf("ទិន្នន័យ (%s)", periodRangeLabel), "1", 1, "C", false, 0, "")
	}

	drawTableHeader()

	for _, domain := range data.Domains {
		pdf.SetFont(khmerFontFamily, "B", 10)
		pdf.SetFillColor(245, 245, 245)
		label := fmt.Sprintf("%s. %s", domain.Domain.Code, domain.Domain.NameKh)
		pdf.CellFormat(colIndicator+colValue, 6, label, "1", 1, "L", true, 0, "")

		for _, sub := range domain.SubDomains {
			pdf.SetFont(khmerFontFamily, "B", 9)
			pdf.SetFillColor(250, 250, 250)
			subLabel := fmt.Sprintf("%s. %s", sub.SubDomain.Code, sub.SubDomain.NameKh)
			pdf.CellFormat(colIndicator+colValue, 5.5, subLabel, "1", 1, "L", true, 0, "")

			for _, ind := range sub.Indicators {
				if pdf.GetY() > 185 {
					pdf.AddPage()
					drawTableHeader()
				}
				value := formatPerformanceValue(ind.Indicator.DataType, ind.Value)
				pdf.SetFont(khmerFontFamily, "", 8)
				x, y := pdf.GetXY()
				pdf.MultiCell(colIndicator, lineH, ind.Indicator.NameKh, "1", "L", false)
				endY := pdf.GetY()
				pdf.SetXY(x+colIndicator, y)
				pdf.MultiCell(colValue, lineH, value, "1", "C", false)
				if pdf.GetY() < endY {
					pdf.SetY(endY)
				}
			}
		}
	}

	pdf.Ln(4)
	pdf.SetFont(khmerFontFamily, "", 7)
	pdf.SetTextColor(100, 100, 100)
	pdf.CellFormat(0, 4, fmt.Sprintf("បង្កើតនៅ %s", time.Now().Format("02/01/2006 15:04")), "", 1, "R", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("write pdf: %w", err)
	}
	return buf.Bytes(), nil
}
