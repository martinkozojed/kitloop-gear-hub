-- =============================================================================
-- KITLOOP - PROVIDER MEMBERSHIPS, RBAC HELPERS & RLS UPDATES
-- =============================================================================
-- Context:
--   * Supersedes earlier single-owner assumptions (providers.user_id).
--   * Introduces user_provider_memberships and helper functions used by RLS,
--     enabling multi-admin/provider management without changing existing owners.
-- =============================================================================

-- =============================================================================
-- 1. USER MEMBERSHIP TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_provider_memberships (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','manager','staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_upm_provider
  ON public.user_provider_memberships(provider_id);
-- =============================================================================
-- 2. HELPER FUNCTIONS (ADMIN & MEMBERSHIP)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  );
$$;
CREATE OR REPLACE FUNCTION public.is_provider_member(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = pid
        AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = pid
        AND pr.user_id = auth.uid()
    );
$$;
-- =============================================================================
-- 3. PROVIDERS RLS
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view verified providers" ON public.providers;
DROP POLICY IF EXISTS "Providers can update own data" ON public.providers;
DROP POLICY IF EXISTS "Providers can insert own data" ON public.providers;
CREATE POLICY "Providers select visibility"
  ON public.providers FOR SELECT
  USING (
    verified = true
    OR public.is_provider_member(id)
    OR public.is_admin()
  );
CREATE POLICY "Providers insert ownership"
  ON public.providers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin()
  );
CREATE POLICY "Providers update ownership"
  ON public.providers FOR UPDATE
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  )
  WITH CHECK (
    public.is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );
CREATE POLICY "Providers delete ownership"
  ON public.providers FOR DELETE
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );
-- =============================================================================
-- 4. GEAR ITEMS RLS
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view active gear" ON public.gear_items;
DROP POLICY IF EXISTS "Providers can manage own gear" ON public.gear_items;
CREATE POLICY "Public can view verified gear"
  ON public.gear_items FOR SELECT
  USING (
    active = true
    AND EXISTS (
      SELECT 1
      FROM public.providers p
      WHERE p.id = provider_id
        AND p.verified = true
    )
  );
CREATE POLICY "Provider members manage gear"
  ON public.gear_items FOR ALL
  TO authenticated
  USING (
    public.is_provider_member(provider_id)
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_provider_member(provider_id)
    OR public.is_admin()
  );
-- =============================================================================
-- 5. RESERVATIONS RLS
-- =============================================================================

DROP POLICY IF EXISTS "Providers can view own reservations by provider_id" ON public.reservations;
DROP POLICY IF EXISTS "Providers can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can update own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can manage own reservations" ON public.reservations;
CREATE POLICY "Provider members manage reservations"
  ON public.reservations FOR ALL
  TO authenticated
  USING (
    public.is_provider_member(provider_id)
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_provider_member(provider_id)
    OR public.is_admin()
  );
-- Existing customer-centric policies (user_id matching) remain unchanged.

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================;
