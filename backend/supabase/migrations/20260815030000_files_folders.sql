-- Document Archive: folder-based file management.
-- Adds nested folders (self-referential), folder_id on party_files,
-- soft-delete (deleted_at), and updated_at tracking for both tables.

BEGIN;

-- ============================================================
-- 1. party_folders — self-referential nested folders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.party_folders (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    parent_id  UUID REFERENCES public.party_folders(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (name <> ''),
    CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX IF NOT EXISTS idx_party_folders_parent
    ON public.party_folders(parent_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_party_folders_deleted
    ON public.party_folders(deleted_at);

-- Unique folder name within the same parent (among non-deleted folders).
CREATE UNIQUE INDEX IF NOT EXISTS uq_party_folders_name_parent
    ON public.party_folders(COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'), name)
    WHERE deleted_at IS NULL;

-- ============================================================
-- 2. Add folder_id, updated_at, deleted_at to party_files
-- ============================================================
ALTER TABLE public.party_files
    ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.party_folders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_party_files_folder
    ON public.party_files(folder_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_party_files_deleted
    ON public.party_files(deleted_at);

-- Backfill updated_at for existing rows (uses default NOW() but explicit for clarity).
UPDATE public.party_files SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;

-- ============================================================
-- 3. updated_at trigger function (shared by both tables)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_party_folders_updated_at ON public.party_folders;
CREATE TRIGGER trg_party_folders_updated_at
    BEFORE UPDATE ON public.party_folders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_party_files_updated_at ON public.party_files;
CREATE TRIGGER trg_party_files_updated_at
    BEFORE UPDATE ON public.party_files
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. Row Level Security (app uses service-role AdminClient which
--    bypasses RLS, but protect direct Supabase access too).
-- ============================================================
ALTER TABLE public.party_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_files  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can manage folders" ON public.party_folders;
CREATE POLICY "Authenticated can manage folders"
    ON public.party_folders FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- party_files had no RLS before; add a permissive authenticated policy.
DROP POLICY IF EXISTS "Authenticated can manage files" ON public.party_files;
CREATE POLICY "Authenticated can manage files"
    ON public.party_files FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;