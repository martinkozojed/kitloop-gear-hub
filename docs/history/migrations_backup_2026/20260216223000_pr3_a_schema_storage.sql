-- Migration: PR3-A Schema & Storage Readiness
-- Describes: Schema updates for soft delete (deleted_at), FK hardening, RLS enforcement, and Storage policies for direct upload.
BEGIN;
-- 1. Schema Updates
-- gear_items: Add deleted_at if missing
DO $$
DECLARE
    v_relkind "char";
BEGIN
    SELECT c.relkind
    INTO v_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'gear_items';

    IF v_relkind = 'r' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'gear_items'
              AND column_name = 'deleted_at'
        ) THEN
            ALTER TABLE public.gear_items
            ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
        END IF;
    ELSE
        RAISE NOTICE 'Skipping ALTER TABLE public.gear_items ADD COLUMN deleted_at; relkind=%', COALESCE(v_relkind::text, 'null');
    END IF;
END $$;
-- gear_images: Add deleted_at if missing
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'gear_images'
        AND column_name = 'deleted_at'
) THEN
ALTER TABLE public.gear_images
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
END IF;
END $$;
-- gear_images: Add provider_id if missing
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'gear_images'
        AND column_name = 'provider_id'
) THEN
ALTER TABLE public.gear_images
ADD COLUMN provider_id UUID DEFAULT NULL;
END IF;
END $$;
-- Backfill gear_images.provider_id from gear_items
-- Only updates rows where provider_id is NULL
UPDATE public.gear_images gi
SET provider_id = g.provider_id
FROM public.gear_items g
WHERE gi.gear_id = g.id
    AND gi.provider_id IS NULL;
-- Add Indexes
DO $$
DECLARE
    v_relkind "char";
BEGIN
    SELECT c.relkind
    INTO v_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'gear_items';

    IF v_relkind = 'r' THEN
        CREATE INDEX IF NOT EXISTS idx_gear_items_deleted_at ON public.gear_items(deleted_at);
    ELSE
        RAISE NOTICE 'Skipping index idx_gear_items_deleted_at on public.gear_items; relkind=%', COALESCE(v_relkind::text, 'null');
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_gear_images_deleted_at ON public.gear_images(deleted_at);
CREATE INDEX IF NOT EXISTS idx_gear_images_provider_id ON public.gear_images(provider_id);
-- Add Foreign Keys safely
DO $$
DECLARE
    v_relkind "char";
BEGIN -- Ensure gear_items has FK to providers
    SELECT c.relkind
    INTO v_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'gear_items';

    IF v_relkind = 'r' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'gear_items_provider_id_fkey'
        ) THEN
            ALTER TABLE public.gear_items
            ADD CONSTRAINT gear_items_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);
        END IF;
    ELSE
        RAISE NOTICE 'Skipping ALTER TABLE public.gear_items ADD CONSTRAINT gear_items_provider_id_fkey; relkind=%', COALESCE(v_relkind::text, 'null');
    END IF;

-- Ensure gear_images has FK to providers
IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gear_images_provider_id_fkey'
) THEN
ALTER TABLE public.gear_images
ADD CONSTRAINT gear_images_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);
END IF;
END $$;
-- 2. RLS Policies (Table Security)
-- Enable RLS
DO $$
DECLARE
    v_relkind "char";
BEGIN
    SELECT c.relkind
    INTO v_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'gear_items';

    IF v_relkind = 'r' THEN
        ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;
    ELSE
        RAISE NOTICE 'Skipping ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY; relkind=%', COALESCE(v_relkind::text, 'null');
    END IF;
END $$;
ALTER TABLE public.gear_images ENABLE ROW LEVEL SECURITY;
-- Drop obsolete policies to avoid conflicts
DO $$
DECLARE
    v_relkind "char";
BEGIN
    SELECT c.relkind
    INTO v_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'gear_items';

    IF v_relkind = 'r' THEN
        DROP POLICY IF EXISTS "Authenticated users can insert" ON public.gear_items;
        DROP POLICY IF EXISTS "Provider can delete own gear" ON public.gear_items;
        DROP POLICY IF EXISTS "Provider can update own gear" ON public.gear_items;
    ELSE
        RAISE NOTICE 'Skipping DROP POLICY on public.gear_items; relkind=%', COALESCE(v_relkind::text, 'null');
    END IF;
