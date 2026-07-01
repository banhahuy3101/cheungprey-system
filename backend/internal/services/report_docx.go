package services

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"regexp"
	"strings"

	docx "github.com/lukasjarosch/go-docx"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

var htmlTagRe = regexp.MustCompile(`<[^>]*>`)

func stripHTMLTags(s string) string {
	if s == "" {
		return ""
	}
	plain := htmlTagRe.ReplaceAllString(s, "")
	plain = strings.ReplaceAll(plain, "&nbsp;", " ")
	return strings.TrimSpace(plain)
}

func reportDocxPlaceholderMap(doc *models.ReportDocument) docx.PlaceholderMap {
	htmlMap := ReportDocumentReplacements(doc)
	out := docx.PlaceholderMap{}
	for key, value := range htmlMap {
		name := strings.TrimPrefix(key, "{{")
		name = strings.TrimSuffix(name, "}}")
		if name == "political_situation_summary" {
			value = stripHTMLTags(value)
		}
		out[name] = value
	}
	return out
}

func replaceDocxPlaceholders(dx *docx.Document, dataMap docx.PlaceholderMap) error {
	phList, err := dx.GetPlaceHoldersList()
	if err != nil {
		return fmt.Errorf("list placeholders: %w", err)
	}
	if len(phList) == 0 {
		return nil
	}

	filtered := docx.PlaceholderMap{}
	for _, ph := range phList {
		key := docx.RemovePlaceholderDelimiter(ph)
		if _, exists := filtered[key]; exists {
			continue
		}
		if val, ok := dataMap[key]; ok {
			filtered[key] = val
		} else {
			filtered[key] = ""
		}
	}

	if err := dx.ReplaceAll(filtered); err != nil {
		return fmt.Errorf("replace docx placeholders (use plain {key} text in Word, no bold/split formatting): %w", err)
	}
	return nil
}

func (s *ReportService) GeneratePartyReportFromDocxTemplate(doc *models.ReportDocument, fileDataBase64 string) ([]byte, error) {
	raw, err := base64.StdEncoding.DecodeString(fileDataBase64)
	if err != nil {
		return nil, fmt.Errorf("decode docx template: %w", err)
	}
	if len(raw) == 0 {
		return nil, fmt.Errorf("docx template is empty")
	}

	dx, err := docx.OpenBytes(raw)
	if err != nil {
		return nil, fmt.Errorf("open docx template: %w", err)
	}

	if err := replaceDocxPlaceholders(dx, reportDocxPlaceholderMap(doc)); err != nil {
		return nil, fmt.Errorf("replace docx placeholders: %w", err)
	}

	var buf bytes.Buffer
	if err := dx.Write(&buf); err != nil {
		return nil, fmt.Errorf("write docx: %w", err)
	}
	return buf.Bytes(), nil
}
