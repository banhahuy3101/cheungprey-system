BEGIN;

-- ENH-RPT-01: Report categories
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS category TEXT;
CREATE INDEX IF NOT EXISTS idx_report_documents_category ON report_documents(category);

-- ENH-RPT-02: Zone scoping
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS zone_code VARCHAR(8);
ALTER TABLE report_documents
  ADD CONSTRAINT fk_report_documents_zone
  FOREIGN KEY (zone_code) REFERENCES geographic_zones(zone_code);
CREATE INDEX IF NOT EXISTS idx_report_documents_zone_code ON report_documents(zone_code);

-- Backfill zone_code from created_by's profile
UPDATE report_documents rd
SET zone_code = p.zone_code
FROM profiles p
WHERE rd.created_by = p.id AND rd.zone_code IS NULL;

-- ENH-RPT-04: Soft delete
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_report_documents_deleted_at ON report_documents(deleted_at);

-- ENH-TPL-03: Template categories
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS category TEXT;
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category);

-- ENH-PRF-01: Indicator targets
ALTER TABLE performance_indicators ADD COLUMN IF NOT EXISTS target_value DECIMAL(15,4);
ALTER TABLE performance_indicators ADD COLUMN IF NOT EXISTS target_direction TEXT;
ALTER TABLE performance_indicators ADD CONSTRAINT chk_target_direction
  CHECK (target_direction IS NULL OR target_direction IN ('higher_is_better','lower_is_better'));

-- ENH-PRF-02: Value bounds
ALTER TABLE performance_indicators ADD COLUMN IF NOT EXISTS min_value DECIMAL(15,4);
ALTER TABLE performance_indicators ADD COLUMN IF NOT EXISTS max_value DECIMAL(15,4);

-- ENH-PRF-03: Submission workflow
CREATE TABLE IF NOT EXISTS performance_submissions (
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
CREATE INDEX IF NOT EXISTS idx_performance_submissions_zone ON performance_submissions(zone_id);
CREATE INDEX IF NOT EXISTS idx_performance_submissions_period ON performance_submissions(period_id);

-- ENH-PDF-01: Async PDF job queue
CREATE TABLE IF NOT EXISTS pdf_jobs (
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
CREATE INDEX IF NOT EXISTS idx_pdf_jobs_status ON pdf_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pdf_jobs_created_at ON pdf_jobs(created_at);

COMMIT;
