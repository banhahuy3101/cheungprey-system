-- Migration: Seed Performance Domain II
-- Date: 2026-07-02

-- Domain II: Security, Public Order and Social Safety
INSERT INTO performance_domains (id, code, name_kh, name_en, sort_order)
VALUES (gen_random_uuid(), 'II', 
        'ជាឃុំ សង្កាត់ដែលមានសន្តិសុខ របៀបរៀបរយ សណ្តាប់ធ្នាប់សាធារណៈ និងសុវត្ថិភាពសង្គមល្ប់ប្រសើរ',
        'II. Security, Public Order and Social Safety', 2)
ON CONFLICT (code) DO NOTHING;

-- Sub-domain 2.1
INSERT INTO performance_sub_domains (id, domain_id, code, name_kh, name_en, sort_order)
SELECT gen_random_uuid(), d.id, '2.1',
        '២.១ គ្មានបទល្មើសលួច ឆក់ ប្លន់ គ្រឿងញៀន ល្បែងស៊ីសងខុសច្បាប់ និងបទល្មើសផ្សេងៗទៀតក្នុងភូមិ ឃុំ សង្កាត់',
        '2.1 No Theft, Robbery, Drugs, Illegal Gambling, and Other Crimes', 1
FROM performance_domains d
WHERE d.code = 'II'
ON CONFLICT (domain_id, code) DO NOTHING;

-- Sub-domain 2.2
INSERT INTO performance_sub_domains (id, domain_id, code, name_kh, name_en, sort_order)
SELECT gen_random_uuid(), d.id, '2.2',
        '២.២ មានសណ្តាប់ធ្នាប់សាធារណៈល្ប់ ជាពិសេសគ្មានគ្រោះថ្នាក់ចរាចរណ៍',
        '2.2 Good Public Order, Especially No Traffic Accidents', 2
FROM performance_domains d
WHERE d.code = 'II'
ON CONFLICT (domain_id, code) DO NOTHING;

-- Indicators for 2.1 (scoped to Domain II — code '2.1' also exists under Domain I)
INSERT INTO performance_indicators (id, sub_domain_id, code, name_kh, name_en, data_type, unit_kh, unit_en, sort_order)
SELECT gen_random_uuid(), sd.id, v.code, v.name_kh, v.name_en, v.data_type::indicator_data_type, v.unit_kh, v.unit_en, v.sort_order
FROM performance_sub_domains sd
JOIN performance_domains d ON d.id = sd.domain_id AND d.code = 'II'
CROSS JOIN (VALUES
  ('1', '១. ចំនួនប្រជាការពារន៏តាមឃុំ សង្កាត់', NULL, 'number', 'នាក់', 'people', 1),
  ('2', '២. ចំនួនវគ្គបណ្តុះបណ្តាល និងពង្រឹងសមត្ថភាពប្រជាការពារ', NULL, 'number', 'វគ្គ', 'sessions', 2),
  ('3', '៣. ការគាំទ្រផ្សេងៗដល់ប្រជាការពារ', NULL, 'number', 'ករណី', 'cases', 3),
  ('4', '៤. ចំនួនមន្ត្រីនរគបាលរដ្ឋបាលន៏តឃុំ សង្កាត់នីមួយៗ', NULL, 'number', 'នាក់', 'people', 4),
  ('5', '៥. ចំនួនវគ្គបណ្តុះបណ្តាលដែលផ្តល់ឱ្យប៉ុស្តិ៍នគរបាលរដ្ឋបាលឃុំ សង្កាត់', NULL, 'number', 'វគ្គ', 'sessions', 5),
  ('6', '៦. ការគាំទ្រផ្សេងៗដល់ប៉ុស្តិ៍នគរបាល', NULL, 'number', 'ករណី', 'cases', 6),
  ('7', '៧. អាត្រាបទល្មើសដែលបង្ក្រាបបានធៀបនឹងបទល្មើសដែលកើតឡើង', NULL, 'percentage', 'ភាគរយ(%)', '%', 7),
  ('8', '៨. ចំនួនកម្មវិធីអប់រំ និងផ្សព្វផ្សាយអំពីបញ្ហាបទល្មើស និងគ្រឿងញៀន', NULL, 'number', 'កម្មវិធី', 'programs', 8),
  ('9', '៩. ចំនួនប្រជាពលរដ្ឋចូលរួមកម្មវិធីអប់រំ និងផ្សព្វផ្សាយអំពីបញ្ហាបទល្មើស និងគ្រឿងញៀន', NULL, 'number', 'នាក់', 'people', 9)
) AS v(code, name_kh, name_en, data_type, unit_kh, unit_en, sort_order)
WHERE sd.code = '2.1'
ON CONFLICT (sub_domain_id, code) DO NOTHING;

