-- Migration: Seed Performance Domain I - Structure
-- Date: 2026-07-02

-- Domain I
INSERT INTO performance_domains (id, code, name_kh, name_en, sort_order)
VALUES (gen_random_uuid(), 'I', 'សូចនាករ', 'I. Indicators', 1)
ON CONFLICT (code) DO NOTHING;

-- Sub-domain 1.1
WITH d AS (SELECT id FROM performance_domains WHERE code = 'I')
INSERT INTO performance_sub_domains (id, domain_id, code, name_kh, name_en, sort_order)
VALUES (gen_random_uuid(), (SELECT id FROM d), '1.1', 
        '១.១ ការលើកកម្ពស់លទ្ធិប្រជាធិបតេយ្យន៏មូលដ្ឋាន',
        '1.1 Promoting Democracy at the Local Level', 1);

-- Sub-domain 1.2
WITH d AS (SELECT id FROM performance_domains WHERE code = 'I')
INSERT INTO performance_sub_domains (id, domain_id, code, name_kh, name_en, sort_order)
VALUES (gen_random_uuid(), (SELECT id FROM d), '1.2', 
        '១.២ ការលើកកម្ពស់សិទ្ធិសេរីភាពរបស់ប្រជាពលរដ្ឋ',
        '1.2 Promoting Citizens'' Rights and Freedoms', 2);

-- Sub-domain 1.3
WITH d AS (SELECT id FROM performance_domains WHERE code = 'I')
INSERT INTO performance_sub_domains (id, domain_id, code, name_kh, name_en, sort_order)
VALUES (gen_random_uuid(), (SELECT id FROM d), '1.3', 
        '១.៣ ភាពសុខដុមរមនាក្នុងសង្គម',
        '1.3 Social Harmony', 3);
