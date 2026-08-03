# Phase 1 Enhancement Implementation Plan — Reports, Templates & Performance

**Project:** ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ (Cheung Prey District Management System)  
**Timeline:** Next 1–2 sprints  
**Scope:** 16 enhancements across report documents, templates, performance, and PDF generation  
**Version:** 1.0  
**Last updated:** August 2026  

---

## Overview

Phase 1 targets high-impact, low-to-medium effort enhancements addressing immediate gaps in the current document, template, and performance modules. Each item includes complete acceptance criteria, API contracts, frontend/backend implementation notes, and test cases.

| Module | Items | Estimated Sprint Points |
|--------|-------|------------------------|
| Report Documents | 5 | 21 |
| Report Templates | 4 | 13 |
| Performance | 5 | 19 |
| PDF Generation | 2 | 13 |
| **Total** | **16** | **66** |

---

## Migration (Run First)

Apply these schema changes before any code work begins.

```sql
BEGIN;

-- ENH-RPT-01: Report categories
ALTER TABLE report_documents ADD COLUMN category TEXT;
CREATE INDEX idx_report_documents_category ON report_documents(category);

-- ENH-RPT-02: Zone scoping
ALTER TABLE report_documents ADD COLUMN zone_code VARCHAR(8);
ALTER TABLE report_documents ADD CONSTRAINT fk_report_documents_zone
  FOREIGN KEY (zone_code) REFERENCES geographic_zones(zone_code);
CREATE INDEX idx_report_documents_zone_code ON report_documents(zone_code);

-- Backfill zone_code from created_by's profile for existing reports
UPDATE report_documents rd
SET zone_code = p.zone_code
FROM profiles p
WHERE rd.created_by = p.id AND rd.zone_code IS NULL;

-- ENH-RPT-04: Soft delete
ALTER TABLE report_documents ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_report_documents_deleted_at ON report_documents(deleted_at);

-- ENH-TPL-03: Template categories
ALTER TABLE report_templates ADD COLUMN category TEXT;
CREATE INDEX idx_report_templates_category ON report_templates(category);

-- ENH-PRF-01: Indicator targets
ALTER TABLE performance_indicators ADD COLUMN target_value DECIMAL(15,4);
ALTER TABLE performance_indicators ADD COLUMN target_direction TEXT;
ALTER TABLE performance_indicators ADD CONSTRAINT chk_target_direction
  CHECK (target_direction IS NULL OR target_direction IN ('higher_is_better','lower_is_better'));

-- ENH-PRF-02: Value bounds
ALTER TABLE performance_indicators ADD COLUMN min_value DECIMAL(15,4);
ALTER TABLE performance_indicators ADD COLUMN max_value DECIMAL(15,4);

COMMIT;
```

---

## ENH-RPT-01 — Report Categories / Tags

**Priority:** P0 | **Effort:** S (3 pts) | **Module:** Report Documents

### Current State
Report documents have no classification field. All reports appear in a flat list.

### Target State
Users can assign a category when creating/editing a report. The list view filters by category with a KPI breakdown per category.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | When creating a report, user selects one category from a dropdown: `សន្តិសុខ` (Security), `សេដ្ឋកិច្ច` (Economy), `សង្គមកិច្ច` (Social Affairs), `ហិរញ្ញវត្ថុ` (Finance), `រដ្ឋបាល` (Administration), `ផ្សេងៗ` (Other) |
| AC-02 | Category displays as a colored badge next to each report in the list table |
| AC-03 | KPI stats card section shows breakdown: "សន្តិសុខ: 5", "សេដ្ឋកិច្ច: 3", etc. below the total/published/draft cards |
| AC-04 | A dropdown filter at the top of the list filters reports by category |
| AC-05 | Category is included in the report edit form (pre-filled with current value) |

### Backend Changes

**File: `internal/models/report_document.go`**
- Add `Category string` field to `ReportDocument` struct
- Add `Category string` to `CreateReportDocumentRequest` and `UpdateReportDocumentRequest`

**File: `internal/handler/report_document.go`**
- List endpoint: accept `?category=X` query param, filter by category if provided

**File: `internal/service/report_service.go` or handler**
- Add category to insert/update PostgREST calls

### Frontend Changes

**File: `src/pages/reports/Reports.jsx`**
- Add category dropdown filter in list header
- Add category badge column to table rows
- Add category breakdown in KPI stats section

**File: `src/components/reports/ReportCreateForm.jsx`**
- Add category `<select>` field

**File: `src/components/reports/ReportDetail.jsx`**
- Add category `<select>` field in edit mode

**File: `src/api/reportDocuments.js`**
- `listDocuments()` accepts optional `category` param

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Create report with category "សេដ្ឋកិច្ច" | Report saved with category; badge displayed in list |
| T-02 | Filter list by category "សន្តិសុខ" | Only security reports shown |
| T-03 | Edit report, change category to "ហិរញ្ញវត្ថុ" | Category updated; badge color changes |
| T-04 | Create report without selecting category | Defaults to "ផ្សេងៗ" or validation error |
| T-05 | KPI stats display | Category breakdown matches filtered/unfiltered counts |

---

## ENH-RPT-02 — Zone-Scoped Report Listing

**Priority:** P0 | **Effort:** M (5 pts) | **Module:** Report Documents

### Current State
List endpoint returns all reports across all zones regardless of user's role.

### Target State
Reports are filterable by zone. Filters default to the user's assigned zone based on their role. A zone badge column in the table shows which commune/district each report belongs to.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | List endpoint accepts `?zone_code=X` query param to filter reports by zone |
| AC-02 | For non-admin users, the default filter is their own zone_code (commune-level) |
| AC-03 | Super Admin and Admin see all zones by default, with optional filter |
| AC-04 | District Chief defaults to their district zone |
| AC-05 | List table shows a "តំបន់" (Zone) column displaying the zone's Khmer name |
| AC-06 | Zone filter is a ZoneCascadeSelect in the frontend (province → district → commune) |

