-- Migration: Add description column to menu_items and seed descriptions for settings catalog
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Seed descriptions for settings module sub-items
UPDATE public.menu_items
SET description = 'គ្រប់គ្រងគណនីអ្នកប្រើប្រាស់ កំណត់តួនាទី និងពាក្យសម្ងាត់ប្រព័ន្ធ (User Management)'
WHERE id = '00000000-0000-0000-0000-000000000081';

UPDATE public.menu_items
SET description = 'កំណត់សិទ្ធិលម្អិតតាមតួនាទី និងម៉ូឌុល (Role & Permission Matrix)'
WHERE id = '00000000-0000-0000-0000-000000000091';

UPDATE public.menu_items
SET description = 'បើក/បិទការអនុម័ត និងកំណត់ជំហានអនុម័តតាមម៉ូឌុល'
WHERE id = '00000000-0000-0000-0000-000000000082';

UPDATE public.menu_items
SET description = 'រៀបចំ ម៉ូឌុល ម៉ូឌុលរង លក្ខណៈពិសេស និងម៉ឺនុយកូនតាមឋានានុក្រម'
WHERE id = '00000000-0000-0000-0000-000000000083';

UPDATE public.menu_items
SET description = 'បញ្ចូល និងគ្រប់គ្រងគំរូ .docx / .html សម្រាប់របាយការណ៍'
WHERE id = '00000000-0000-0000-0000-000000000085';

UPDATE public.menu_items
SET description = 'System settings — ពាក្យសម្ងាត់ដើម និងការកំណត់ប្រព័ន្ធ'
WHERE id = '00000000-0000-0000-0000-000000000086';

UPDATE public.menu_items
SET description = 'ចាត់តាំងប្រធានខេត្ត ស្រុក ឃុំ ភូមិ'
WHERE id = '00000000-0000-0000-0000-000000000087';

UPDATE public.menu_items
SET description = 'គ្រប់គ្រងដែន ចំណុចរង សូចនាករ និងរយៈពេល'
WHERE id = '00000000-0000-0000-0000-000000000088';

UPDATE public.menu_items
SET description = 'ពិនិត្យស្ថានភាព Cron nightly, ដំណើរការថែទាំ Supabase និងកំណត់ហេតុ'
WHERE id = '00000000-0000-0000-0000-000000000089';

NOTIFY pgrst, 'reload schema';
