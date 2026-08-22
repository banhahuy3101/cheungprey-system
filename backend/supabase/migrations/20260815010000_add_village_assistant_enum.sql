-- Allow custom roles (e.g. village_assistant) on the profiles.role enum column.
-- Custom roles already live in the roles + user_roles tables; this makes the
-- legacy profiles.role enum accept them so profile updates don't fail.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'village_assistant';