### Backend Changes

**File: `internal/handler/report_document.go`**
- List handler: extract `zone_code` from query params
- If no `zone_code` provided, resolve from user's profile zone_code (unless admin)
- If `zone_code` is a parent zone (province/district), return all reports in child zones
- PostgREST filter: add `.Eq("zone_code", zoneCode)` when filtering

**File: `internal/models/report_document.go`**
- Add `ZoneCode string` and `ZoneName string` (enriched) to response struct

### Frontend Changes

**File: `src/pages/reports/Reports.jsx`**
- Add `ZoneCascadeSelect` component to the filter bar
- Add zone name column to report table
- Pass user's profile zone as default filter value

**File: `src/api/reportDocuments.js`**
- `listDocuments()` accepts optional `zone_code` param

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Commune clerk views report list | Only reports for their commune shown |
| T-02 | Admin views list without filter | All reports shown |
| T-03 | Admin filters by district zone_code | Reports from all communes in that district shown |
| T-04 | District chief views list | Reports scoped to their district |
| T-05 | Zone name column displays correctly | Each row shows correct commune/district name in Khmer |

---

## ENH-RPT-03 — Report Search by Content

**Priority:** P1 | **Effort:** M (5 pts) | **Module:** Report Documents

### Current State
List endpoint allows search by title only.

### Target State
Full-text search across title, description, and content fields using PostgreSQL ILIKE.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | Search input in list view searches title, description, AND content simultaneously |
| AC-02 | Search is case-insensitive |
| AC-03 | Results are returned instantly with debounced input (300ms) |
| AC-04 | Matching terms are highlighted in the result table (show a snippet of the matching text) |
| AC-05 | Search combines with category and zone filters (AND logic) |

### Backend Changes

**File: `internal/handler/report_document.go`**
- Accept `?search=X` query param
- Build PostgREST query: `or(title.ilike.%X%, description.ilike.%X%, content.ilike.%X%)`

### Frontend Changes

**File: `src/pages/reports/Reports.jsx`**
- Extend existing search input behavior to search by content as well (API-side change only)
- Add a brief content snippet column showing where the match occurred (truncated to 80 chars)

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Search "សន្តិភាព" | Returns reports with the term in title, description, or content |
| T-02 | Search "santepheap" (Latin) | Case-insensitive match |
| T-03 | Search with category filter | Only matching reports in that category |
| T-04 | Search returns no results | Show "រកមិនឃើញ" empty state |
| T-05 | Content snippet displays | Truncated text around the matched term shown in table |

---

## ENH-RPT-04 — Soft Delete (Undo After Deletion)

**Priority:** P1 | **Effort:** S (3 pts) | **Module:** Report Documents

### Current State
Hard delete removes report permanently. No recovery.

### Target State
Soft delete with `deleted_at` timestamp. Deleted reports hidden from list. 30-day recovery window via a "Trash" toggle in the UI.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | DELETE endpoint sets `deleted_at = NOW()` instead of removing the row |
| AC-02 | List endpoint adds `deleted_at IS NULL` filter by default |
| AC-03 | A "ធុងសំរាម" (Trash) toggle in the list view shows soft-deleted reports |
| AC-04 | Trash view shows "Restore" action button per report |
| AC-05 | RESTORE endpoint sets `deleted_at = NULL` |
| AC-06 | Deleted reports older than 30 days are permanently purged (manual cleanup or background job) |

### Backend Changes

**File: `internal/handler/report_document.go`**
- DELETE endpoint: `UPDATE report_documents SET deleted_at = NOW() WHERE id = $1`
- List endpoint: add `.Is("deleted_at", "null")` filter by default
- Accept `?trash=true` query param to show soft-deleted reports
- New endpoint: `PUT /api/report-documents/:id/restore` — sets `deleted_at = NULL`

**File: `internal/models/report_document.go`**
- Add `DeletedAt *time.Time` field

### Frontend Changes

**File: `src/pages/reports/Reports.jsx`**
- Add trash toggle switch/button in list header
- Trash mode: show deleted reports with restore button, hide edit/delete/confirm actions
- Restore button calls restore API, refreshes list

**File: `src/api/reportDocuments.js`**
- `restoreDocument(id)` — calls PUT `/report-documents/:id/restore`
- `listDocuments()` — accepts `trash` param

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Delete a report | Report hidden from normal list; appears in trash |
| T-02 | Restore a deleted report | Report reappears in normal list; deleted_at is NULL |
| T-03 | Toggle trash view | Only soft-deleted reports shown with restore action |
| T-04 | Delete a report twice | No error; deleted_at already set |
| T-05 | List after delete | Deleted reports not included in count/KPI stats |

---

## ENH-RPT-05 — Draft Auto-Save

**Priority:** P1 | **Effort:** M (5 pts) | **Module:** Report Documents

### Current State
Report content is only saved when the user clicks "Save". Unsaved changes are lost on navigation/browser close.

### Target State
Auto-save report content every 30 seconds while editing. On page load, prompt to recover unsaved draft if found.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | Content auto-saves to localStorage every 30 seconds during editing |
| AC-02 | Auto-save key is `report_draft_{reportId}` for existing reports, `report_draft_new` for new reports |
| AC-03 | An indicator shows "រក្សាទុកដោយស្វ័យប្រវត្តិ" (Auto-saved) timestamp when save occurs |
| AC-04 | On page load, if a draft exists in localStorage, show a toast/banner: "អ្នកមានសេចក្តីព្រាងដែលមិនបានរក្សាទុក។ តើអ្នកចង់ស្តារឡើងវិញទេ?" with "ស្តារ" / "មិនស្តារ" buttons |
| AC-05 | Recovering draft pre-fills title, description, and content fields |
| AC-06 | Auto-save does NOT trigger server API — local only, then regular save to server |
| AC-07 | Saved draft is cleared from localStorage on successful save/submit |
| AC-08 | Browser tab close triggers a `beforeunload` warning if there are unsaved changes |

