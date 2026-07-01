package periodlabel

import "testing"

func TestToKhmerDigits(t *testing.T) {
	got := ToKhmerDigits(2026)
	want := "២០២៦"
	if got != want {
		t.Fatalf("ToKhmerDigits(2026) = %q, want %q", got, want)
	}
}

func TestFormatKhFromDates(t *testing.T) {
	got := FormatKhFromDates("2022-01-01", "2026-06-30")
	want := "គិតចាប់ពីដើមឆ្នាំ២០២២ ដល់ខែមិថុនា ឆ្នាំ២០២៦"
	if got != want {
		t.Fatalf("FormatKhFromDates = %q, want %q", got, want)
	}
}
