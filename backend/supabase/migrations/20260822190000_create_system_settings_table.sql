-- Migration: Ensure system_settings table columns and initial global variables exist

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add any missing columns
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT false;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Index for key lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop policy if existing to prevent conflict
DROP POLICY IF EXISTS "Allow public read access to non-secret system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow admin full access to system settings" ON public.system_settings;

-- Policies
CREATE POLICY "Allow public read access to non-secret system settings"
    ON public.system_settings FOR SELECT
    USING (true);

CREATE POLICY "Allow admin full access to system settings"
    ON public.system_settings FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');

-- Seed initial global variables with valid JSONB values
INSERT INTO public.system_settings (key, value, description, category, is_secret)
VALUES 
    ('default_user_password', '"Password123!"'::jsonb, 'ពាក្យសម្ងាត់ដើមសម្រាប់អ្នកប្រើប្រាស់ថ្មី (Default user password)', 'security', false),
    ('system_name', '"ប្រព័ន្ធគ្រប់គ្រងរដ្ឋបាល Cheung Prey"'::jsonb, 'ឈ្មោះប្រព័ន្ធ (System Display Name)', 'general', false),
    ('organization_name', '"រដ្ឋបាលស្រុកជើងព្រៃ"'::jsonb, 'ឈ្មោះអង្គភាព/រដ្ឋបាល (Organization Name)', 'general', false),
    ('timezone', '"Asia/Phnom_Penh"'::jsonb, 'តំបន់ម៉ោងប្រព័ន្ធ (System Timezone)', 'locale', false),
    ('max_file_upload_mb', '25'::jsonb, 'ទំហំអតិបរមាក្នុងការ Upload ឯកសារ MB (Max upload limit)', 'storage', false),
    ('telegram_notifications_enabled', 'true'::jsonb, 'បើក/បិទ ការជូនដំណឹង Telegram (Telegram Alerts)', 'notifications', false)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    updated_at = NOW();