### Frontend Changes

**File: `src/utils/editorAutoSave.js`** (new)
```js
const AUTOSAVE_KEY_PREFIX = 'report_draft_';
const AUTOSAVE_INTERVAL = 30000;

export function saveDraft(reportId, data) {
  const key = reportId ? `${AUTOSAVE_KEY_PREFIX}${reportId}` : `${AUTOSAVE_KEY_PREFIX}new`;
  localStorage.setItem(key, JSON.stringify({ ...data, savedAt: Date.now() }));
}

export function loadDraft(reportId) {
  const key = reportId ? `${AUTOSAVE_KEY_PREFIX}${reportId}` : `${AUTOSAVE_KEY_PREFIX}new`;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function clearDraft(reportId) {
  const key = reportId ? `${AUTOSAVE_KEY_PREFIX}${reportId}` : `${AUTOSAVE_KEY_PREFIX}new`;
  localStorage.removeItem(key);
}
```

**File: `src/components/reports/ReportCreateForm.jsx`**
- `useEffect` with `setInterval` (30s) calling `saveDraft()`
- On mount, check for existing draft via `loadDraft()`, show recovery banner
- On successful form submit, call `clearDraft()`
- Add `beforeunload` event listener for unsaved changes warning

**File: `src/components/reports/ReportDetail.jsx`**
- Same auto-save integration for edit mode

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Edit report, wait 30s | localStorage populated with draft content |
| T-02 | Close tab without saving | Browser shows "unsaved changes" warning |
| T-03 | Reopen browser, navigate to edit page | Recovery banner shown |
| T-04 | Click "ស្តារ" | Title, description, content pre-filled from draft |
| T-05 | Click "មិនស្តារ" | Draft cleared, fresh form |
| T-06 | Save report successfully | Draft cleared from localStorage |

---

## ENH-TPL-01 — Template Preview Before Download

**Priority:** P0 | **Effort:** M (5 pts) | **Module:** Report Templates

### Current State
After filling a template, the filled document downloads immediately with no preview.

### Target State
Show an in-browser preview of the filled document before prompting download. HTML templates render in an iframe; DOCX templates show an HTML-converted preview.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | After filling an HTML template, the content renders in a preview panel/iframe |
| AC-02 | After filling a DOCX template, the server converts it to HTML and returns a preview alongside the download URL |
| AC-03 | Preview panel has "ទាញយក" (Download) and "ត្រឡប់" (Back) buttons |
| AC-04 | Preview preserves the client-side Khmer font rendering |
| AC-05 | Template fill API response now includes `preview_html` field (for DOCX) or the filled content (for HTML) |

### Backend Changes

**File: `internal/handler/report_template_fill.go`**
- For HTML templates: return the filled HTML content as `preview_html` in the response
- For DOCX templates: use existing DOCX→HTML parser to generate a preview, return as `preview_html`
- Original filled file blob/download URL still returned as `download_url`

**API Response contract change:**
```json
{
  "download_url": "https://storage.supabase.co/.../filled.docx",
  "preview_html": "<html>...filled content...</html>",
  "format": "docx"
}
```

### Frontend Changes

**File: `src/pages/reports/ReportCreateFromTemplate.jsx`** or new component
- Replace immediate download with a preview step
- Show preview in a sandboxed iframe with Khmer font CSS
- Download and Back buttons below preview

**File: `src/components/reports/TemplatePreview.jsx`** (new)
- Renders `preview_html` in iframe or as HTML
- Download button triggers the download URL

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Fill HTML template | Preview renders in iframe with correct Khmer text |
| T-02 | Fill DOCX template | Preview renders HTML conversion with formatting |
| T-03 | Click "ទាញយក" | Filled document downloads |
| T-04 | Click "ត្រឡប់" | Return to template form with values preserved |

---

## ENH-TPL-02 — Template Validation on Upload

**Priority:** P0 | **Effort:** S (3 pts) | **Module:** Report Templates

### Current State
Invalid files can be uploaded as templates; errors surface only when filling.

### Target State
Validate uploaded files immediately: check file format, verify DOCX structure, return Khmer error messages for invalid uploads.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | Upload validates file extension: only `.docx` and `.html` accepted |
| AC-02 | For DOCX uploads: validate ZIP structure (magic bytes `PK`), verify `word/document.xml` exists and is valid XML |
| AC-03 | For HTML uploads: verify content is non-empty, has valid HTML structure |
| AC-04 | Error messages are in Khmer: "ឯកសារ DOCX មិនត្រឹមត្រូវ" (Invalid DOCX file), "ឯកសារ HTML មិនត្រឹមត្រូវ" (Invalid HTML file) |
| AC-05 | Validation happens server-side before storage |
| AC-06 | File size limit: 10 MB |

### Backend Changes

**File: `internal/handler/report_template.go`**
- Add file validation before upload:
  ```go
  func validateTemplateUpload(file multipart.File, header *multipart.FileHeader, format string) error {
      if header.Size > 10*1024*1024 {
          return errors.New("ឯកសារធំពេក (លើស 10 MB)")
      }
      if format == "docx" {
          return validateDocxTemplate(file)
      }
      if format == "html" {
          return validateHtmlTemplate(file)
      }
      return nil
  }
  
  func validateDocxTemplate(file multipart.File) error {
      // Check ZIP magic bytes
      buf := make([]byte, 2)
      file.Read(buf)
      file.Seek(0, 0)
      if string(buf) != "PK" {
          return errors.New("ឯកសារ DOCX មិនត្រឹមត្រូវ")
      }
      // Try opening as ZIP and check word/document.xml
      r, err := zip.NewReader(file, header.Size)
      if err != nil {
          return errors.New("ឯកសារ DOCX មិនត្រឹមត្រូវ")
      }
      for _, f := range r.File {
          if f.Name == "word/document.xml" {
              // Verify it's valid XML
              rc, _ := f.Open()
              decoder := xml.NewDecoder(rc)
              _, err := decoder.Token()
              rc.Close()
              if err != nil {
                  return errors.New("ឯកសារ DOCX ខូច — XML មិនត្រឹមត្រូវ")
              }
              return nil
          }
      }
      return errors.New("ឯកសារ DOCX មិនមាន document.xml")
  }
  ```

