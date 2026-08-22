-- Migration: Update test / dummy member records (#1, #2, #3, #4) to realistic data
-- Timestamp: 20260822160000

BEGIN;

-- 1. Update record #1 (card: ៨៧៦៥៤៣២)
UPDATE public.members
SET 
    membership_card_no = 'MEM-006',
    national_id = '010203040506',
    last_name_kh = 'ស៊ឹម',
    first_name_kh = 'សុភាព',
    last_name_en = 'Sim',
    first_name_en = 'Sopheap',
    gender = 'Male',
    phone_number = '0122334455',
    party_role = 'Member',
    status = 'Active',
    membership_type = 'Full',
    membership_tier = 'Silver',
    join_date = '2012-09-25'
WHERE membership_card_no = '៨៧៦៥៤៣២' OR national_id = 'ថដាសថដាសv';

-- 2. Update record #2 (card: 9876543)
UPDATE public.members
SET 
    membership_card_no = 'MEM-007',
    national_id = '010203040507',
    last_name_kh = 'សាន',
    first_name_kh = 'សុភ័ក្រ',
    last_name_en = 'San',
    first_name_en = 'Sophak',
    gender = 'Female',
    phone_number = '0988776655',
    party_role = 'Treasurer',
    status = 'Active',
    membership_type = 'Full',
    membership_tier = 'Platinum',
    join_date = '2016-07-19'
WHERE membership_card_no = '9876543' OR (last_name_kh = 'kjhgfds' AND first_name_kh = 'jhgfds');

-- 3. Update record #3 (card: sak)
UPDATE public.members
SET 
    membership_card_no = 'MEM-008',
    national_id = '010203040508',
    last_name_kh = 'ប៉ែន',
    first_name_kh = 'សុវណ្ណ',
    last_name_en = 'Pen',
    first_name_en = 'Sovanna',
    gender = 'Male',
    phone_number = '0166554433',
    party_role = 'Member',
    status = 'Resigned',
    membership_type = 'Full',
    membership_tier = 'Basic',
    resignation_date = '2023-12-03',
    join_date = '2013-12-03'
WHERE membership_card_no = 'sak' OR national_id = '98765432';

-- 4. Update record #4 (card: 0987654321)
UPDATE public.members
SET 
    membership_card_no = 'MEM-009',
    national_id = '010203040509',
    last_name_kh = 'ហេង',
    first_name_kh = 'សុភាព',
    last_name_en = 'Heng',
    first_name_en = 'Sopheap',
    gender = 'Female',
    phone_number = '0199887766',
    party_role = 'Member',
    status = 'Active',
    membership_type = 'Associate',
    membership_tier = 'Gold',
    join_date = '2017-04-22'
WHERE membership_card_no = '0987654321' OR (last_name_kh = 'Sok' AND first_name_kh = 'Sok');

COMMIT;
