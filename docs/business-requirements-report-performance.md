# Business Requirements Document — Report Documents, Templates & Performance Management

**Project:** ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ (Cheung Prey District Management System)  
**Domain:** Document Generation, Templates & Performance Evaluation  
**Version:** 2.0  
**Last updated:** August 2026  

---

## 1. Overview

This document covers three interconnected modules:

| Module | Feature Flag | Khmer Label | Purpose |
|--------|-------------|-------------|---------|
| Report Documents | `reports` | របាយការណ៍ | Create, edit, and publish formal district/commune reports with rich text and PDF export |
| Report Templates | `reports` | គំរូរបាយការណ៍ | Upload, manage, and fill DOCX/HTML templates with structured data |
| Performance Management | `performance` | លទ្ធផលការងារ | Define evaluation criteria and enter performance data per zone per period |
| Performance Admin | `performance_admin` | គ្រប់គ្រង Performance | Configure evaluation domains, sub-domains, indicators, and reporting periods |

All three modules interact through a shared PDF generation pipeline powered by headless Chrome/Chromedp with Khmer Unicode font rendering.

---

## PART A — REPORT DOCUMENTS

### A.1 Entity Model

A report document represents a formal written report authored by commune or district officials.

#### A.1.1 Simple Report

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | Text | Yes | Report title |
| `description` | Text | No | Brief summary or abstract |
| `content` | HTML | Yes | Full body content authored in rich text editor |
| `status` | Enum | Yes | `draft` or `published` |
| `created_by` | UUID | Auto | FK to `auth.users` |

#### A.1.2 Full (Party/Political) Report

Extends the simple report with additional structured fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `party_name` | Text | No | Name of the political party |
| `province_name` | Text | No | Province name |
| `district_name` | Text | No | District name |
| `document_reference_number` | Text | No | Official reference number |
| `generation_date_khmer` | Text | No | Date of generation in Khmer calendar format |
| `report_month` | Integer | No | Reporting month (1–12) |
| `report_year` | Integer | No | Reporting year |
| `political_situation_summary` | Text | No | Narrative summary of political situation |
| `total_crimes` | Integer | No | Total crime count |
| `homicide` | Integer | No | Homicide count |
| `suicide` | Integer | No | Suicide count |
| `misdemeanor` | Integer | No | Misdemeanor count |
| `human_fatalities` | Integer | No | Human fatalities count |
| `property_damage_desc` | Text | No | Description of property damage |

### A.2 Business Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-RPT-01** | The system shall support creation of report documents with title, optional description, and rich-text HTML content. | P0 |
| **BR-RPT-02** | Users shall author report content using a Word-like rich text editor (TipTap) supporting: font families (Khmer + Latin), font sizes (pt), bold, italic, underline, strikethrough, subscript, superscript, text color, highlight color, text alignment (left/center/right/justify), bullet lists, ordered lists, blockquote, code blocks, hyperlinks, image insertion (URL or file upload, <5MB, converted to data URL), tables with row/column insertion and deletion, cell merge/split, border styling (style, width, color), indent/outdent, line height control, paragraph style presets, and clear formatting. | P0 |
| **BR-RPT-03** | The editor shall render HTML in read-only mode when viewing a report; in edit mode, the full toolbar shall be available. | P0 |
| **BR-RPT-04** | Image uploads in the editor shall be limited to 5 MB and converted to inline base64 data URIs. | P1 |
| **BR-RPT-05** | Report status shall follow the workflow: `draft` (authoring) → `published` (final, confirmed). | P0 |
| **BR-RPT-06** | Only users with role `district_chief` or higher may confirm a report (change status from `draft` to `published`). | P0 |
| **BR-RPT-07** | Other users may only create and edit reports in `draft` status. | P0 |
| **BR-RPT-08** | The system shall support duplication: copying an existing report's title, description, and content into a new draft. | P1 |
| **BR-RPT-09** | The report list view shall display KPI statistics: total reports, published count, draft count. | P0 |
| **BR-RPT-10** | The report list shall provide per-row actions: view, edit, duplicate, delete (with confirmation), confirm/publish, and PDF download. | P0 |
| **BR-RPT-11** | Role-based action visibility: `district_chief` and above shall see confirm + download; other users shall see full CRUD without confirm. | P0 |
| **BR-RPT-12** | Reports shall be downloadable as PDF with Khmer font rendering. | P0 |
| **BR-RPT-13** | The full (party/political) report variant shall capture structured crime statistics and political situation summaries alongside the rich-text content. | P2 |

### A.3 Report Document API Endpoints

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| POST | `/api/report-documents/simple` | `reports` | Create simple report (title, description, content) |
| PUT | `/api/report-documents/:id/simple` | `reports` | Update simple report |
| POST | `/api/report-documents` | `reports` | Create full party/political report |
| GET | `/api/report-documents` | `reports` | List all report documents |
| GET | `/api/report-documents/:id` | `reports` | Get report by ID |
| PUT | `/api/report-documents/:id` | `reports` | Update full report |
| PUT | `/api/report-documents/:id/status` | `reports` | Confirm/publish report |
| DELETE | `/api/report-documents/:id` | `reports` | Delete report |
| GET | `/api/report-documents/:id/pdf` | `reports` | Download report as PDF |

---

## PART B — REPORT TEMPLATES

### B.1 Entity Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | Text | Yes | Template display name |
| `description` | Text | No | Template description |
| `format` | Enum | Yes | `docx` or `html` |
| `file_name` | Text | Yes | Original uploaded filename |
| `file_size` | Integer | Auto | File size in bytes |
| `storage_path` | Text | Auto | Path in Supabase Storage (`report-templates` bucket) |
| `content` | Text | No | Template content (for HTML templates) |
| `keys` | Text[] | Auto/Manual | Array of placeholder keys extracted from template |
| `created_by` | UUID | Auto | FK to `auth.users` |

### B.2 Template Placeholder System

Templates use `{{placeholder_name}}` syntax. The system supports:

