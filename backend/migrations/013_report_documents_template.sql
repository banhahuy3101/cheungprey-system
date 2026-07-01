-- Migrate report_documents from generic title/content to structured party report template.
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS party_name TEXT NOT NULL DEFAULT 'គណបក្សប្រជាជនកម្ពុជា';
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS province_name TEXT NOT NULL DEFAULT '';
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS district_name TEXT NOT NULL DEFAULT '';
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS document_reference_number TEXT NOT NULL DEFAULT '';
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS generation_date_khmer TEXT NOT NULL DEFAULT '';
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS report_month INT;
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS report_year INT;
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS political_situation_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS total_crimes_count INT NOT NULL DEFAULT 0;
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS homicide_cases INT NOT NULL DEFAULT 0;
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS suicide_cases INT NOT NULL DEFAULT 0;
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS misdemeanor_cases INT NOT NULL DEFAULT 0;
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS human_fatalities INT NOT NULL DEFAULT 0;
ALTER TABLE report_documents ADD COLUMN IF NOT EXISTS property_damage_desc TEXT NOT NULL DEFAULT '(គ្មាន)';

ALTER TABLE report_documents DROP COLUMN IF EXISTS title;
ALTER TABLE report_documents DROP COLUMN IF EXISTS content;

CREATE INDEX IF NOT EXISTS idx_report_documents_period ON report_documents(report_year, report_month);
