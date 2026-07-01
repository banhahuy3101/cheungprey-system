package periodlabel

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

var khmerMonths = []string{
	"", "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
	"កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ",
}

var engMonths = []string{
	"", "January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
}

func ToKhmerDigits(n int) string {
	digits := []rune("០១២៣៤៥៦៧៨៩")
	var b strings.Builder
	for _, c := range strconv.Itoa(n) {
		if c >= '0' && c <= '9' {
			b.WriteRune(digits[c-'0'])
		}
	}
	return b.String()
}

func KhmerMonthName(month int) string {
	if month < 1 || month >= len(khmerMonths) {
		return ""
	}
	return khmerMonths[month]
}

func parseDate(s string) (time.Time, error) {
	if len(s) >= 10 {
		s = s[:10]
	}
	return time.Parse("2006-01-02", s)
}

func FormatKh(start, end time.Time) string {
	sm, em := int(start.Month()), int(end.Month())
	sy, ey := start.Year(), end.Year()
	syKh, eyKh := ToKhmerDigits(sy), ToKhmerDigits(ey)

	if sm == 1 {
		label := fmt.Sprintf("គិតចាប់ពីដើមឆ្នាំ%s ដល់ខែ%s", syKh, khmerMonths[em])
		if ey != sy {
			label += fmt.Sprintf(" ឆ្នាំ%s", eyKh)
		}
		return label
	}
	if sy == ey {
		return fmt.Sprintf("គិតចាប់ពីខែ%s ដល់ខែ%s ឆ្នាំ%s", khmerMonths[sm], khmerMonths[em], syKh)
	}
	return fmt.Sprintf("គិតចាប់ពីខែ%s ឆ្នាំ%s ដល់ខែ%s ឆ្នាំ%s", khmerMonths[sm], syKh, khmerMonths[em], eyKh)
}

func FormatEn(start, end time.Time) string {
	sm, em := int(start.Month()), int(end.Month())
	sy, ey := start.Year(), end.Year()

	if sm == 1 {
		if ey != sy {
			return fmt.Sprintf("From early %d to %s %d", sy, engMonths[em], ey)
		}
		return fmt.Sprintf("From early %d to %s", sy, engMonths[em])
	}
	if sy == ey {
		return fmt.Sprintf("%s to %s %d", engMonths[sm], engMonths[em], sy)
	}
	return fmt.Sprintf("%s %d to %s %d", engMonths[sm], sy, engMonths[em], ey)
}

func FormatKhFromDates(startDate, endDate string) string {
	start, err1 := parseDate(startDate)
	end, err2 := parseDate(endDate)
	if err1 != nil || err2 != nil {
		return ""
	}
	return FormatKh(start, end)
}

func FormatEnFromDates(startDate, endDate string) string {
	start, err1 := parseDate(startDate)
	end, err2 := parseDate(endDate)
	if err1 != nil || err2 != nil {
		return ""
	}
	return FormatEn(start, end)
}
