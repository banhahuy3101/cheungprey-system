# Phase 1 — API Contracts, Database & Planning Reference

**Project:** ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ (Cheung Prey District Management System)  
**Version:** 1.0  
**Last updated:** August 2026  

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