### Frontend Changes

**File: `src/pages/settings/SettingsReportTemplates.jsx`**
- Show file size validation warning before upload (client-side pre-check)
- Display server error messages in Khmer under the upload form

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Upload valid .docx | Upload succeeds |
| T-02 | Upload .pdf file | Error: "ទម្រង់ឯកសារមិនគាំទ្រ" |
| T-03 | Upload corrupted .docx (renamed .zip) | Error: "ឯកសារ DOCX ខូច" |
| T-04 | Upload .docx missing word/document.xml | Error: "ឯកសារ DOCX មិនមាន document.xml" |
| T-05 | Upload file >10MB | Error: "ឯកសារធំពេក" |
| T-06 | Upload empty .html | Error: "ឯកសារ HTML ទទេ" |

---

## ENH-TPL-03 — Template Categories / Grouping

**Priority:** P1 | **Effort:** S (2 pts) | **Module:** Report Templates

### Current State
All templates appear in a flat list.

### Target State
Templates grouped by category in the UI sidebar for easier navigation.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | Template create/edit form has a category dropdown: `របាយការណ៍សន្តិសុខ`, `របាយការណ៍ហិរញ្ញវត្ថុ`, `របាយការណ៍លទ្ធផលការងារ`, `របាយការណ៍រដ្ឋបាល`, `ផ្សេងៗ` |
| AC-02 | Template list page groups templates by category with expandable sections |
| AC-03 | Each group shows count of templates in that category |
| AC-04 | Filter by category available |
| AC-05 | When creating a report from template, categories filter the template selector |

### Backend Changes

**File: `internal/models/report_template.go`**
- Add `Category string` field

**File: `internal/handler/report_template.go`**
- List endpoint: accept `?category=X` filter
- Create/Update endpoints: accept category field

### Frontend Changes

**File: `src/pages/settings/SettingsReportTemplates.jsx`**
- Replace flat list with grouped accordion sections
- Add category filter dropdown
- Add category field to create/edit modal

**File: `src/pages/reports/ReportCreateFromTemplate.jsx`**
- Group template selector by category

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Create template with category "របាយការណ៍ហិរញ្ញវត្ថុ" | Template appears under that group |
| T-02 | Collapse/expand category group | Templates in that group show/hide |
| T-03 | Filter by category | Only templates in that category shown |
| T-04 | Template selector grouped by category | Templates shown in categorized sections |

---

## ENH-TPL-04 — Duplicate Template

**Priority:** P1 | **Effort:** S (3 pts) | **Module:** Report Templates

### Current State
No way to copy an existing template.

### Target State
Duplicate action clones an existing template as a new entry.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | Template list has a "Duplicate" action button per template |
| AC-02 | Duplicate creates a copy with name "ច្បាប់ចម្លងនៃ [original_name]" |
| AC-03 | All fields copied: name (modified), description, format, file, content, keys, category |
| AC-04 | Duplicated template stored as a new record with new `id` and `created_by` = current user |
| AC-05 | Confirmation modal before duplicate: "តើអ្នកចង់ចម្លងគំរូនេះទេ?" |

### Backend Changes

**File: `internal/handler/report_template.go`**
- New endpoint: `POST /api/report-templates/:id/duplicate`
- Logic: fetch template by ID, copy all fields, prepend "ច្បាប់ចម្លងនៃ " to name, save as new

### Frontend Changes

**File: `src/pages/settings/SettingsReportTemplates.jsx`**
- Add duplicate icon/button in each template row
- Confirmation modal with Khmer text

**File: `src/api/reportTemplates.js`**
- `duplicateTemplate(id)` — calls POST `/report-templates/:id/duplicate`

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Duplicate a template | New template with "ច្បាប់ចម្លងនៃ ..." name, same content/keys |
| T-02 | Fill duplicated template | Works identically to original |
| T-03 | Duplicate then delete original | Duplicate remains functional |
| T-04 | Duplicate template with files | File copied from storage to new path |

---

## ENH-PRF-01 — Indicator Target Values

**Priority:** P0 | **Effort:** M (5 pts) | **Module:** Performance

### Current State
Indicators have no target values. Users enter raw data without knowing what constitutes "good" performance.

### Target State
Each indicator has an optional target_value and direction. Data entry form and PDF reports show target vs actual with color coding.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | IndicatorManager (admin settings) shows target_value and target_direction fields per indicator |
| AC-02 | target_value is a decimal (e.g., 100, 85.5) — only for number and percentage types |
| AC-03 | target_direction selects "higher_is_better" (ខ្ពស់ជាង = ល្អ) or "lower_is_better" (ទាបជាង = ល្អ) |
| AC-04 | Performance data entry table shows target value next to each indicator input |
| AC-05 | Actual value cell color-coded: green background if target met/exceeded, red if below target |
| AC-06 | Percentage indicators: actual >= target → green (for higher_is_better); actual <= target → green (for lower_is_better) |
| AC-07 | Number indicators: same comparison logic based on direction |
| AC-08 | Binary indicators: target N/A (no target concept for yes/no) |
| AC-09 | PDF report includes target column and color-coded actual values |

### Backend Changes

**File: `internal/models/performance.go`**
- Add `TargetValue *float64` and `TargetDirection *string` to `PerformanceIndicator`
- Add `TargetValue *float64` and `TargetDirection *string` to `PerformanceIndicatorRequest`

**File: `internal/handler/performance.go`**
- Indicator CRUD handlers: accept and return target fields
- Full domain tree response already includes indicators — ensure target fields are returned

### Frontend Changes

**File: `src/pages/settings/IndicatorManager.jsx`**
- Add target_value number input (conditional: only for number/percentage types)
- Add target_direction radio/select (higher_is_better / lower_is_better)

