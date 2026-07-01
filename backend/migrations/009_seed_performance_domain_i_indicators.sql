-- Migration: Seed Performance Domain I - Indicators
-- Date: 2026-07-02

-- Indicators for 1.1 (Fixed: indicators 3 and 4 are percentage)
WITH sd AS (SELECT id FROM performance_sub_domains WHERE code = '1.1')
INSERT INTO performance_indicators (id, sub_domain_id, code, name_kh, name_en, data_type, unit_kh, unit_en, sort_order) VALUES
(gen_random_uuid(), (SELECT id FROM sd), '1', '១. ភាគរយចំនួនប្រជាពលរដ្ឋគ្រប់អាយុ១៨ឆ្នាំ ទៅចុះឈ្មោះបោះឆ្នោតត្រឹមឆ្នាំ២០២២', NULL, 'percentage', 'ភាគរយ(%)', '%', 1),
(gen_random_uuid(), (SELECT id FROM sd), '2', '២. ភាគរយចំនួនប្រ�ជាពលរដ្ឋគ្រប់អាយុ១៨ឆ្នាំ ទៅចុះឈ្មោះបោះឆ្នោតឆ្នាំត្រឹម២០២៥', NULL, 'percentage', 'ភាគរយ(%)', '%', 2),
(gen_random_uuid(), (SELECT id FROM sd), '3', '៣. ភាគរយន៏ចំនួនប្រ�ជាពលរដ្ឋមានឈ្មោះបោះឆ្នោត បានទៅបោះឆ្នោតឃុំ សង្កាត់ឆ្នាំ២០១៧', NULL, 'percentage', 'ភាគរយ(%)', '%', 3),
(gen_random_uuid(), (SELECT id FROM sd), '4', '៤. ភាគរយន៏ចំនួនប្រជាពលរដ្ឋមានឈ្មោៈបោះឆ្នោត បានទៅបោះឆ្នោតឃុំ សង្កាត់ឆ្នាំ២០២២', NULL, 'percentage', 'ភាគរយ(%)', '%', 4),
(gen_random_uuid(), (SELECT id FROM sd), '5', '៥. ករណីអំពើហិង្សាពាក់ព័ន្ធនឹងការបោះឆ្នោតតំណាងរាស្រ្តឆ្នាំ២០២៣', NULL, 'number', 'ករណី', 'cases', 5),
(gen_random_uuid(), (SELECT id FROM sd), '6', '៦. ករណីអំពើហិង្សាពាក់ព័ន្ធនឹងការបោះឆ្នោតឃុំ សង្កាត់២០២២', NULL, 'number', 'ករណី', 'cases', 6),
(gen_random_uuid(), (SELECT id FROM sd), '7', '៧. ចំនួនសមាជិកក្រុមប្រឹក្សាឃុំ សង្កាត់មានសញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ (រាប់តែមាជិកមកពីគណបក្សប្រជាជនកម្ពុជា)', NULL, 'binary', 'នាក់', 'people', 7),
(gen_random_uuid(), (SELECT id FROM sd), '8', '៨. ចំនួនសមាជិកក្រុមប្រឹក្សាឃុំ សង្កាត់មានបរិញ្ញបត្ររង (រាប់តែមាជិកមកពីគណបក្សប្រជាជនកម្ពុជា)', NULL, 'binary', 'នាក់', 'people', 8),
(gen_random_uuid(), (SELECT id FROM sd), '9', '៩. ចំនួនសមាជិកក្រុមប្រឹក្សាឃុំ សង្កាត់មានបរិញ្ញបត្រ (រាប់តែមាជិកមកពីគណបក្សប្រជាជនកម្ពុជា)', NULL, 'binary', 'នាក់', 'people', 9),
(gen_random_uuid(), (SELECT id FROM sd), '10', '១០. ចំនួនសមាជិកក្រុមប្រឹក្សាឃុំ សង្កាត់មានបរិញ្ញបត្រជាន់ខ្ពស់ឡើង(រាប់តែមាជិកមកពីគណបក្សប្រជាជនកម្ពុជា)', NULL, 'binary', 'នាក់', 'people', 10),
(gen_random_uuid(), (SELECT id FROM sd), '11', '១១. ចំនួនសមាជិកក្រុមប្រឹក្សាឃុំ សង្កាត់ដែលត្រូវដកចេញពីមុខតំណែងដោយសារ ឬទទួលទណ្ឌកម្មវិន័យពាក់ព័ន្ធអាកប្បកិរិយា មិនស្អាតស្អំ ការមិនគោរពច្បាប់ ការរើសអើង', NULL, 'binary', 'នាក់', 'people', 11),
(gen_random_uuid(), (SELECT id FROM sd), '12', '១២. ចំនួនសរុបន៏សមាជិកក្រុមប្រឹក្សាឃុំ សង្កាត់(រាប់តែមាជិកមកពីគណបក្សប្រជាជនកម្ពុជា)', NULL, 'number', 'នាក់', 'people', 12),
(gen_random_uuid(), (SELECT id FROM sd), '13', '១៣. ចំនួនសមាជិកក្រុមប្រឹក្សាឃុំ សង្កាត់ជាស្រ្តី (រាប់តែមាជិកមកពីគណបក្សប្រជាជនកម្ពុជា)', NULL, 'number', 'នាក់', 'people', 13),
(gen_random_uuid(), (SELECT id FROM sd), '14', '១៤. ចំនួនសមាជិកក្រុមប្រឹក្សាឃុំ សង្កាត់ជាយុវជន (ក្រោម៤៥ឆ្នាំ)', NULL, 'number', 'នាក់', 'people', 14),
(gen_random_uuid(), (SELECT id FROM sd), '15', '១៥. ចំនួនសរុបស្មៀនឃុំ សង្កាត់', NULL, 'number', 'នាក់', 'people', 15),
(gen_random_uuid(), (SELECT id FROM sd), '16', '១៦. ចំនួនសរុបស្មៀនឃុំ សង្កាត់ជាស្ត្រី', NULL, 'number', 'នាក់', 'people', 16),
(gen_random_uuid(), (SELECT id FROM sd), '17', '១៧. ចំនួនសរុបស្មៀនឃុំ សង្កាត់ជាជាយុវជន (ក្រោម៤៥ឆ្នាំ)', NULL, 'number', 'នាក់', 'people', 17),
(gen_random_uuid(), (SELECT id FROM sd), '18', '១៨. ចំនួនសរុបថ្នាក់ដឹកនាំភូមិ', NULL, 'number', 'នាក់', 'people', 18),
(gen_random_uuid(), (SELECT id FROM sd), '19', '១៩. ចំនួនថ្នាក់ដឹកនាំភូមិជាស្រ្តី', NULL, 'number', 'នាក់', 'people', 19),
(gen_random_uuid(), (SELECT id FROM sd), '20', '២០. ចំនួនថ្នាក់ដឹកនាំភូមិជាជាយុវជន (ក្រោម៤៥ឆ្នាំ)', NULL, 'number', 'នាក់', 'people', 20);