| Pattern | Behavior |
|---------|----------|
| `{{key}}` | Simple string substitution |
| `{{#each list_key}}...{{/each}}` | Loop block iterating over array data |
| `{{index}}` | Auto-incrementing index inside `{{#each}}` blocks |

Placeholders are automatically extracted from:
- **DOCX files**: parsed from `word/document.xml` inside the ZIP archive
- **HTML files**: regex-extracted from the raw content

### B.3 Template Filling Pipeline

```
[Upload DOCX/HTML template]
       ↓
[Extract placeholder keys] → stored in template.keys[]
       ↓
[User provides JSON payload with key→value mappings]
       ↓
[POST /fill] → server replaces placeholders
       ↓
For DOCX: parses word/document.xml, substitutes with XML-safe values,
          preserves WordprocessingML formatting, re-embeds images from media/
For HTML: simple string replacement with proper escaping
       ↓
[Filled document uploaded to Supabase Storage] → download URL returned
```

### B.4 Business Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-TPL-01** | Users shall upload DOCX and HTML files as templates via multipart form data. | P0 |
| **BR-TPL-02** | The system shall automatically extract `{{placeholder}}` keys from uploaded templates. | P0 |
| **BR-TPL-03** | Users shall be able to manually add placeholder keys to an existing template. | P1 |
| **BR-TPL-04** | The system shall fill templates with a JSON payload: simple substitution, `{{#each}}` loop blocks, and `{{index}}` auto-increment. | P0 |
| **BR-TPL-05** | DOCX template filling shall preserve all WordprocessingML formatting (fonts, sizes, bold, italic, underline, colors, alignment, tables, page breaks). | P1 |
| **BR-TPL-06** | Embedded images in DOCX templates shall be preserved and re-embedded in the filled output document. | P1 |
| **BR-TPL-07** | Filled documents shall be downloadable as the original format (DOCX stays DOCX; HTML stays HTML). | P0 |
| **BR-TPL-08** | Users shall download the original (unfilled) template file. | P1 |
| **BR-TPL-09** | Templates shall be stored in Supabase Storage (`report-templates` bucket), with the bucket auto-created on application startup if missing. | P0 |
| **BR-TPL-10** | Users shall be able to list, view, update, and delete templates. | P0 |

### B.5 Report Templates API Endpoints

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| GET | `/api/report-templates` | `reports` | List all templates |
| POST | `/api/report-templates` | `reports` | Upload new template (multipart: name, description, format, file/content) |
| GET | `/api/report-templates/:id` | `reports` | Get template metadata |
| PUT | `/api/report-templates/:id` | `reports` | Update template metadata |
| GET | `/api/report-templates/:id/download` | `reports` | Download template file |
| DELETE | `/api/report-templates/:id` | `reports` | Delete template |
| POST | `/api/report-templates/:id/fill` | `reports` | Fill template with JSON payload, return filled document |
| POST | `/api/report-templates/:id/keys` | `reports` | Add a placeholder key to template |

---

## PART C — PERFORMANCE MANAGEMENT

### C.1 Domain Model

Performance evaluation uses a 3-level hierarchy:

```
Performance Domain (e.g., "Economic Development")
  └── Performance Sub-Domain (e.g., "Agriculture")
        ├── Indicator (e.g., "Rice Yield")       — data_type: number
        ├── Indicator (e.g., "Irrigation Coverage") — data_type: percentage
        └── Indicator (e.g., "Cooperative Formed")  — data_type: binary
```

#### C.1.1 Performance Domain

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | Text | Yes (unique) | Domain code |
| `name_kh` | Text | Yes | Khmer name |
| `name_en` | Text | No | English name |
| `sort_order` | Integer | No | Display ordering |

#### C.1.2 Performance Sub-Domain

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domain_id` | UUID | Yes | FK to parent domain |
| `code` | Text | Yes | Code (unique per domain) |
| `name_kh` | Text | Yes | Khmer name |
| `name_en` | Text | No | English name |
| `sort_order` | Integer | No | Display ordering |

#### C.1.3 Performance Indicator

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sub_domain_id` | UUID | Yes | FK to parent sub-domain |
| `code` | Text | Yes | Code (unique per sub-domain) |
| `name_kh` | Text | Yes | Khmer name |
| `name_en` | Text | No | English name |
| `data_type` | Enum | Yes | `number`, `percentage`, or `binary` |
| `unit_kh` | Text | Conditional | Unit label in Khmer (for number type) |
| `unit_en` | Text | Conditional | Unit label in English (for number type) |
| `sort_order` | Integer | No | Display ordering |

#### C.1.4 Performance Period

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label_kh` | Text | Yes | Khmer period label (rendered with Khmer numerals) |
| `label_en` | Text | No | English period label |
| `start_date` | Date | Yes | Period start date |
| `end_date` | Date | Yes | Period end date |
| `sort_order` | Integer | No | Chronological ordering |

#### C.1.5 Performance Data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | FK | Yes | FK to `geographic_zones` |
| `indicator_id` | FK | Yes | FK to `performance_indicators` |
| `period_id` | FK | Yes | FK to `performance_periods` |
| `value_number` | Decimal | Conditional | Numeric value (for `number` type) |
| `value_percentage` | Decimal | Conditional | Percentage value 0–100 (for `percentage` type) |
| `value_binary` | Boolean | Conditional | Yes/No (for `binary` type) |
| `created_by` | UUID | Auto | FK to `auth.users` |

Unique constraint: `(zone_id, indicator_id, period_id)` — one value per indicator per zone per period.

### C.2 Performance Data Entry Workflow

```
[Select Zone: Province → District → Commune]   (autocomplete cascade)
       +
[Select Reporting Period]
       ↓
[Fetch full domain tree]  GET /performance/domains/full
       ↓
[Dynamic table renders]
  ┌──────────────┬──────────────┬──────────────────────┐
  │ Domain       │ Sub-Domain   │ Indicators (columns) │
  ├──────────────┼──────────────┼──────────────────────┤
  │ Economic Dev │ Agriculture  │ [number input] [binary toggle] │
  │              │ Irrigation   │ [percentage input]   │
  └──────────────┴──────────────┴──────────────────────┘
       ↓