**File: `src/components/PerformanceForm.jsx`**
- Show target value in a smaller label below each indicator input
- Apply CSS class `bg-green-50` or `bg-red-50` based on target comparison
- Add target column in the indicator grid

**File: `src/config/performanceIndicators.js`**
- Color utility: `getTargetColor(actual, target, direction)`

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Set target=100, direction=higher_is_better, enter 120 | Cell shows green background |
| T-02 | Set target=100, direction=higher_is_better, enter 80 | Cell shows red background |
| T-03 | Set target=50, direction=lower_is_better, enter 30 | Cell shows green background |
| T-04 | Set target=50, direction=lower_is_better, enter 70 | Cell shows red background |
| T-05 | No target set | Cell shows neutral/no color coding |
| T-06 | Binary indicator | Target fields hidden; no color coding |
| T-07 | PDF report includes targets | Target column shown with color-coded actuals |

---

## ENH-PRF-02 — Performance Data Validation Rules

**Priority:** P0 | **Effort:** M (5 pts) | **Module:** Performance

### Current State
Only percentage indicators cap at 0–100. Number indicators have no bounds.

### Target State
Number indicators support optional min_value and max_value. Client-side and server-side enforce these bounds on save.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | IndicatorManager allows setting min_value and max_value for number-type indicators |
| AC-02 | Data entry form enforces min/max: input shows inline validation error "តម្លៃអប្បបរមា X" / "តម្លៃអតិបរមា Y" |
| AC-03 | Server-side validation on POST /data and POST /data/bulk rejects values out of range |
| AC-04 | Server returns specific error message: "តម្លៃសម្រាប់ [indicator_name] ត្រូវតែចន្លោះ X ដល់ Y" |
| AC-05 | Percentage indicators auto-enforce 0–100 range |
| AC-06 | min_value must be less than max_value (server-side check on indicator save) |

### Backend Changes

**File: `internal/models/performance.go`**
- Add `MinValue *float64` and `MaxValue *float64` to `PerformanceIndicator` and request DTO

**File: `internal/handler/performance.go`**
- Indicator CRUD: validate min < max if both set
- Data create/bulk: for each value, check against indicator's min/max

**File: `internal/service/performance_service.go`** (new or existing)
```go
func ValidateIndicatorValue(indicator *PerformanceIndicator, value float64) error {
    if indicator.DataType == "percentage" {
        if value < 0 || value > 100 {
            return fmt.Errorf("ភាគរយត្រូវតែចន្លោះ 0 ដល់ 100")
        }
    }
    if indicator.MinValue != nil && value < *indicator.MinValue {
        return fmt.Errorf("តម្លៃត្រូវតែធំជាងឬស្មើ %v", *indicator.MinValue)
    }
    if indicator.MaxValue != nil && value > *indicator.MaxValue {
        return fmt.Errorf("តម្លៃត្រូវតែតូចជាងឬស្មើ %v", *indicator.MaxValue)
    }
    return nil
}
```

### Frontend Changes

**File: `src/pages/settings/IndicatorManager.jsx`**
- Add min_value and max_value number inputs (shown only for data_type=number)
- Inline validation: min must be < max

**File: `src/components/PerformanceForm.jsx`**
- Set `min` and `max` HTML attributes on number inputs when bounds are defined
- Show inline error tooltip below input when value out of range
- Disable save button while validation errors exist

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Indicator min=0, max=100, enter 50 | Accepted |
| T-02 | Same indicator, enter -5 | Client-side validation error |
| T-03 | Same indicator, API sends 150 | Server returns 400 with Khmer error message |
| T-04 | Set min=100, max=50 | Server rejects indicator update |
| T-05 | Percentage indicator, enter 120 | Client and server both reject |
| T-06 | No min/max set | Any value accepted |

---

## ENH-PRF-03 — Submission Status Workflow

**Priority:** P1 | **Effort:** M (5 pts) | **Module:** Performance

### Current State
Performance data is live immediately upon save. No review/approval workflow.

### Target State
Zone+period submissions have a status: `draft → submitted → approved → rejected`. Data entry saves as draft; user explicitly submits for review; approver approves or rejects with reason.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | Performance data save creates/updates data as `draft` status |
| AC-02 | A "ដាក់ស្នើ" (Submit) button on the data entry form changes status to `submitted` |
| AC-03 | Submitted data becomes read-only for the creator |
| AC-04 | Admin/chief-level users see "Approve" and "Reject" buttons on submissions list |
| AC-05 | Rejection requires a reason text |
| AC-06 | Rejected submissions are editable again (status returns to `draft`) |
| AC-07 | Submission list shows status badges with colors: draft (gray), submitted (blue), approved (green), rejected (red) |
| AC-08 | `performance_data` table gets a `status` column at the row level; or a new `performance_submissions` table tracking zone+period status |

### Backend Changes

**Database:**
```sql
-- Option A: Add status per data row (simpler)
ALTER TABLE performance_data ADD COLUMN status TEXT DEFAULT 'draft'
  CHECK (status IN ('draft','submitted'));

-- Option B: New submission-level table (cleaner, recommended)
CREATE TABLE performance_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id VARCHAR(8) NOT NULL REFERENCES geographic_zones(zone_code),
  period_id UUID NOT NULL REFERENCES performance_periods(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','rejected')),
  rejection_reason TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (zone_id, period_id)
);
```

**File: `internal/handler/performance.go`**
- New endpoints:
  - `POST /api/performance/submissions` — upsert submission status
  - `PUT /api/performance/submissions/:id/submit` — draft → submitted
  - `PUT /api/performance/submissions/:id/approve` — submitted → approved
  - `PUT /api/performance/submissions/:id/reject` — submitted → rejected (with reason)
- Data write endpoint: create submission record on first save (status=draft)

### Frontend Changes

