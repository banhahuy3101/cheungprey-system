-- Migration: Create system_settings table to manage key-value system configurations in DB

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial system settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('default_user_password', '"123456"'::jsonb, 'Default password when creating new users'),
    ('enable_email_confirmation', 'false'::jsonb, 'Require email confirmation on signup')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();