[User enters values] → POST /performance/data/bulk (upsert)
       ↓
[View/Edit existing submission] or [Download PDF Report]
```

### C.3 Indicator Input Behavior by Data Type

| Data Type | Input Control | Constraints |
|-----------|--------------|-------------|
| `number` | Number input | Numeric value, displayed with unit label |
| `percentage` | Number input | 0–100 range enforced, percentage sign appended |
| `binary` | Toggle buttons | បាន/មាន (Yes) or មិនបាន/គ្មាន (No) |

### C.4 Business Requirements

#### C.4.1 Performance Configuration (Admin)

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-PRF-01** | Admin users with `performance_admin` shall manage domains, sub-domains, indicators, and periods via CRUD operations. | P0 |
| **BR-PRF-02** | Domain codes shall be unique across all domains. | P0 |
| **BR-PRF-03** | Sub-domain codes shall be unique within their parent domain. | P0 |
| **BR-PRF-04** | Indicator codes shall be unique within their parent sub-domain. | P0 |
| **BR-PRF-05** | Indicator data type shall be one of: `number`, `percentage`, or `binary`. | P0 |
| **BR-PRF-06** | `number` and `percentage` indicators may have optional Khmer and English unit labels. | P1 |
| **BR-PRF-07** | Reporting periods shall have start date, end date, and bilingual labels. Period labels shall render in Khmer format with Khmer digit numerals (e.g., "ខែមករា–មីនា ២០២៦"). | P0 |
| **BR-PRF-08** | All four entity types shall be sortable by `sort_order`. | P1 |

#### C.4.2 Performance Data Entry

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-PRF-09** | Users with `performance` feature shall enter performance data for a zone + period combination. | P0 |
| **BR-PRF-10** | Zone selection shall use a cascading autocomplete: Province → District → Commune. | P0 |
| **BR-PRF-11** | The full domain tree (domains → sub-domains → indicators) shall load in a single API call for the data entry form. | P0 |
| **BR-PRF-12** | All indicators across all domains shall render in a single scrollable table for efficient data entry. | P0 |
| **BR-PRF-13** | Data entry shall support both single (`POST /data`) and bulk (`POST /data/bulk`) upsert operations. | P0 |
| **BR-PRF-14** | If data already exists for a zone+period+indicator combination, it shall be updated (upsert). | P0 |
| **BR-PRF-15** | Percentage indicator inputs shall enforce a 0–100 range. | P0 |
| **BR-PRF-16** | Binary indicators shall use mutually exclusive Yes/No toggle buttons with Khmer labels. | P0 |
| **BR-PRF-17** | Users shall view a read-only summary of previously submitted data for a zone+period. | P0 |
| **BR-PRF-18** | Users shall edit existing submissions (pre-filled form with current values). | P0 |
| **BR-PRF-19** | Users shall delete individual data entries or all data for a zone+period combination (with confirmation). | P1 |
| **BR-PRF-20** | The submissions list shall display: zone name, period label, indicator count, with view/edit/delete/PDF actions. | P0 |
| **BR-PRF-21** | Submissions list shall be filterable by commune and period. | P0 |

#### C.4.3 Performance PDF Report

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-PRF-22** | The system shall generate a performance report PDF for a given zone + period. | P0 |
| **BR-PRF-23** | The PDF shall use landscape A4 layout with Khmer font rendering (Kantumruy Pro, Battambang). | P0 |
| **BR-PRF-24** | The report shall display all domains, sub-domains, and their indicator values organized hierarchically. | P0 |
| **BR-PRF-25** | The report shall be generated server-side via Chromedp and downloaded as a PDF blob in the browser. | P0 |

### C.5 Performance API Endpoints

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| GET | `/api/performance/domains` | `performance` | List performance domains |
| GET | `/api/performance/domains/full` | `performance` | Get full hierarchical tree (domains → sub-domains → indicators) |
| GET | `/api/performance/domains/:id/sub-domains` | `performance` | List sub-domains for a domain |
| GET | `/api/performance/sub-domains/:id/indicators` | `performance` | List indicators for a sub-domain |
| GET | `/api/performance/indicators` | `performance` | List all indicators |
| GET | `/api/performance/periods` | `performance` | List all reporting periods |
| POST | `/api/performance/data` | `performance` | Upsert single performance data entry |
| POST | `/api/performance/data/bulk` | `performance` | Bulk upsert performance data |
| GET | `/api/performance/data` | `performance` | Get performance data for zone_id + period_id |
| GET | `/api/performance/data/submissions` | `performance` | List submission summaries (zone + period) |
| DELETE | `/api/performance/data/:id` | `performance` | Delete single data entry |
| DELETE | `/api/performance/data` | `performance` | Delete all data for zone + period |
| POST | `/api/performance/domains` | `performance_admin` | Create domain (admin) |
| PUT | `/api/performance/domains/:id` | `performance_admin` | Update domain (admin) |
| DELETE | `/api/performance/domains/:id` | `performance_admin` | Delete domain (admin) |
| POST | `/api/performance/sub-domains` | `performance_admin` | Create sub-domain (admin) |
| PUT | `/api/performance/sub-domains/:id` | `performance_admin` | Update sub-domain (admin) |
| DELETE | `/api/performance/sub-domains/:id` | `performance_admin` | Delete sub-domain (admin) |
| POST | `/api/performance/indicators` | `performance_admin` | Create indicator (admin) |
| PUT | `/api/performance/indicators/:id` | `performance_admin` | Update indicator (admin) |
| DELETE | `/api/performance/indicators/:id` | `performance_admin` | Delete indicator (admin) |
| POST | `/api/performance/periods` | `performance_admin` | Create period (admin) |
| PUT | `/api/performance/periods/:id` | `performance_admin` | Update period (admin) |
| DELETE | `/api/performance/periods/:id` | `performance_admin` | Delete period (admin) |
| GET | `/api/reports/performance/:zone_id/:period_id` | `performance` | Generate performance PDF report |

---

## PART D — PDF GENERATION PIPELINE (Shared)

The PDF generation pipeline serves all three modules: report documents, performance reports, and member list reports.

### D.1 Rendering Pipeline

```
[Go template] + [data] → temporary HTML file
                            ↓