**File: `src/components/PerformanceForm.jsx`**
- Add "ដាក់ស្នើ" button at bottom of form (visible when status = draft)
- After submit, form becomes read-only

**File: `src/components/PerformanceList.jsx`**
- Add status badge column
- Add "Approve" / "Reject" buttons for admin/chief users
- Rejection modal with reason textarea

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Save data, click "ដាក់ស្នើ" | Status changes to "submitted", form locks |
| T-02 | Admin approves submission | Badge turns green, data locked permanently |
| T-03 | Admin rejects with reason | Badge turns red, form editable again |
| T-04 | Non-admin tries to approve | Button not shown / API returns 403 |
| T-05 | Submit without data | Validation error: "មិនមានទិន្នន័យសម្រាប់ដាក់ស្នើ" |

---

## ENH-PRF-04 — Multi-Period Comparison View

**Priority:** P1 | **Effort:** L (8 pts) | **Module:** Performance

### Current State
Only one period's data is visible at a time.

### Target State
Compare a zone's performance across two selected periods side-by-side with delta and trend indicators.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | Performance page has a "ប្រៀបធៀប" (Compare) tab |
| AC-02 | User selects one zone + two periods to compare |
| AC-03 | Table renders: Domain | Sub-Domain | Indicator | Period A Value | Period B Value | Δ (Delta) | Trend |
| AC-04 | Delta column shows absolute change (B − A) |
| AC-05 | Trend column shows ↑ (improved), ↓ (declined), → (unchanged) icons based on indicator target_direction where available, else absolute delta |
| AC-06 | Positive delta + higher_is_better target = ↑ green |
| AC-07 | Negative delta + higher_is_better target = ↓ red |
| AC-08 | Periods with status=approved only, or allow filter by status |

### Backend Changes

**File: `internal/handler/performance.go`**
- New endpoint: `GET /api/performance/data/compare?zone_id=X&period_a=Y&period_b=Z`
- Fetch data for both periods, merge by indicator_id, compute delta
- Return enriched structure:

```json
{
  "zone": { "zone_code": "...", "name_kh": "..." },
  "period_a": { "id": "...", "label_kh": "..." },
  "period_b": { "id": "...", "label_kh": "..." },
  "indicators": [
    {
      "indicator": { ... },
      "domain_name_kh": "...",
      "sub_domain_name_kh": "...",
      "value_a": 85.5,
      "value_b": 92.0,
      "delta": 6.5,
      "trend": "improved"
    }
  ]
}
```

### Frontend Changes

**File: `src/components/PerformanceCompare.jsx`** (new)
- Tab "ប្រៀបធៀប" in performance page
- Zone selector (commune level)
- Two period dropdowns
- Comparison table with color-coded delta/trend cells

**File: `src/api/performance.js`**
- `comparePerformance(zoneId, periodA, periodB)`

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Compare two periods with data | Table shows both values, delta, trend |
| T-02 | Indicator has no data in period B | Show "—" for value_b and delta |
| T-03 | All indicators improved | All trends show ↑ green |
| T-04 | Mix of improved/declined | Correct color coding per indicator |
| T-05 | Select same period for A and B | Delta = 0, trend = → |

---

## ENH-PRF-05 — Copy from Previous Period

**Priority:** P0 | **Effort:** S (3 pts) | **Module:** Performance

### Current State
Each new submission starts with all blank indicator values.

### Target State
When creating a new submission, offer a "ចម្លងទិន្នន័យពីរយៈពេលមុន" button that pre-fills all indicator values from the most recent submission for the same zone.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | In create mode, after selecting zone and period, a "ចម្លងទិន្នន័យពីរយៈពេលមុន" button appears |
| AC-02 | Clicking the button fetches the most recent approved/submitted submission for the same zone |
| AC-03 | All indicator values are pre-filled in the data entry table |
| AC-04 | User can still modify any pre-filled value before saving |
| AC-05 | A success toast: "បានចម្លងទិន្នន័យពី [period_label]" |
| AC-06 | If no previous submission exists, button is disabled with tooltip "មិនមានទិន្នន័យពីរយៈពេលមុន" |
| AC-07 | Target comparison colors update after copy (if targets are set) |

### Backend Changes

No new backend endpoints needed beyond the existing `GET /api/performance/data`. The frontend fetches data for the previous period and pre-fills locally.

### Frontend Changes

**File: `src/components/PerformanceForm.jsx`**
- After zone + period selected, determine previous period
- Add "ចម្លងទិន្នន័យពីរយៈពេលមុន" button
- On click: fetch data for same zone + previous period, map values to current form state
- Disable button if no previous data found
- Toast notification on successful copy

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Copy from Q1 to Q2 | All Q1 values pre-filled in Q2 form |
| T-02 | Modify a pre-filled value | Changed value saved, not overwritten |
| T-03 | No previous submission | Button disabled with tooltip |
| T-04 | Previous submission exists but for a different period | Period correctly identified by sort_order |

---

## ENH-PDF-01 — Background / Async PDF Generation

**Priority:** P0 | **Effort:** L (8 pts) | **Module:** PDF Generation

### Current State
PDF generation runs synchronously on the request thread. Large performance reports timeout or block the server.

### Target State
Move PDF rendering to an async background job. API returns a job ID immediately. Frontend polls for completion and triggers download when ready.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | `GET /api/reports/performance/:zone/:period` and `GET /api/report-documents/:id/pdf` accept `?async=true` param |
| AC-02 | With `async=true`, endpoint returns `{ job_id: UUID, status: "queued" }` immediately (HTTP 202) |
| AC-03 | Without `async=true` (or for small reports), behavior is unchanged (synchronous) |
| AC-04 | PDF jobs stored in `pdf_jobs` table: id, type (report_document/performance/member_list), reference_id, status (queued/processing/done/failed), result_path, error_message, timestamps |
| AC-05 | Frontend polls `GET /api/pdf/jobs/:job_id` every 2 seconds |
| AC-06 | When status = "done", frontend triggers download via `GET /api/pdf/jobs/:job_id/download` |
| AC-07 | When status = "failed", frontend shows error message with retry button |
| AC-08 | Background goroutine pool processes jobs (limit: 2 concurrent Chromium instances) |
| AC-09 | Jobs older than 24 hours with status "done" are cleaned up |
| AC-10 | Show a progress overlay: "កំពុងបង្កើត PDF... (X%)" |

