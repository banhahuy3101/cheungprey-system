-- Performance Reporting Schema (Commune/Sangkat KPIs)
-- Based on Cambodia government template: ទិន្នន័យ ឬព័ត៌មានលទ្ធផលនៃការអនុវត្ត

-- Domains: I, IV, V, VI, VII (Roman numerals)
CREATE TABLE IF NOT EXISTS performance_domains (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT NOT NULL UNIQUE,          -- 'I', 'IV', 'V', 'VI', 'VII'
  name_kh    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- Sub-domains: ១.១, ៤.១, etc.
CREATE TABLE IF NOT EXISTS performance_sub_domains (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id  UUID NOT NULL REFERENCES performance_domains(id),
  code       TEXT NOT NULL,                  -- '1.1', '4.1', '4.2', etc.
  name_kh    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE(domain_id, code)
);

-- Indicator data type
CREATE TYPE indicator_data_type AS ENUM ('number', 'percentage', 'binary');

-- Individual indicators
CREATE TABLE IF NOT EXISTS performance_indicators (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_domain_id UUID NOT NULL REFERENCES performance_sub_domains(id),
  code          TEXT NOT NULL,               -- '1', '2', '3', etc.
  name_kh       TEXT NOT NULL,
  name_en       TEXT,
  data_type     indicator_data_type NOT NULL,
  unit_kh       TEXT,                        -- 'នាក់', 'គ្រួសារ', 'ករណី', etc.
  unit_en       TEXT,                        -- 'people', 'households', 'cases', etc.
  sort_order    INT NOT NULL DEFAULT 0,
  UNIQUE(sub_domain_id, code)
);

-- Reporting periods (e.g., 2022-H1, 2022-H2, etc.)
CREATE TABLE IF NOT EXISTS performance_periods (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_kh   TEXT NOT NULL,                  -- 'គិតចាប់ពីដើមឆ្នាំ២០២២'
  label_en   TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- Actual data submitted per commune/zone per indicator per period
CREATE TABLE IF NOT EXISTS performance_data (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         TEXT NOT NULL REFERENCES geographic_zones(zone_code),  -- commune code
  indicator_id    UUID NOT NULL REFERENCES performance_indicators(id),
  period_id       UUID NOT NULL REFERENCES performance_periods(id),
  value_number    NUMERIC(15,2),             -- for 'number' type
  value_percentage NUMERIC(5,2),             -- for 'percentage' type  
  value_binary    BOOLEAN,                   -- for 'binary' type (បាន/មិនបាន, មាន/មិនមាន)
  created_by      UUID REFERENCES auth.users(id),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone_id, indicator_id, period_id)
);

-- Index for fast lookup by zone
CREATE INDEX IF NOT EXISTS idx_performance_data_zone ON performance_data(zone_id, period_id);
CREATE INDEX IF NOT EXISTS idx_performance_data_indicator ON performance_data(indicator_id);
