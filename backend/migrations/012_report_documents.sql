CREATE TABLE IF NOT EXISTS report_documents (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_name                  TEXT NOT NULL DEFAULT 'គណបក្សប្រជាជនកម្ពុជា',
  province_name               TEXT NOT NULL DEFAULT '',
  district_name               TEXT NOT NULL DEFAULT '',
  document_reference_number   TEXT NOT NULL DEFAULT '',
  generation_date_khmer       TEXT NOT NULL DEFAULT '',
  report_month                INT,
  report_year                 INT,
  political_situation_summary TEXT NOT NULL DEFAULT '',
  total_crimes_count          INT NOT NULL DEFAULT 0,
  homicide_cases              INT NOT NULL DEFAULT 0,
  suicide_cases               INT NOT NULL DEFAULT 0,
  misdemeanor_cases           INT NOT NULL DEFAULT 0,
  human_fatalities            INT NOT NULL DEFAULT 0,
  property_damage_desc        TEXT NOT NULL DEFAULT '(គ្មាន)',
  status                      VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by                  UUID REFERENCES auth.users(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_documents_created_by ON report_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_report_documents_updated_at ON report_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_documents_period ON report_documents(report_year, report_month);