[Headless Chrome/Chromium] → navigates to file:// URL
                            ↓
[Wait for fonts & layout] → page.PrintToPDF()
                            ↓
[PDF buffer] → HTTP response (application/pdf)
```

### D.2 Chromium Configuration

| Setting | Value |
|---------|-------|
| Chromium path | `CHROME_PATH` env var → system paths (`/usr/bin/chromium-browser`, `/Applications/Google Chrome.app/...`) → `PATH` lookup |
| Headless mode | Yes (default Chromedp mode) |
| Font directory | Copied from `fonts/` to OS temp directory on each render |

### D.3 Supported Fonts

| Font | Format | Usage |
|------|--------|-------|
| Kantumruy Pro | TTF | Primary Khmer font (via Google Fonts) |
| Battambang | TTF | Fallback Khmer font (bold + regular) |
| Noto Sans Khmer | System | Fallback for Chromium Docker runtime |
| Other Khmer fonts | System | Moul, Siemreap, Content, Suwannaphum, Dangrek (available in browser but not embedded in PDF) |

### D.4 PDF Rendering Parameters

| Parameter | Report Documents | Performance Reports | Member Reports |
|-----------|-----------------|-------------------|----------------|
| Page size | A4 portrait | A4 landscape | A4 landscape |
| Page numbers | Optional ("ទំព័រ X" footer) | No | No |
| Khmer font embedding | `@font-face` with `file://` URLs to temp dir | Same | Same |
| HTML source | User-authored rich text content | Go template with performance data table | Go template with member table |

### D.5 Business Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-PDF-01** | All PDFs shall render Khmer Unicode text correctly (no tofu/missing glyphs). | P0 |
| **BR-PDF-02** | Fonts shall be embedded via `@font-face` declarations pointing to local TTF files accessible to the Chromium renderer. | P0 |
| **BR-PDF-03** | The system shall auto-detect the Chrome/Chromium binary path across macOS, Linux (Docker), and Render PaaS environments. | P0 |
| **BR-PDF-04** | PDF generation shall support both portrait A4 (reports, documents) and landscape A4 (performance tables, member lists). | P0 |
| **BR-PDF-05** | Report documents shall optionally include page numbers in Khmer format. | P1 |
| **BR-PDF-06** | The Docker image shall include Chromium and Khmer system fonts (`font-noto-khmer` on Alpine). | P0 |
| **BR-PDF-07** | PDF responses shall be streamed with `Content-Type: application/pdf` and `Content-Disposition: attachment` headers. | P0 |

---

## PART E — FRONTEND PAGE STRUCTURE

### E.1 Report Pages

| Route | Component | Mode |
|-------|-----------|------|
| `/reports` | `ReportList` | List view with KPI stats, filterable table, action buttons |
| `/reports/create` | `ReportCreateForm` | Rich text editor, blank report |
| `/reports/create-template` | `ReportCreateFromTemplate` | Template selector → fill form → generate report |
| `/reports/:id` | `ReportDetail` (view) | Read-only HTML rendering + PDF download |
| `/reports/:id/edit` | `ReportDetail` (edit) | Full editor with pre-filled content + PDF download |
| `/settings/report-templates` | `SettingsReportTemplates` | Template upload, list, key management |

### E.2 Performance Pages

| Route | Component | Mode |
|-------|-----------|------|
| `/performance` | `PerformanceList` | Submissions list, filterable by commune/period |
| `/performance/create` | `PerformanceForm` | Data entry: zone cascade + period selector + indicator grid |
| `/performance/edit` | `PerformanceForm` | Edit mode: pre-filled values (zone_id + period_id query params) |
| `/performance/:id` | `PerformanceForm` | View mode: read-only indicator grid (id = zone_period encoding) |
| `/settings/performance` | `SettingsPerformance` | Tabbed admin: Domains / Sub-Domains / Indicators / Periods |
| `/settings/performance_period` | `SettingsPeriod` | Period list |
| `/settings/performance_period/create` | `SettingsPeriodForm` | Create period |
| `/settings/performance_period/:id/edit` | `SettingsPeriodForm` | Edit period |

### E.3 Key Shared Components

| Component | Used By | Description |
|-----------|---------|-------------|
| `TextEditor` | Report create/edit | TipTap rich text editor with full formatting toolbar |
| `ImageInsertModal` | TextEditor | Modal for inserting images (URL or file upload, <5MB limit) |
| `ReportHero` | Report pages | Styled hero banner with title and actions |
| `ReportCreateForm` | Report create | Form wrapper with title, description, editor |
| `ReportDetail` | Report view/edit | Renders HTML (view) or editor (edit) |
| `ReportSimpleForm` | Report create | Simplified form variant |
| `ReportList` | Report list | KPI cards + action table |
| `PerformanceList` | Performance list | Filterable submissions table |
| `PerformanceForm` | Performance data entry | Zone cascade + indicator grid for create/edit/view |
| `DomainManager` | Settings | CRUD table for domains |
| `SubDomainManager` | Settings | CRUD table for sub-domains |
| `IndicatorManager` | Settings | CRUD table for indicators |
| `PeriodManager` | Settings | CRUD table for periods |

---

## PART F — ENHANCEMENT ROADMAP

This section defines planned and proposed enhancements organized by implementation phase. Each item is traceable with a unique ID, priority (P0–P3), estimated complexity (S/M/L/XL), and dependencies.

### F.1 Phase 1 — Immediate Improvements (Next 1–2 Sprints)

High-impact, low-effort enhancements addressing current gaps in the existing functionality.

