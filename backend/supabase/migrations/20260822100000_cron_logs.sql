-- Migration: Add cron_logs table for persistent cron execution history
CREATE TABLE IF NOT EXISTS public.cron_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_key VARCHAR(100) NOT NULL,
    job_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    last_run TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration VARCHAR(50),
    error TEXT,
    details JSONB DEFAULT '[]'::jsonb,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_job_key ON public.cron_logs(job_key);
CREATE INDEX IF NOT EXISTS idx_cron_logs_created_at ON public.cron_logs(created_at DESC);