END $$;
-- Drop possibly existing policies on gear_images
DROP POLICY IF EXISTS "Providers can manage own gear images" ON public.gear_images;
-- Gear Items Policies (Approved Owner Only)
DO $$
DECLARE
    v_relkind "char";
BEGIN
    SELECT c.relkind
    INTO v_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'gear_items';

    IF v_relkind = 'r' THEN
        CREATE POLICY "provider_select_own_gear" ON public.gear_items FOR
        SELECT TO authenticated USING (
                (deleted_at IS NULL)
                AND EXISTS (
                    SELECT 1
                    FROM public.providers p
                    WHERE p.id = gear_items.provider_id
                        AND p.user_id = auth.uid()
                )
            );
        CREATE POLICY "provider_insert_own_gear" ON public.gear_items FOR
        INSERT TO authenticated WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.providers p
                    WHERE p.id = gear_items.provider_id
                        AND p.user_id = auth.uid()
                        AND p.status = 'approved'
                        AND p.verified = true
                )
            );
        CREATE POLICY "provider_update_own_gear" ON public.gear_items FOR
        UPDATE TO authenticated USING (
                EXISTS (
                    SELECT 1
                    FROM public.providers p
                    WHERE p.id = gear_items.provider_id
                        AND p.user_id = auth.uid()
                        AND p.status = 'approved'
                        AND p.verified = true
                )
            ) WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.providers p
                    WHERE p.id = gear_items.provider_id
                        AND p.user_id = auth.uid()
                        AND p.status = 'approved'
                        AND p.verified = true
                )
            );
    ELSE
        RAISE NOTICE 'Skipping CREATE POLICY on public.gear_items; relkind=%', COALESCE(v_relkind::text, 'null');
    END IF;
END $$;
-- Gear Images Policies (Approved Owner Only)
CREATE POLICY "provider_select_own_images" ON public.gear_images FOR
SELECT TO authenticated USING (
        (deleted_at IS NULL)
        AND EXISTS (
            SELECT 1
            FROM public.providers p
            WHERE p.id = gear_images.provider_id
                AND p.user_id = auth.uid()
        )
    );
CREATE POLICY "provider_insert_own_images" ON public.gear_images FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.providers p
            WHERE p.id = gear_images.provider_id
                AND p.user_id = auth.uid()
                AND p.status = 'approved'
                AND p.verified = true
        )
    );
CREATE POLICY "provider_update_own_images" ON public.gear_images FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.providers p
            WHERE p.id = gear_images.provider_id
                AND p.user_id = auth.uid()
                AND p.status = 'approved'
                AND p.verified = true
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.providers p
            WHERE p.id = gear_images.provider_id
                AND p.user_id = auth.uid()
                AND p.status = 'approved'
                AND p.verified = true
        )
    );
-- 3. Storage Policies (Bucket 'gear-images')
-- Ensure 'gear-images' bucket is public (per previous setup, kept as is, but policies lock write)
-- We add explicit policies for authenticated providers.
CREATE POLICY "provider_upload_gear_images" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (
        bucket_id = 'gear-images'
        AND split_part(name, '/', 1) = 'providers'
        AND (split_part(name, '/', 2))::uuid IN (
            SELECT id
            FROM public.providers
            WHERE user_id = auth.uid()
                AND status = 'approved'
                AND verified = true
        )
    );
CREATE POLICY "provider_read_own_images" ON storage.objects FOR
SELECT TO authenticated USING (
        bucket_id = 'gear-images'
        AND split_part(name, '/', 1) = 'providers'
        AND (split_part(name, '/', 2))::uuid IN (
            SELECT id
            FROM public.providers
            WHERE user_id = auth.uid()
        )
    );
CREATE POLICY "provider_delete_own_images" ON storage.objects FOR DELETE TO authenticated USING (
    bucket_id = 'gear-images'
    AND split_part(name, '/', 1) = 'providers'
    AND (split_part(name, '/', 2))::uuid IN (
        SELECT id
        FROM public.providers
        WHERE user_id = auth.uid()
            AND status = 'approved'
            AND verified = true
    )
);
COMMIT;