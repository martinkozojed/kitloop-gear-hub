-- Kit Bundles: DB schema for kit templates and group reservations
-- Design: Kit = UX aggregation. Kit reservation creates N standard reservations
-- with shared group_id. Truth stays per-asset / per-reservation.
-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Kit template tables
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.kit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kit_id UUID NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_required BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0
);
-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Extend reservations with group_id and kit_template_id
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS group_id UUID,
    ADD COLUMN IF NOT EXISTS kit_template_id UUID REFERENCES public.kits(id);
COMMENT ON COLUMN public.reservations.group_id IS 'Shared UUID for all reservations created from a single kit instance. NULL = single-item reservation.';
COMMENT ON COLUMN public.reservations.kit_template_id IS 'Reference to the kit template used to create this reservation. NULL = single-item. For audit/label only.';
-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Indexes
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_kits_provider ON public.kits(provider_id)
WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kit_items_kit ON public.kit_items(kit_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_reservations_group ON public.reservations(provider_id, group_id)
WHERE group_id IS NOT NULL;
-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. RLS Policies (provider membership pattern)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;
-- kits: SELECT
CREATE POLICY "Kits viewable by provider members" ON public.kits FOR
SELECT USING (
        provider_id IN (
            SELECT provider_id
            FROM public.user_provider_memberships
            WHERE user_id = auth.uid()
        )
    );
-- kits: INSERT
CREATE POLICY "Kits insertable by provider members" ON public.kits FOR
INSERT WITH CHECK (
        provider_id IN (
            SELECT provider_id
            FROM public.user_provider_memberships
            WHERE user_id = auth.uid()
        )
    );
-- kits: UPDATE
CREATE POLICY "Kits updatable by provider members" ON public.kits FOR
UPDATE USING (
        provider_id IN (
            SELECT provider_id
            FROM public.user_provider_memberships
            WHERE user_id = auth.uid()
        )
    );
-- kits: DELETE
CREATE POLICY "Kits deletable by provider members" ON public.kits FOR DELETE USING (
    provider_id IN (
        SELECT provider_id
        FROM public.user_provider_memberships
        WHERE user_id = auth.uid()
    )
);
-- kit_items: SELECT (via kit.provider_id)
CREATE POLICY "Kit items viewable by kit provider members" ON public.kit_items FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.kits k
            WHERE k.id = kit_items.kit_id
                AND k.provider_id IN (
                    SELECT provider_id
                    FROM public.user_provider_memberships
                    WHERE user_id = auth.uid()
                )
        )
    );
-- kit_items: INSERT
CREATE POLICY "Kit items insertable by kit provider members" ON public.kit_items FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.kits k
            WHERE k.id = kit_items.kit_id
                AND k.provider_id IN (
                    SELECT provider_id
                    FROM public.user_provider_memberships
                    WHERE user_id = auth.uid()
                )
        )
    );
-- kit_items: UPDATE
CREATE POLICY "Kit items updatable by kit provider members" ON public.kit_items FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.kits k
            WHERE k.id = kit_items.kit_id
                AND k.provider_id IN (
                    SELECT provider_id
                    FROM public.user_provider_memberships
                    WHERE user_id = auth.uid()
                )
        )
    );
-- kit_items: DELETE
CREATE POLICY "Kit items deletable by kit provider members" ON public.kit_items FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.kits k
        WHERE k.id = kit_items.kit_id
            AND k.provider_id IN (
                SELECT provider_id
                FROM public.user_provider_memberships
                WHERE user_id = auth.uid()
            )
    )
);