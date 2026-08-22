-- Migration: Remove "New Member Registration" (/membership/create) from menu_items
-- Timestamp: 20260822170000

BEGIN;

DELETE FROM public.menu_items
WHERE path = '/membership/create' OR id = '00000000-0000-0000-0000-000000000022';

COMMIT;
