-- Migration: Soft Deletes
-- Goal: Add `deleted_at` column and update RLS to hide deleted items.

BEGIN;

-- 1. Add deleted_at column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Update RLS Policies for Products
-- Drop existing public read to replace it
DROP POLICY IF EXISTS "Products: Public Read" ON public.products;
CREATE POLICY "Products: Public Read" ON public.products FOR SELECT USING (deleted_at IS NULL);

-- Update Write policy to also check deleted_at (optional, but good for consistency)
-- Actually, strict soft delete usually means you CAN update a deleted record (to restore it),
-- but for now let's leave Write keys as is, or require it to be not deleted to edit.
-- Let's stick to HIDING them in SELECTs.

-- 3. Update RLS Policies for Variants
DROP POLICY IF EXISTS "Variants: Public Read" ON public.product_variants;
CREATE POLICY "Variants: Public Read" ON public.product_variants FOR SELECT USING (deleted_at IS NULL);

-- 4. Update RLS Policies for Assets
-- Drop existing "Assets: Provider Only" to replace
-- Note: "Assets: Provider Only" was FOR ALL. We should split it or just update it?
-- Splitting is safer.
DROP POLICY IF EXISTS "Assets: Provider Only" ON public.assets;

-- Recreate as separate Select / Write to incorporate soft delete visibility
CREATE POLICY "Assets: Provider Read" ON public.assets FOR SELECT USING (
    deleted_at IS NULL AND (
        provider_id IN (
            SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
        ) OR 
        (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
        OR
        -- Also allow new RBAC check
        (public.get_my_role(provider_id) IS NOT NULL)
    )
);

CREATE POLICY "Assets: Provider Write" ON public.assets FOR INSERT WITH CHECK (
    provider_id IN (
        SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    ) OR 
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
    OR
    (public.get_my_role(provider_id) IN ('owner', 'staff'))
);

CREATE POLICY "Assets: Provider Update" ON public.assets FOR UPDATE USING (
    provider_id IN (
         SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    ) OR 
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
    OR
    (public.get_my_role(provider_id) IN ('owner', 'staff'))
);
-- Note: 'DELETE' policy is less relevant if we only Soft Delete, but we keep it for admins.
CREATE POLICY "Assets: Provider Delete" ON public.assets FOR DELETE USING (
     (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
     OR
     (public.get_my_role(provider_id) = 'owner')
);


-- 5. Update Reservations Policy
-- We created "rbac_reservation_all" in the previous step. We should update it or add a filter.
-- Since "rbac_reservation_all" is FOR ALL, we can't easily add `deleted_at IS NULL` to the USING clause 
-- because it would prevent UPDATING the deleted record (if we wanted to restore).
-- However, for simple Soft Delete, we generally want to hide it.
DROP POLICY IF EXISTS "rbac_reservation_all" ON public.reservations;

CREATE POLICY "rbac_reservation_select" ON public.reservations FOR SELECT USING (
    deleted_at IS NULL AND (
        (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
        OR
        public.get_my_role(provider_id) IS NOT NULL
    )
);

CREATE POLICY "rbac_reservation_write" ON public.reservations FOR INSERT WITH CHECK (
     (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
     OR
     public.get_my_role(provider_id) IS NOT NULL
);

CREATE POLICY "rbac_reservation_modify" ON public.reservations FOR UPDATE USING (
     (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
     OR
     public.get_my_role(provider_id) IS NOT NULL
);

-- 6. Add Indexes for performance (filtering by deleted_at is common now)
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_variants_deleted_at ON public.product_variants(deleted_at);
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON public.assets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_reservations_deleted_at ON public.reservations(deleted_at);

COMMIT;