-- Indicators for 1.2
WITH sd AS (SELECT id FROM performance_sub_domains WHERE code = '1.2')
INSERT INTO performance_indicators (id, sub_domain_id, code, name_kh, name_en, data_type, unit_kh, unit_en, sort_order) VALUES
(gen_random_uuid(), (SELECT id FROM sd), '1', '១. ចំនួនករណីរំលោភសិទ្ធិមនុស្សពាក់ព័ន្ធនឹងការប្រកាន់ពូជសាសន៍ ពណ៌សម្បុរ ភេទ ភាសា ជំនឿសាសនា និន្នាការនយោបាយ អតីតកាល ដើមកំណើតជាតិ ឋានៈសង្គម ធនធាន ឬស្ថានភាពឯទៀត', NULL, 'number', 'ករណី', 'cases', 1),
(gen_random_uuid(), (SELECT id FROM sd), '2', '២. ចំនួនប្រជាពលរដ្ឋដែលបានចូលរួមវេទិកាសាធារណៈរបស់ឃុំ សង្កាត់', NULL, 'number', 'នាក់', 'people', 2),
(gen_random_uuid(), (SELECT id FROM sd), '3', '៣. ចំនួនប្រជាពលរដ្ឋដែលបានចូលរួមកិៅប្រជុំក្រុមប្រឹក្សាឃុំ សង្កាត់', NULL, 'number', 'នាក់', 'people', 3),
(gen_random_uuid(), (SELECT id FROM sd), '4', '៤. ចំនួនប្រជាពលរដ្ឋចូលរួមក្នុងដំណើរការរៀបចំផែនការអភិវឌ្ព និងកម្មវិធីវិនិយោគ៣ឆ្នាំរំកិលរបស់ឃុំ សង្កាត់', NULL, 'number', 'នាក់', 'people', 4),
(gen_random_uuid(), (SELECT id FROM sd), '5', '៥. ឃុំ សង្កាត់ដែលបានបង្កើតគណកម្មការគ្រប់គ្រងគម្រោងដែលមានការចូលរួមពីប្រជាពលរដ្ឋ', NULL, 'binary', 'មាន / មិនមាន', 'Yes / No', 5),
(gen_random_uuid(), (SELECT id FROM sd), '6', '៦. ចំនួនប្រជាពលរដ្ឋដែលបានទទួលសេវារដ្ឋបាលឃុំ សង្កាត់', NULL, 'number', 'នាក់', 'people', 6),
(gen_random_uuid(), (SELECT id FROM sd), '7', '៧. ចំនួនគម្រោង (សេវាសង្គម និងហេដ្ឋារចនាសម្ព័ន្ធ) ដែលបានរៀបចំ និងអនុវត្តដោយឃុំ សង្កាត់', NULL, 'number', 'គម្រោង', 'projects', 7),
(gen_random_uuid(), (SELECT id FROM sd), '8', '៨. សំណើ សំណូមពរ ក្តីកង្វល់ និងបញ្ហាប្រឈមនានារបស់ប្រជាពលរដ្ឋពាក់ព័ន្ធនឹងការ�ផ្តល់សេវា', NULL, 'number', 'ករណី', 'cases', 8),
(gen_random_uuid(), (SELECT id FROM sd), '9', '៩. ការសម្រុះសម្រួលដោះស្រាយសំណើ សំណូមពរ ក្តីកង្វល់ និងបញ្ហាប្រឈមនានា', NULL, 'number', 'ករណី', 'cases', 9);

