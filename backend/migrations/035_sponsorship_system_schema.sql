-- ==============================================================================
-- Migration: Sponsorship System Schema & Material Items Linked Table
-- Description: Creates sponsorship_records and linked sponsorship_items table
-- ==============================================================================

-- 1. Create sponsorship_records Table (Master Sponsor Records)
CREATE TABLE IF NOT EXISTS public.sponsorship_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_no INT,
    fiscal_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    record_period VARCHAR(255) NOT NULL,
    contributor_name VARCHAR(255) NOT NULL,
    representatives VARCHAR(255),
    entry_classification VARCHAR(100) DEFAULT 'sponsorship',
    category VARCHAR(100) DEFAULT 'sponsorship',
    section_group VARCHAR(100) DEFAULT 'ទូទៅ',
    is_expense_total BOOLEAN DEFAULT FALSE,
    expense_label VARCHAR(255),
    amount_usd NUMERIC(15, 2) DEFAULT 0.00,
    amount_khr BIGINT DEFAULT 0,
    usage_description TEXT,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approver_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create sponsorship_items Table (Linked Material Breakdown Table)
CREATE TABLE IF NOT EXISTS public.sponsorship_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES public.sponsorship_records(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,            -- (សម្ភារ): Material Description
    item_qty NUMERIC(15, 2) NOT NULL DEFAULT 1, -- (បរិមាណ): Quantity
    item_unit VARCHAR(100) NOT NULL DEFAULT 'គ.ក', -- (ឯកតា): Unit Count
    cash_allocation_usd NUMERIC(15, 2) DEFAULT 0.00, -- (ថវិកា - ដុល្លារ): Amount in USD
    cash_allocation_khr BIGINT DEFAULT 0,            -- (ថវិកា - រៀល): Amount in KHR
    usage_description TEXT,                     -- (ទីកន្លែងទទួល និង ប្រើប្រាស់): Distribution details and usage
    remarks TEXT,                               -- (ផ្សេងៗ): Remarks / Notes
    item_notes TEXT,                            -- Supplemental item notes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist if table was already created
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS section_group VARCHAR(100) DEFAULT 'ទូទៅ';
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS representatives VARCHAR(255);
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS entry_classification VARCHAR(100) DEFAULT 'sponsorship';
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'sponsorship';
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS is_expense_total BOOLEAN DEFAULT FALSE;
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS expense_label VARCHAR(255);
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS is_expense_label VARCHAR(255);
ALTER TABLE public.sponsorship_records DROP COLUMN IF EXISTS target_location;
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS expense_amount_usd NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS expense_amount_khr BIGINT DEFAULT 0;
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS amount_khr BIGINT DEFAULT 0;
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS usage_description TEXT;
ALTER TABLE public.sponsorship_records ADD COLUMN IF NOT EXISTS remarks TEXT;

ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS amount_khr BIGINT DEFAULT 0;
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS expense_amount_usd NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS expense_amount_khr BIGINT DEFAULT 0;
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS is_expense_label VARCHAR(255);
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS expense_label VARCHAR(255);
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS cash_allocation_usd NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS cash_allocation_khr BIGINT DEFAULT 0;
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS usage_description TEXT;
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.sponsorship_items ADD COLUMN IF NOT EXISTS item_notes TEXT;

-- 3. Indexes for fast querying and joins
CREATE INDEX IF NOT EXISTS idx_sponsorship_records_period ON public.sponsorship_records(record_period);
CREATE INDEX IF NOT EXISTS idx_sponsorship_records_year ON public.sponsorship_records(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_sponsorship_records_contributor ON public.sponsorship_records(contributor_name);
CREATE INDEX IF NOT EXISTS idx_sponsorship_items_record_id ON public.sponsorship_items(record_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_items_name ON public.sponsorship_items(item_name);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.sponsorship_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_items ENABLE ROW LEVEL SECURITY;