#### F.1.1 Report Documents

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-RPT-01** | Report categories / tags | P0 | S | Add a `category` field (enum or free-text tag) to report_documents to classify reports (e.g., សន្តិសុខ, សេដ្ឋកិច្ច, សង្គមកិច្ច). Add filter by category in list view and KPI breakdown by category. |
| **ENH-RPT-02** | Zone-scoped report listing | P0 | M | Reports shall be filterable by zone (commune/district). Currently the list endpoint returns all reports; add query params `?zone_code=X` with role-based default scoping. Add zone badge column to the list table. |
| **ENH-RPT-03** | Report search by content | P1 | M | Extend the list/search to perform full-text search across title, description, and content fields. Use PostgreSQL `tsvector` / `to_tsvector` with Khmer text support or a simple `ILIKE` fallback. |
| **ENH-RPT-04** | Undo after deletion | P1 | S | Replace hard delete with soft delete: add `deleted_at TIMESTAMPTZ` column, filter `WHERE deleted_at IS NULL` in list queries, provide 30-day recovery window before permanent purge. |
| **ENH-RPT-05** | Draft auto-save | P1 | M | Auto-save report content to localStorage or server every 30 seconds while editing. Restore unsaved changes on page load with "Recover unsaved draft?" prompt. |

#### F.1.2 Report Templates

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-TPL-01** | Template preview before download | P0 | M | After filling a template, show an in-browser preview of the resulting DOCX/HTML before prompting download. For HTML: render in iframe. For DOCX: convert to HTML server-side via existing DOCX→HTML parser and display. |
| **ENH-TPL-02** | Template validation on upload | P0 | S | Validate uploaded DOCX files: check ZIP magic bytes, verify `word/document.xml` exists, confirm no corrupted XML. Return user-friendly Khmer error messages for invalid files. |
| **ENH-TPL-03** | Template categories / grouping | P1 | S | Add a `category` or `group` field to report_templates. Group templates in the UI sidebar for easier navigation when many templates exist. |
| **ENH-TPL-04** | Duplicate template | P1 | S | Add a "duplicate" action to clone an existing template (name, content, keys) as a new template entry. |

#### F.1.3 Performance

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-PRF-01** | Indicator target values | P0 | M | Add `target_value DECIMAL(15,4)` and `target_direction` (higher_is_better / lower_is_better) to performance_indicators. Display target vs actual in data entry form and PDF report. Color-code: green (met/exceeded target), red (below target). |
| **ENH-PRF-02** | Performance data validation rules | P0 | M | Add optional `min_value` and `max_value` to performance_indicators for number-type indicators. Enforce client-side and server-side validation on save. |
| **ENH-PRF-03** | Submission status workflow | P1 | M | Add `status` (draft / submitted / approved / rejected) to performance_data submissions (at the zone+period level). Currently data is live immediately; add a submit→review→approve flow similar to FMS transactions. |
| **ENH-PRF-04** | Multi-period comparison view | P1 | L | Side-by-side or overlay comparison of two or more periods for the same zone. Show delta (change) and trend arrow (↑/↓/→) per indicator. |
| **ENH-PRF-05** | "Copy from previous period" | P0 | S | When creating a new submission, offer a "Copy data from previous/last period" button that pre-fills all indicator values from the most recent submission for the same zone. |

#### F.1.4 PDF Generation

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-PDF-01** | Background/async PDF generation | P0 | L | Move PDF rendering off the request thread. Add a `pdf_jobs` table (status: queued/processing/done/failed). `POST /api/pdf/generate` returns a job ID. Frontend polls or receives notification when PDF is ready. Critical for large performance reports. |
| **ENH-PDF-02** | PDF generation progress indicator | P1 | M | Show a progress spinner with status text ("កំពុងបង្កើត PDF...") during generation. If generation takes >5s, show estimated time remaining. |
| **ENH-PDF-03** | PDF metadata embedding | P1 | S | Embed PDF metadata (title, author, creation date, document reference number) in generated PDFs for archival and searchability. |

### F.2 Phase 2 — Structural Enhancements (Next Quarter)

These enhancements require moderate architectural changes or new sub-systems.

#### F.2.1 Report Documents

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-RPT-10** | Multi-step approval workflow | P0 | L | Extend status from `draft/published` to `draft → pending_review → reviewed → approved → published`. Each transition records: actor, timestamp, optional comment. Add `/api/report-documents/:id/approvals` and `report_approvals` table. Commune clerk drafts → commune chief reviews → district chief approves. |
| **ENH-RPT-11** | Inline comments and review notes | P1 | L | Allow approvers to attach comments to specific sections of a report. Store as `report_comments` table with character offset range. Render as margin notes in PDF. |
| **ENH-RPT-12** | Report version history | P1 | M | Track every save as a new version. `report_versions` table: version_number, content snapshot, created_by, created_at. UI: version dropdown to view/restore previous versions. |
| **ENH-RPT-13** | Export to DOCX | P1 | L | Add HTML→DOCX conversion so reports authored in the rich text editor can be downloaded as `.docx` files. Build on existing DOCX manipulation code in the template filling pipeline. |
| **ENH-RPT-14** | Scheduled / recurring reports | P2 | XL | Define report schedules: `report_schedules` table with cron expression, template ID, zone scope. System generates reports automatically and notifies assigned users. Builds on the async PDF job queue (ENH-PDF-01). |

