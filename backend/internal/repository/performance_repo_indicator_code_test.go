package repository

import (
	"testing"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func TestParseFullIndicatorCode(t *testing.T) {
	domains := []models.PerformanceDomain{
		{Code: "I"},
		{Code: "II"},
		{Code: "VII"},
	}
	subs := []models.PerformanceSubDomain{
		{Code: "7.1"},
		{Code: "7.2"},
		{Code: "2.1"},
	}

	domain, sub, ind, err := parseFullIndicatorCode("VII.7.2.17", domains, subs)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if domain != "VII" || sub != "7.2" || ind != "17" {
		t.Fatalf("got %q.%q.%q", domain, sub, ind)
	}

	domain, sub, ind, err = parseFullIndicatorCode("I.2.1.3", domains, subs)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if domain != "I" || sub != "2.1" || ind != "3" {
		t.Fatalf("got %q.%q.%q", domain, sub, ind)
	}

	_, _, _, err = parseFullIndicatorCode("VII.7.99", domains, subs)
	if err == nil {
		t.Fatal("expected error for missing indicator segment")
	}
}
