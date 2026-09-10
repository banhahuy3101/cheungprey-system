-- 041_district_commune_village_roles.sql
-- Seed comprehensive District, Commune, Village, and System roles and permissions

-- 1. Insert/Update roles
INSERT INTO public.roles (role, label, is_system) VALUES
  ('super_admin', 'អ្នកគ្រប់គ្រងជាន់ខ្ពស់ (Super Admin)', true),
  ('admin', 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)', true),
  ('finance_officer', 'មន្ត្រីហិរញ្ញវត្ថុ (Finance Officer)', true),
  ('regular_user', 'អ្នកប្រើប្រាស់ទូទៅ (Viewer)', true),
  ('province_chief', 'ប្រធានក្រុមការងារខេត្ត (Province Working Group)', false),
  ('district_chief', 'ប្រធានគណៈកម្មាធិការស្រុក / អភិបាលស្រុក (District Chief)', false),
  ('deputy_district_chief', 'អនុប្រធានស្រុក / អភិបាលរងស្រុក (Deputy District Chief)', false),
  ('district_admin', 'មន្ត្រីរដ្ឋបាលស្រុក (District Admin Officer)', false),
  ('district_working_group', 'ក្រុមការងារចុះមូលដ្ឋានស្រុក (District Working Group)', false),
  ('commune_chief', 'ប្រធានគណៈកម្មាធិការឃុំ / មេឃុំ (Commune Chief)', false),
  ('deputy_commune_chief', 'អនុប្រធានឃុំ / ជំទប់ឃុំ (Deputy Commune Chief)', false),
  ('commune_clerk', 'ស្មៀនឃុំ (Commune Clerk)', false),
  ('commune_assistant', 'ជំនួយការឃុំ / ក្រុមប្រឹក្សាឃុំ (Commune Assistant)', false),
  ('commune_working_group', 'ក្រុមការងារចុះមូលដ្ឋានឃុំ (Commune Working Group)', false),
  ('village_chief', 'ប្រធានភូមិ / មេភូមិ (Village Chief)', false),
  ('deputy_village_chief', 'អនុប្រធានភូមិ (Deputy Village Chief)', false),
  ('village_assistant', 'ជំនួយការភូមិ (Village Assistant)', false),
  ('recorder', 'អ្នកកត់ត្រាទិន្នន័យភូមិ (Village Recorder)', false)
ON CONFLICT (role) DO UPDATE
SET label = EXCLUDED.label,
    is_system = EXCLUDED.is_system,
    updated_at = NOW();
