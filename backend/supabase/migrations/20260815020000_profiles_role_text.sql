-- Convert profiles.role to text so ANY custom role works, with no blockers.
--
-- Strategy (all in one migration):
--   1. Save every policy whose definition touches get_user_role() or
--      profiles.role, then DROP those policies (they block ALTER TYPE).
--   2. DROP get_user_role() (it returns user_role, and you cannot change a
--      function's return type in place).
--   3. ALTER profiles.role TYPE text.
--   4. Recreate get_user_role() returning text.
--   5. Recreate the dropped policies with their original definitions.

-- Step 1a: stash definitions of policies that depend on the enum.
CREATE TEMP TABLE _pending_policies ON COMMIT DROP AS
SELECT
  p.schemaname,
  p.tablename,
  p.policyname,
  p.cmd,
  p.roles,
  p.qual,
  p.with_check
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND (
    p.qual ILIKE '%get_user_role%'
    OR p.with_check ILIKE '%get_user_role%'
    OR p.qual ILIKE '%from profiles%'
    OR p.with_check ILIKE '%from profiles%'
  );

-- Step 1b: drop them.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT schemaname, tablename, policyname FROM _pending_policies
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Step 2: drop the function (returns the old enum type).
DROP FUNCTION IF EXISTS get_user_role();

-- Step 3: convert the column to text.
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE text USING role::text;

-- Step 4: recreate the helper returning text.
CREATE FUNCTION get_user_role()
RETURNS text AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;

-- Step 5: recreate all saved policies verbatim.
DO $$
DECLARE
  r RECORD;
  roles_list text;
  qual text;
  with_check text;
BEGIN
  FOR r IN SELECT * FROM _pending_policies
  LOOP
    IF r.roles IS NULL OR array_length(r.roles, 1) IS NULL OR r.roles = ARRAY['public']::name[] THEN
      roles_list := '';
    ELSE
      roles_list := ' TO ' || (
        SELECT string_agg(quote_ident(role::text), ', ' ORDER BY ordinality)
        FROM unnest(r.roles) WITH ORDINALITY AS u(role, ordinality)
      );
    END IF;

    -- Stored quals were deparsed while get_user_role() returned user_role,
    -- so they contain '::user_role' casts that no longer exist.
    qual := replace(COALESCE(r.qual::text, 'true'), '::user_role', '::text');
    with_check := r.with_check::text;
    IF with_check IS NOT NULL THEN
      with_check := replace(with_check, '::user_role', '::text');
    END IF;

    IF r.cmd = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR INSERT %s WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename, roles_list, COALESCE(with_check, 'true')
      );
    ELSIF r.cmd = 'ALL' AND with_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR ALL %s USING (%s) WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename, roles_list, qual, with_check
      );
    ELSIF with_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR %s %s USING (%s) WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename, r.cmd, roles_list, qual, with_check
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR %s %s USING (%s)',
        r.policyname, r.schemaname, r.tablename, r.cmd, roles_list, qual
      );
    END IF;
  END LOOP;
END $$;