#### F.2.2 Report Templates

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-TPL-10** | Conditional blocks in templates | P1 | L | Extend template syntax: `{{#if condition}}...{{/if}}`, `{{#unless condition}}...{{/unless}}`. Support comparisons: `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `contains`. Enable smart templates that adapt to data presence. |
| **ENH-TPL-11** | Nested loops | P1 | M | Support `{{#each outer}}...{{#each inner}}...{{/each}}...{{/each}}` for hierarchical data (e.g., zones → members → details). |
| **ENH-TPL-12** | Template data schema definition | P1 | M | Allow template authors to define a JSON schema per template specifying expected keys, types, and validation rules. Auto-generate a fill form in the UI from the schema instead of raw JSON input. |
| **ENH-TPL-13** | Template versioning | P1 | M | Track template versions when uploaded/updated. `template_versions` table. Users can view version history and revert to a previous version. Filled documents record which template version was used. |
| **ENH-TPL-14** | Batch template fill | P2 | L | `POST /api/report-templates/:id/fill/batch` accepts an array of payloads and returns a ZIP of all filled documents. Enables generating reports for multiple zones in one action. |

#### F.2.3 Performance

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-PRF-10** | Data visualization dashboard | P0 | XL | Add interactive charts to performance views: bar charts comparing zones, line charts showing trend over periods, radar/spider charts for multi-indicator profiles. Use a lightweight charting library (e.g., Recharts, Chart.js). Include export-to-image. |
| **ENH-PRF-11** | Weighted scoring & composite index | P1 | L | Add `weight DECIMAL(3,2)` to indicators. Compute composite scores per sub-domain and domain as weighted averages. Display in performance reports and dashboards. |
| **ENH-PRF-12** | Derived / calculated indicators | P2 | L | Add `formula TEXT` to indicators referencing other indicator codes (e.g., `{{indicator_A}} / {{indicator_B}} * 100`). Auto-compute derived values after data entry. Store computed values alongside raw inputs. |
| **ENH-PRF-13** | Data import from Excel/CSV | P1 | L | `POST /api/performance/data/import` accepts XLSX/CSV upload. Parse columns: zone_code, period_label, indicator_code → value. Validate against indicator definitions. Return import summary (rows imported, skipped, errors). |
| **ENH-PRF-14** | Historical data migration & archival | P2 | M | Add period archival flag. Archived periods are read-only. UI: tab separation between "Active" and "Archived" submissions. |
| **ENH-PRF-15** | Automated data aggregation | P2 | L | Automatically compute commune-level aggregates from village submissions, district-level from communes. Store in `performance_aggregations` table. Recalculate on data change. |

#### F.2.4 PDF Generation

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-PDF-10** | Custom report cover page | P1 | M | Add optional cover page with: government logo, report title, period, zone name, generation date. Configurable per report document and performance report. Use a dedicated Go template for cover page layout. |
| **ENH-PDF-11** | Table of contents generation | P2 | M | Auto-generate clickable TOC from heading tags (H1–H3) in report content. Insert at beginning of PDF. Works for both report documents and performance reports. |
| **ENH-PDF-12** | Watermark support | P2 | S | Add optional watermark text (e.g., "DRAFT", "CONFIDENTIAL") to generated PDFs. Configurable opacity, rotation, and position. Use CSS overlay in the Chromium-rendered HTML. |
| **ENH-PDF-13** | PDF/A archival format | P2 | M | Add option to generate PDF/A-2b compliant output for long-term archival. Configure Chromedp `PrintToPDF` with PDF/A metadata. |
| **ENH-PDF-14** | Batch PDF generation | P2 | L | `POST /api/reports/performance/batch` accepts array of `{zone_id, period_id}` and returns a ZIP of all generated PDFs. Builds on the async job queue (ENH-PDF-01). |

### F.3 Phase 3 — Advanced Features (Next 6 Months)

Longer-term, high-value features requiring significant development.

#### F.3.1 Cross-Module Integration

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-INT-01** | Report data binding to system entities | P1 | XL | Insert dynamic data placeholders in reports that pull live data: `{{member_count}}`, `{{voter_sentiment_summary}}`, `{{finance_balance}}`, `{{performance_score:zone:period}}`. Reports auto-update when source data changes. |
| **ENH-INT-02** | Performance data auto-population from other modules | P2 | XL | Define indicators that source their values from other tables: e.g., "Total Members" indicator reads from `members` table, "Total Revenue" from `fms_transactions`. Configure source mapping in indicator definition. |
| **ENH-INT-03** | Unified document registry | P2 | L | A central "Documents" page showing all generated content across modules (reports, performance reports, member lists) with unified search, filter, and download. Cross-module document reference system. |

#### F.3.2 Collaboration & Notifications

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-COL-01** | In-app notifications | P1 | XL | Notification bell in topbar with: "Report awaiting your approval", "Performance submission received", "Comment on your report". `notifications` table, WebSocket or polling for real-time updates. |
| **ENH-COL-02** | Email notifications | P2 | L | Send email via Supabase email templates on key events: report submitted for review, report approved/rejected, performance deadline approaching. Configurable per user in profile settings. |
| **ENH-COL-03** | User mention in comments | P2 | M | `@username` mention syntax in report/review comments. Notifies mentioned user. Autocomplete dropdown of users in the same zone hierarchy. |

#### F.3.3 Mobility & Accessibility

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-MOB-01** | Responsive performance data entry | P1 | L | Optimize the performance data entry grid for mobile/tablet screens. Collapse domain groups into accordions; single-column indicator layout on narrow screens. |
| **ENH-MOB-02** | Offline data entry | P2 | XL | Cache indicator definitions and previous data via Service Worker. Allow offline data entry that syncs when connection is restored. Use IndexedDB for local storage. |
| **ENH-MOB-03** | PWA installation | P2 | M | Add a web manifest and service worker so the app can be installed as a Progressive Web App on mobile devices with an app icon and offline splash screen. |

#### F.3.4 Analytics & Intelligence

| ID | Enhancement | Priority | Effort | Description |
|----|-------------|----------|--------|-------------|
| **ENH-ANA-01** | Performance anomaly detection | P3 | L | Flag unusual indicator values: sudden drops, spikes, or values significantly different from neighboring zones. Use statistical outlier detection (Z-score or IQR). Surface on the dashboard. |
| **ENH-ANA-02** | Natural language report summary | P3 | XL | AI-generated Khmer summary paragraph from structured performance data. "In Q1 2026, Cheung Prey district showed improvement in agriculture indicators but declined in infrastructure..." |
| **ENH-ANA-03** | Predictive trend projection | P3 | XL | Linear regression on historical performance data to project next period values. Show projected vs actual over time. Help with budget allocation decisions. |

### F.4 Enhancement Summary by Module

#### Report Documents — Quick Wins
| Priority | Count | Key Items |
|----------|-------|-----------|
| P0 | 2 | Categories/tags, zone-scoped listing |
| P1 | 3 | Full-text search, soft delete, auto-save |
| P2 | 1 | Scheduled/recurring reports |
| P3 | 0 | — |

#### Report Documents — Structural
| Priority | Count | Key Items |
|----------|-------|-----------|
| P0 | 1 | Multi-step approval workflow |
| P1 | 2 | Inline comments, DOCX export |
| P2 | 0 | — |

#### Report Templates
| Priority | Count | Key Items |
|----------|-------|-----------|
| P0 | 2 | Template preview, upload validation |
| P1 | 5 | Categories, duplicate, conditional blocks, nested loops, schema, versioning |
| P2 | 1 | Batch fill |

#### Performance
| Priority | Count | Key Items |
|----------|-------|-----------|
| P0 | 4 | Target values, validation rules, copy-from-previous, data visualization |
| P1 | 3 | Submission workflow, weighted scoring, Excel import |
| P2 | 3 | Derived indicators, archival, auto-aggregation |

#### PDF Generation
| Priority | Count | Key Items |
|----------|-------|-----------|
| P0 | 1 | Background/async generation |
| P1 | 3 | Progress indicator, metadata, cover page |
| P2 | 4 | TOC, watermark, PDF/A, batch generation |

#### Cross-Cutting
| Priority | Count | Key Items |
|----------|-------|-----------|
| P1 | 3 | Data binding, notifications, mobile responsive |
| P2 | 5 | Email, mentions, offline, PWA, unified registry |
| P3 | 3 | Anomaly detection, NL summary, trend projection |

### F.5 Implementation Priority Matrix

```
                    LOW Effort (S)    MED Effort (M)      HIGH Effort (L)     VERY HIGH (XL)
                    ─────────────     ──────────────      ───────────────     ──────────────
P0 (Critical)       ENH-TPL-02        ENH-RPT-01          ENH-PDF-01          —
                    ENH-PRF-05        ENH-RPT-02          ENH-RPT-10
                                      ENH-PRF-01
                                      ENH-PRF-02

P1 (Important)      ENH-RPT-04        ENH-RPT-05          ENH-RPT-11          ENH-INT-01
                    ENH-TPL-03        ENH-TPL-01          ENH-RPT-12          ENH-COL-01
                    ENH-TPL-04        ENH-PRF-03          ENH-RPT-13
                    ENH-PDF-03        ENH-PDF-02          ENH-TPL-10
                                      ENH-TPL-11          ENH-TPL-12
                                      ENH-TPL-13          ENH-PRF-10
                                      ENH-PDF-10          ENH-PRF-11
                                      ENH-PDF-12          ENH-PRF-13
                                      ENH-COL-03          ENH-MOB-01
                                      ENH-MOB-03

P2 (Nice-to-have)   ENH-PDF-13        ENH-RPT-14          ENH-TPL-14          ENH-INT-02
                                      ENH-PRF-14          ENH-PRF-12          ENH-MOB-02
                                      ENH-PDF-11          ENH-PRF-15          ENH-ANA-02
                                      ENH-INT-03          ENH-PDF-14          ENH-ANA-03
                                      ENH-COL-02
                                      ENH-MOB-02

P3 (Future)         —                 —                   ENH-ANA-01          ENH-ANA-02
                                                                              ENH-ANA-03
```

### F.6 Database Migrations Required for Phase 1

```sql
-- ENH-RPT-01: Report categories
ALTER TABLE report_documents ADD COLUMN category TEXT;

-- ENH-RPT-02: Zone scoping (if not present)
ALTER TABLE report_documents ADD COLUMN zone_code VARCHAR(8) REFERENCES geographic_zones(zone_code);

-- ENH-RPT-04: Soft delete
ALTER TABLE report_documents ADD COLUMN deleted_at TIMESTAMPTZ;

-- ENH-TPL-03: Template categories
ALTER TABLE report_templates ADD COLUMN category TEXT;

-- ENH-PRF-01: Indicator targets
ALTER TABLE performance_indicators ADD COLUMN target_value DECIMAL(15,4);
ALTER TABLE performance_indicators ADD COLUMN target_direction TEXT CHECK (target_direction IN ('higher_is_better','lower_is_better'));

-- ENH-PRF-02: Value bounds
ALTER TABLE performance_indicators ADD COLUMN min_value DECIMAL(15,4);
ALTER TABLE performance_indicators ADD COLUMN max_value DECIMAL(15,4);
```

---

## APPENDIX A — Complete API Reference

### Report Documents

| Method | Endpoint | Body / Params | Response | Feature |
|--------|----------|--------------|----------|---------|
| `POST` | `/api/report-documents/simple` | `{title, description?, content}` | `201` ReportDocument | `reports` |
| `PUT` | `/api/report-documents/:id/simple` | `{title?, description?, content?}` | `200` ReportDocument | `reports` |
| `POST` | `/api/report-documents` | Full report fields | `201` ReportDocument | `reports` |
| `GET` | `/api/report-documents` | — | `200` ReportDocument[] | `reports` |
| `GET` | `/api/report-documents/:id` | — | `200` ReportDocument | `reports` |
| `PUT` | `/api/report-documents/:id` | Full report fields | `200` ReportDocument | `reports` |
| `PUT` | `/api/report-documents/:id/status` | `{status: "published"}` | `200` ReportDocument | `reports` |
| `DELETE` | `/api/report-documents/:id` | — | `204` | `reports` |
| `GET` | `/api/report-documents/:id/pdf` | — | `200` PDF blob | `reports` |

### Report Templates

| Method | Endpoint | Body / Params | Response | Feature |
|--------|----------|--------------|----------|---------|
| `GET` | `/api/report-templates` | — | `200` ReportTemplate[] | `reports` |
| `POST` | `/api/report-templates` | multipart: name, description, format, file (or content) | `201` ReportTemplate | `reports` |
| `GET` | `/api/report-templates/:id` | — | `200` ReportTemplate | `reports` |
| `PUT` | `/api/report-templates/:id` | `{name?, description?}` | `200` ReportTemplate | `reports` |
| `GET` | `/api/report-templates/:id/download` | — | `200` template file blob | `reports` |
| `DELETE` | `/api/report-templates/:id` | — | `204` | `reports` |
| `POST` | `/api/report-templates/:id/fill` | `{key: value, ...}` JSON | `200` filled document blob | `reports` |
| `POST` | `/api/report-templates/:id/keys` | `{key: "placeholder_name"}` | `200` | `reports` |

### Performance Data Entry

| Method | Endpoint | Body / Params | Response | Feature |
|--------|----------|--------------|----------|---------|
| `GET` | `/api/performance/domains` | — | `200` PerformanceDomain[] | `performance` |
| `GET` | `/api/performance/domains/full` | — | `200` Domain[] with nested SubDomain[] and Indicator[] | `performance` |
| `GET` | `/api/performance/domains/:id/sub-domains` | — | `200` PerformanceSubDomain[] | `performance` |
| `GET` | `/api/performance/sub-domains/:id/indicators` | — | `200` PerformanceIndicator[] | `performance` |
| `GET` | `/api/performance/indicators` | — | `200` PerformanceIndicator[] | `performance` |
| `GET` | `/api/performance/periods` | — | `200` PerformancePeriod[] | `performance` |
| `POST` | `/api/performance/data` | `{zone_id, indicator_id, period_id, value_number?, value_percentage?, value_binary?}` | `201` PerformanceData | `performance` |
| `POST` | `/api/performance/data/bulk` | `[{zone_id, indicator_id, period_id, ...}, ...]` | `201` PerformanceData[] | `performance` |
| `GET` | `/api/performance/data` | `?zone_id=X&period_id=Y` | `200` PerformanceData[] (enriched with indicator/sub-domain/domain) | `performance` |
| `GET` | `/api/performance/data/submissions` | — | `200` submission summaries | `performance` |
| `DELETE` | `/api/performance/data/:id` | — | `200` | `performance` |
| `DELETE` | `/api/performance/data` | `{zone_id, period_id}` | `200` | `performance` |
| `GET` | `/api/reports/performance/:zone_id/:period_id` | — | `200` PDF blob | `performance` |

### Performance Admin (CRUD)

| Method | Endpoint | Body | Response | Feature |
|--------|----------|------|----------|---------|
| `POST` | `/api/performance/domains` | `{code, name_kh, name_en?, sort_order?}` | `201` | `performance_admin` |
| `PUT` | `/api/performance/domains/:id` | `{code?, name_kh?, name_en?, sort_order?}` | `200` | `performance_admin` |
| `DELETE` | `/api/performance/domains/:id` | — | `200` | `performance_admin` |
| `POST` | `/api/performance/sub-domains` | `{domain_id, code, name_kh, name_en?, sort_order?}` | `201` | `performance_admin` |
| `PUT` | `/api/performance/sub-domains/:id` | `{code?, name_kh?, name_en?, sort_order?}` | `200` | `performance_admin` |
| `DELETE` | `/api/performance/sub-domains/:id` | — | `200` | `performance_admin` |
| `POST` | `/api/performance/indicators` | `{sub_domain_id, code, name_kh, name_en?, data_type, unit_kh?, unit_en?, sort_order?}` | `201` | `performance_admin` |
| `PUT` | `/api/performance/indicators/:id` | `{code?, name_kh?, name_en?, data_type?, unit_kh?, unit_en?, sort_order?}` | `200` | `performance_admin` |
| `DELETE` | `/api/performance/indicators/:id` | — | `200` | `performance_admin` |
| `POST` | `/api/performance/periods` | `{label_kh, label_en?, start_date, end_date, sort_order?}` | `201` | `performance_admin` |
| `PUT` | `/api/performance/periods/:id` | `{label_kh?, label_en?, start_date?, end_date?, sort_order?}` | `200` | `performance_admin` |
| `DELETE` | `/api/performance/periods/:id` | — | `200` | `performance_admin` |

---

## APPENDIX B — Database Tables

### report_documents

```sql
CREATE TABLE report_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  party_name TEXT,
  province_name TEXT,
  district_name TEXT,
  document_reference_number TEXT,
  generation_date_khmer TEXT,
  report_month INTEGER,
  report_year INTEGER,
  political_situation_summary TEXT,
  total_crimes INTEGER,
  homicide INTEGER,
  suicide INTEGER,
  misdemeanor INTEGER,
  human_fatalities INTEGER,
  property_damage_desc TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### report_templates

```sql
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL CHECK (format IN ('docx','html')),
  file_name TEXT,
  file_size BIGINT,
  storage_path TEXT,
  content TEXT,
  keys TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### performance_domains, performance_sub_domains, performance_indicators

```sql
CREATE TABLE performance_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_kh TEXT NOT NULL,
  name_en TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE performance_sub_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES performance_domains(id),
  code TEXT NOT NULL,
  name_kh TEXT NOT NULL,
  name_en TEXT,
  sort_order INTEGER DEFAULT 0,
  UNIQUE (domain_id, code)
);

CREATE TABLE performance_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_domain_id UUID NOT NULL REFERENCES performance_sub_domains(id),
  code TEXT NOT NULL,
  name_kh TEXT NOT NULL,
  name_en TEXT,
  data_type TEXT NOT NULL CHECK (data_type IN ('number','percentage','binary')),
  unit_kh TEXT,
  unit_en TEXT,
  sort_order INTEGER DEFAULT 0,
  UNIQUE (sub_domain_id, code)
);
```

### performance_periods

```sql
CREATE TABLE performance_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_kh TEXT NOT NULL,
  label_en TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sort_order INTEGER DEFAULT 0
);
```

### performance_data

```sql
CREATE TABLE performance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id VARCHAR(8) NOT NULL REFERENCES geographic_zones(zone_code),
  indicator_id UUID NOT NULL REFERENCES performance_indicators(id),
  period_id UUID NOT NULL REFERENCES performance_periods(id),
  value_number DECIMAL(15,4),
  value_percentage DECIMAL(5,2),
  value_binary BOOLEAN,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (zone_id, indicator_id, period_id)
);
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 2026 | Initial extracted BRD for report documents, templates, and performance modules |
| 2.0 | Aug 2026 | Added Part F — Enhancement Roadmap with 40+ traceable enhancements across 3 phases, priority matrix, and Phase 1 migration SQL |
