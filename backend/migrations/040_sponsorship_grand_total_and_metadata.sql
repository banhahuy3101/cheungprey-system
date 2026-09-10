-- ==============================================================================
-- Migration: 040_sponsorship_grand_total_and_metadata.sql
-- Description: Records verified grand_total and metadata for 2025 Sponsorships
-- ==============================================================================

-- 1. Ensure columns exist on sponsorship_periods
ALTER TABLE public.sponsorship_periods ADD COLUMN IF NOT EXISTS materials_summary TEXT;

-- 2. Update 2025 period metadata, materials_summary, and signing remarks
UPDATE public.sponsorship_periods
SET 
  materials_summary = 'អាវគណបក្ស ១៩០ អាវ, មួកគណបក្ស ១៩០ មួក, កន្សែងពោះគោ ១៩០ កន្សែង, អង្ករ ១,៧០០ គ.ក, ថ្នាំពេទ្យ ១ កេស, ទេយ្យវត្ថុ ២ ឈុត, កុំព្យូទ័រ ២ គ្រឿង, តុសិស្ស ៧ តុ, កៅអីជ័រ ៤០ កៅអី',
  remarks = 'ទីតាំង៖ ជើងព្រៃ | កាលបរិច្ឆេទចុះហត្ថលេខា៖ ថ្ងៃពុធ ៥កើត ខែបុស្ស ឆ្នាំម្សាញ់ សប្តស័ក ព.ស ២៥៦៩, ថ្ងៃទី ២៤ ខែ ធ្នូ ឆ្នាំ ២០២៥',
  status = 'approved',
  updated_at = NOW()
WHERE id = '6e4b6e98-983d-49ff-a767-96fb3fb2c99f' OR (period_name = 'ប្រចាំឆ្នាំ ២០២៥' AND fiscal_year = 2025);

-- 3. Set approved_at and reviewed_at on 2025 records to signing date (2025-12-24)
UPDATE public.sponsorship_records
SET 
  approved_at = '2025-12-24 00:00:00+00',
  reviewed_at = '2025-12-24 00:00:00+00',
  status = 'approved',
  updated_at = NOW()
WHERE period_id = '6e4b6e98-983d-49ff-a767-96fb3fb2c99f' OR (fiscal_year = 2025 AND record_period = 'ប្រចាំឆ្នាំ ២០២៥');
