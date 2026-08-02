-- Update role labels to Khmer
UPDATE public.roles SET label = 'អ្នកគ្រប់គ្រងជាន់ខ្ពស់', updated_at = now() WHERE role = 'super_admin';
UPDATE public.roles SET label = 'អ្នកគ្រប់គ្រង', updated_at = now() WHERE role = 'admin';
UPDATE public.roles SET label = 'ប្រធានស្រុក', updated_at = now() WHERE role = 'district_chief';
UPDATE public.roles SET label = 'ប្រធានឃុំ', updated_at = now() WHERE role = 'commune_chief';
UPDATE public.roles SET label = 'ស្មៀនឃុំ', updated_at = now() WHERE role = 'commune_clerk';
UPDATE public.roles SET label = 'ប្រធានភូមិ', updated_at = now() WHERE role = 'village_chief';
UPDATE public.roles SET label = 'អ្នកកត់ត្រា', updated_at = now() WHERE role = 'recorder';
UPDATE public.roles SET label = 'អ្នកប្រើប្រាស់ធម្មតា', updated_at = now() WHERE role = 'regular_user';
