-- Remove Membership Fee transaction type; finance scoped to commune (6-char zone codes)
UPDATE public.party_finances
SET transaction_type = 'Donation'
WHERE transaction_type = 'Membership Fee';

UPDATE public.party_finances
SET zone_code = LEFT(zone_code, 6)
WHERE LENGTH(zone_code) > 6;

ALTER TABLE public.party_finances DROP CONSTRAINT IF EXISTS party_finances_transaction_type_check;
ALTER TABLE public.party_finances
  ADD CONSTRAINT party_finances_transaction_type_check
  CHECK (transaction_type IN ('Donation', 'Event Fundraising', 'Expense'));

UPDATE public.finance_budgets
SET zone_code = LEFT(zone_code, 6)
WHERE LENGTH(zone_code) > 6;