-- Indicators for 1.3
WITH sd AS (SELECT id FROM performance_sub_domains WHERE code = '1.3')
INSERT INTO performance_indicators (id, sub_domain_id, code, name_kh, name_en, data_type, unit_kh, unit_en, sort_order) VALUES
(gen_random_uuid(), (SELECT id FROM sd), '1', '១. វិវាទពាក់ព័ន្ធនឹងជំនឿ ប្រពៃណី និងសាសនាផ្សេងៗគ្នាន៏មូលដ្ឋាន', NULL, 'number', 'ករណី', 'cases', 1),
(gen_random_uuid(), (SELECT id FROM sd), '2', '២. ករីណវិវាទរវាងប្រជាពលរដ្ឋនិងប្រជាពលរដ្ឋពាក់ព័ន្ធនឹងនិន្នាការ នយោបាយ', NULL, 'number', 'ករណី', 'cases', 2),
(gen_random_uuid(), (SELECT id FROM sd), '3', '៣. ឃុំ សង្កាត់ដែលមានមណ្ឌល ទីធ្លាសាធារណៈ ឬអគារវប្បធម៌ក្នុងសហគមន៍ដែលសាធារណជនអាចមានការជួបជុំ ការសម្តែង និងការចែករំលែកនូវសិល្បៈ ប្រពៃណី ទំនៀមទម្លាប់ សាសនា និងចំណេះដឹងផ្សេងៗ', NULL, 'binary', 'មាន / មិនមាន', 'Yes / No', 3);