### Backend Changes

**Database:**
```sql
CREATE TABLE pdf_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('report_document','performance','member_list')),
  reference_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','done','failed')),
  result_path TEXT,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

**File: `internal/pdf/job.go`** (new package)
```go
type JobQueue struct {
    jobs     chan Job
    semaphore chan struct{} // max 2 concurrent
    store    *supabase.Client
}

func NewJobQueue(store *supabase.Client) *JobQueue {
    return &JobQueue{
        jobs:     make(chan Job, 100),
        semaphore: make(chan struct{}, 2),
        store:    store,
    }
}

func (q *JobQueue) Enqueue(job Job) (string, error) {
    // Insert into pdf_jobs, then push to channel
}

func (q *JobQueue) worker() {
    for job := range q.jobs {
        q.semaphore <- struct{}{}
        go func(j Job) {
            defer func() { <-q.semaphore }()
            q.processJob(j)
        }(job)
    }
}
```

**File: `internal/handler/report.go`** and `internal/handler/report_document.go`
- Add async path: create job, enqueue, return 202 with job_id
- Sync path: unchanged

**File: `internal/handler/pdf_job.go`** (new)
- `GET /api/pdf/jobs/:id` — return job status
- `GET /api/pdf/jobs/:id/download` — serve generated PDF

**File: `cmd/api/main.go`**
- Initialize `JobQueue`, start worker goroutines

### Frontend Changes

**File: `src/utils/pdfDownload.js`** (new)
```js
export async function downloadPdfAsync(fetchUrl) {
  // 1. POST/GET URL + ?async=true → get job_id
  // 2. Poll every 2s until done
  // 3. Trigger download
}
```

**File: `src/components/reports/ReportDetail.jsx`**
- Use `downloadPdfAsync()` for report PDF download
- Show progress overlay

**File: `src/components/PerformanceForm.jsx`**
- Use `downloadPdfAsync()` for performance PDF download
- Show progress overlay

**File: `src/components/pdf/ProgressOverlay.jsx`** (new)
- Modal overlay showing "កំពុងបង្កើត PDF...", elapsed time, cancel button

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Request PDF async | Returns 202 with job_id immediately |
| T-02 | Poll job status | Returns status and eventual completion |
| T-03 | Download completed job | PDF file served with correct headers |
| T-04 | Job fails (e.g., Chromium crash) | Status = failed, error message returned |
| T-05 | Two concurrent requests | Both processed (within 2-concurrent limit) |
| T-06 | Sync mode (no async param) | Behaves as before (direct PDF response) |

---

## ENH-PDF-02 — PDF Generation Progress Indicator

**Priority:** P1 | **Effort:** M (5 pts) | **Module:** PDF Generation

### Current State
No feedback during PDF generation. User sees a loading spinner indefinitely.

### Target State
Show a progress indicator with status text and elapsed time during generation. For synchronous generation, show "កំពុងបង្កើត PDF..." with a spinning animation.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | Sync PDF generation: loading overlay with "កំពុងបង្កើត PDF..." text and spinner |
| AC-02 | Async PDF generation: progress overlay with "កំពុងបង្កើត PDF... (ជាជួរ)" then "កំពុងបង្កើត PDF..." |
| AC-03 | Overlay shows elapsed time: "កំពុងបង្កើត PDF... (១២ វិនាទី)" |
| AC-04 | If generation takes >30s, show "កំពុងបង្កើត PDF... សូមរង់ចាំបន្តិច" |
| AC-05 | Cancel button on async generation overlay |
| AC-06 | Overlay blocks interaction with the page behind it |

### Frontend Changes

**File: `src/components/pdf/ProgressOverlay.jsx`** (new)
```jsx
export default function ProgressOverlay({ status, elapsed, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl text-center min-w-[320px]">
        <Spinner className="w-12 h-12 mx-auto mb-4 text-blue-600" />
        <p className="text-lg font-kantumruy mb-2">
          {status === 'queued' ? 'កំពុងរង់ចាំជួរ...' : 'កំពុងបង្កើត PDF...'}
        </p>
        <p className="text-sm text-gray-500 font-kantumruy">
          {formatElapsed(elapsed)}
        </p>
        {status === 'queued' && (
          <button onClick={onCancel} className="mt-4 text-sm text-red-600">
            បោះបង់
          </button>
        )}
      </div>
    </div>
  );
}
```

**File: `src/components/reports/ReportDetail.jsx`** and `src/components/PerformanceForm.jsx`
- Integrate `ProgressOverlay` for both sync and async PDF downloads
- Replace existing simple spinner

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Generate small report PDF | Overlay shown with spinner, disappears on completion |
| T-02 | Generate large performance PDF async | Overlay shows queued → generating → done states |
| T-03 | Click cancel during async queued state | Job cancelled, overlay closes |
| T-04 | Generation exceeds 30s | Text changes to "សូមរង់ចាំបន្តិច" |
| T-05 | Elapsed time counter | Timer increments every second in Khmer numerals |

---

## ENH-PDF-03 — PDF Metadata Embedding

**Priority:** P1 | **Effort:** S (3 pts) | **Module:** PDF Generation

### Current State
Generated PDFs have no metadata (title, author, creation date).

### Target State
Embed document metadata in generated PDFs for archival and searchability.

### Acceptance Criteria

| # | Criteria |
|---|----------|
| AC-01 | Report PDFs include: title (from report title), author (creator's full_name), creation date |
| AC-02 | Performance PDFs include: title ("របាយការណ៍លទ្ធផលការងារ - [zone_name] [period_label]"), author, creation date |
| AC-03 | Member list PDFs include: title, author, creation date |
| AC-04 | Metadata embedded in PDF Info dictionary (visible in PDF readers under File → Properties) |

### Backend Changes

**File: `internal/services/report.go`**
- Chromedp `page.PrintToPDF()` does not directly support metadata. Instead, inject `<meta>` tags in the HTML `<head>` before rendering:
  ```html
  <meta name="title" content="Report Title">
  <meta name="author" content="Author Name">
  <meta name="date" content="2026-08-03">
  ```

**Alternative approach:** Post-process PDFs with a Go PDF library to inject metadata. However, injecting `<meta>` tags into the Chromium-rendered HTML is acceptable for Phase 1.

**File: Templates (Go HTML templates)**
- Add metadata placeholders in report/performance/member templates

### Frontend Changes

None — backend-only change.

### Test Cases

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Download report PDF | PDF properties show correct title and author |
| T-02 | Download performance PDF | PDF properties show zone and period in title |
| T-03 | Download member list PDF | PDF properties show correct metadata |

---

## API Contract Summary — New Endpoints

| Method | Path | Enhancement | Feature |
|--------|------|-------------|---------|
| `PUT` | `/api/report-documents/:id/restore` | ENH-RPT-04 | `reports` |
| `POST` | `/api/report-templates/:id/duplicate` | ENH-TPL-04 | `reports` |
| `POST` | `/api/performance/submissions` | ENH-PRF-03 | `performance` |
| `PUT` | `/api/performance/submissions/:id/submit` | ENH-PRF-03 | `performance` |
| `PUT` | `/api/performance/submissions/:id/approve` | ENH-PRF-03 | `performance` |
| `PUT` | `/api/performance/submissions/:id/reject` | ENH-PRF-03 | `performance` |
| `GET` | `/api/performance/data/compare` | ENH-PRF-04 | `performance` |
| `GET` | `/api/pdf/jobs/:id` | ENH-PDF-01 | `reports` |
| `GET` | `/api/pdf/jobs/:id/download` | ENH-PDF-01 | `reports` |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/api/report-documents` | + `?category`, `?zone_code`, `?search`, `?trash` params |
| `DELETE` | `/api/report-documents/:id` | Soft delete (sets deleted_at) |
| `GET` | `/api/report-documents/:id/pdf` | + `?async=true` param |
| `POST` | `/api/report-templates` | + file validation |
| `POST` | `/api/report-templates/:id/fill` | Response now includes `preview_html` |
| `GET` | `/api/reports/performance/:zone/:period` | + `?async=true` param |
| `POST`/`PUT` | `/api/performance/data` and `/data/bulk` | + validation against min/max/target |
| `POST`/`PUT` | `/api/performance/indicators` | + `target_value`, `target_direction`, `min_value`, `max_value` |