-- Indicators for 2.2
INSERT INTO performance_indicators (id, sub_domain_id, code, name_kh, name_en, data_type, unit_kh, unit_en, sort_order)
SELECT gen_random_uuid(), sd.id, v.code, v.name_kh, v.name_en, v.data_type::indicator_data_type, v.unit_kh, v.unit_en, v.sort_order
FROM performance_sub_domains sd
JOIN performance_domains d ON d.id = sd.domain_id AND d.code = 'II'
CROSS JOIN (VALUES
  ('1', '១. ឃុំ សង្កាត់ដែលរៀបចំមានការសម្រួលចរាចរណ៍ឆ្លងកាត់ផ្លូវសាធារណៈរបស់ប្រជាពលរដ្ឋជាពិសេសសិស្សានុសិស្ស', NULL, 'binary', 'មាន / មិនមាន', 'Yes / No', 1),
  ('2', '២. ចំនួនស្លាកសញ្ញាចរាចរណ៍ន៏ក្នុងឃុំ សង្កាត់ (គ្រប់គ្រាន់ ឬមិនទាន់គ្រប់គ្រាន់ ឬគ្មាន)', NULL, 'binary', 'គ្រប់គ្រាន់ / មិនគ្រប់គ្រាន់ / គ្មាន', 'Enough / Not enough / None', 2),
  ('3', '៣. ចំនួនគ្រោះថ្នាក់ចរាចរណ៍', NULL, 'number', 'ករណី', 'cases', 3),
  ('4', '៤. ចំនួនទីប្រជុំជន សាលារៀន តំបន់ជុំវិញផ្សារ និងតំបន់ស្មុគស្មាញនានាដែលមានសណ្តាប់ធ្នាប់ល្ប់', NULL, 'number', 'កន្លែង', 'places', 4),
  ('5', '៥. ចំនួនទីប្រជុំជន សាលារៀន តំបន់ជុំវិញផ្សារ និងតំបន់ស្មុគស្មាញនានាដែលមិនទាន់មានសណ្តាប់ធ្នាប់ល្ប់', NULL, 'number', 'កន្លែង', 'places', 5),
  ('6', '៦. ឃុំ សង្កាត់ដែលមានចំណតសាធារណៈ', NULL, 'binary', 'មាន / មិនមាន', 'Yes / No', 6),
  ('7', '៧. ចំនួនកម្មវិធីផ្សព្វផ្សាយ និងអប់រំច្បាប់ចរាចរណ៍', NULL, 'number', 'កម្មវិធី', 'programs', 7),
  ('8', '៨. ចំនួនប្រជាពលរដ្ឋដែលបានចូលរួមអប់រំផ្សព្វផ្សាយច្បាប់ចរាចរណ៍', NULL, 'number', 'នាក់', 'people', 8)
) AS v(code, name_kh, name_en, data_type, unit_kh, unit_en, sort_order)
WHERE sd.code = '2.2'
ON CONFLICT (sub_domain_id, code) DO NOTHING;
