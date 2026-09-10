-- 1. Create sponsorship_periods table
CREATE TABLE IF NOT EXISTS sponsorship_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_name VARCHAR(255) NOT NULL,
    fiscal_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    period_type VARCHAR(50) NOT NULL DEFAULT 'year',
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    remarks TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add period_id to sponsorship_records if not exists
ALTER TABLE sponsorship_records 
ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES sponsorship_periods(id) ON DELETE CASCADE;

-- 3. Backfill sponsorship_periods from existing distinct record_period in sponsorship_records
INSERT INTO sponsorship_periods (period_name, fiscal_year, period_type, created_at, updated_at)
SELECT DISTINCT 
    COALESCE(NULLIF(TRIM(record_period), ''), 'ប្រចាំឆ្នាំ ' || fiscal_year::text) as period_name,
    fiscal_year,
    'year' as period_type,
    NOW(),
    NOW()
FROM sponsorship_records
WHERE NOT EXISTS (
    SELECT 1 FROM sponsorship_periods sp 
    WHERE sp.period_name = COALESCE(NULLIF(TRIM(sponsorship_records.record_period), ''), 'ប្រចាំឆ្នាំ ' || sponsorship_records.fiscal_year::text)
);

-- 4. Update sponsorship_records.period_id with the matching period ID
UPDATE sponsorship_records sr
SET period_id = sp.id
FROM sponsorship_periods sp
WHERE sp.period_name = COALESCE(NULLIF(TRIM(sr.record_period), ''), 'ប្រចាំឆ្នាំ ' || sr.fiscal_year::text)
AND sr.period_id IS NULL;

-- 5. Enable RLS and grants
ALTER TABLE sponsorship_periods ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sponsorship_periods' AND policyname = 'Allow authenticated read sponsorship_periods') THEN 
        CREATE POLICY "Allow authenticated read sponsorship_periods" ON sponsorship_periods FOR SELECT TO authenticated USING (true); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sponsorship_periods' AND policyname = 'Allow authenticated insert sponsorship_periods') THEN 
        CREATE POLICY "Allow authenticated insert sponsorship_periods" ON sponsorship_periods FOR INSERT TO authenticated WITH CHECK (true); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sponsorship_periods' AND policyname = 'Allow authenticated update sponsorship_periods') THEN 
        CREATE POLICY "Allow authenticated update sponsorship_periods" ON sponsorship_periods FOR UPDATE TO authenticated USING (true) WITH CHECK (true); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sponsorship_periods' AND policyname = 'Allow authenticated delete sponsorship_periods') THEN 
        CREATE POLICY "Allow authenticated delete sponsorship_periods" ON sponsorship_periods FOR DELETE TO authenticated USING (true); 
    END IF;
END $$;

GRANT ALL ON sponsorship_periods TO postgres, service_role, authenticated, anon;