---

## New Database Objects

### Tables

```sql
-- ENH-PRF-03
CREATE TABLE performance_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id VARCHAR(8) NOT NULL REFERENCES geographic_zones(zone_code),
  period_id UUID NOT NULL REFERENCES performance_periods(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','rejected')),
  rejection_reason TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (zone_id, period_id)
);

-- ENH-PDF-01
CREATE TABLE pdf_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('report_document','performance','member_list')),
  reference_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','done','failed')),
  result_path TEXT,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### Indexes

```sql
CREATE INDEX idx_performance_submissions_zone ON performance_submissions(zone_id);
CREATE INDEX idx_performance_submissions_period ON performance_submissions(period_id);
CREATE INDEX idx_pdf_jobs_status ON pdf_jobs(status);
CREATE INDEX idx_pdf_jobs_created_at ON pdf_jobs(created_at);
```

---

## New Frontend Files

| File | Purpose |
|------|---------|
| `src/utils/editorAutoSave.js` | ENH-RPT-05 — localStorage draft save/load/clear utilities |
| `src/utils/pdfDownload.js` | ENH-PDF-01 — async PDF job polling and download |
| `src/components/pdf/ProgressOverlay.jsx` | ENH-PDF-02 — PDF generation progress UI |
| `src/components/PerformanceCompare.jsx` | ENH-PRF-04 — multi-period comparison view |
| `src/components/reports/TemplatePreview.jsx` | ENH-TPL-01 — filled template preview panel |

---

## Sprint Planning Recommendations

### Sprint 1 (33 pts)

| Enhancement | Story | Pts | Depends On |
|-------------|-------|-----|------------|
| ENH-RPT-01 | Report categories | 3 | Migration |
| ENH-RPT-02 | Zone-scoped listing | 5 | Migration |
| ENH-RPT-04 | Soft delete | 3 | Migration |
| ENH-RPT-05 | Draft auto-save | 5 | ENH-RPT-01 |
| ENH-TPL-01 | Template preview | 5 | — |
| ENH-TPL-02 | Template validation | 3 | — |
| ENH-TPL-03 | Template categories | 2 | Migration |
| ENH-TPL-04 | Duplicate template | 3 | — |
| ENH-PRF-05 | Copy from previous period | 3 | — |

### Sprint 2 (33 pts)

| Enhancement | Story | Pts | Depends On |
|-------------|-------|-----|------------|
| ENH-RPT-03 | Content search | 5 | ENH-RPT-01, ENH-RPT-02 |
| ENH-PRF-01 | Indicator targets | 5 | Migration |
| ENH-PRF-02 | Validation rules | 5 | Migration |
| ENH-PRF-03 | Submission workflow | 5 | Migration |
| ENH-PRF-04 | Multi-period comparison | 8 | ENH-PRF-01 |
| ENH-PDF-03 | PDF metadata | 3 | — |
| ENH-PDF-02 | Progress indicator | 5 | ENH-PDF-01 |
| ENH-PDF-01 | Async PDF generation | 8 | (spans both sprints) |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 2026 | Initial Phase 1 implementation plan with 16 enhancements, full acceptance criteria, API contracts, implementation notes, test cases, and sprint planning |
