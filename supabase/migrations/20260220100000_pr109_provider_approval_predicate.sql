-- =============================================================================
-- PR109: Make provider approval atomic + single predicate
-- =============================================================================
-- Problem:
--   1. admin_approve_provider sets verified=TRUE but never sets approved_at.
--   2. The approval predicate is duplicated across 5+ locations with different
--      field combinations (some check approved_at, some don't).
--   3. No invariant prevents the invalid combo approved_at IS NOT NULL while
--      verified = false.
--
-- Fix:
--   1. Add public.is_provider_approved(uuid) as the single canonical predicate.
--   2. Fix admin_approve_provider to set verified=TRUE AND approved_at=now()
--      AND status='approved' atomically in one UPDATE.
--   3. Add a CHECK constraint that enforces: approved_at IS NOT NULL → verified = true.
--   4. Replace inline duplicated checks in RLS policies with calls to the
--      canonical predicate where the policy is purely about approval gating.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CANONICAL PREDICATE FUNCTION
-- =============================================================================
-- Definition: a provider is approved iff verified=true AND approved_at IS NOT NULL
-- AND deleted_at IS NULL (not soft-deleted).
-- This matches the strictest existing check (reserve_if_available, baseline RLS).
CREATE OR REPLACE FUNCTION public.is_provider_approved(p_provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.providers
    WHERE id = p_provider_id
      AND verified = true
      AND approved_at IS NOT NULL
      AND deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.is_provider_approved(uuid) IS
'Canonical approval predicate: returns true iff the provider is verified, has an approved_at timestamp, and is not soft-deleted. Use this everywhere instead of inline checks.';

-- anon must be able to call this function because public-facing SELECT policies
-- (providers_public_select, gear_items_public_select, etc.) apply to the anon
-- role. Without EXECUTE for anon those policies would throw "permission denied
-- for function is_provider_approved" on every unauthenticated request.
REVOKE ALL ON FUNCTION public.is_provider_approved(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_provider_approved(uuid) TO anon, authenticated, service_role;

-- =============================================================================
-- 2. FIX admin_approve_provider — set all three fields atomically
-- =============================================================================
-- Bug: previous version set verified=TRUE and status='approved' but NOT approved_at.
-- Result: is_provider_approved() returned false even after admin approval.
CREATE OR REPLACE FUNCTION public.admin_approve_provider(
  p_admin_id UUID,
  p_target_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, audit_log_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_audit_log_id UUID;
  v_provider_exists BOOLEAN;
BEGIN
  -- Verify admin permission (defensive check)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required'
      USING ERRCODE = '42501';
  END IF;

  -- Check if provider exists
  SELECT EXISTS (
    SELECT 1 FROM public.providers WHERE id = p_target_id
  ) INTO v_provider_exists;

  IF NOT v_provider_exists THEN
    RAISE EXCEPTION 'Provider not found'
      USING ERRCODE = 'P0001';
  END IF;

  -- ATOMIC: audit log first, then provider update — both in same transaction.
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    target_id,
    target_type,
    reason,
    metadata
  )
  VALUES (
    p_admin_id,
    'approve_provider',
    p_target_id,
    'provider',
    p_reason,
    jsonb_build_object(
      'timestamp', now(),
      'previous_status', (SELECT status FROM public.providers WHERE id = p_target_id)
    )
  )
  RETURNING id INTO v_audit_log_id;

  -- Set all three approval fields in one UPDATE so is_provider_approved() is
  -- immediately true after this call returns.
  UPDATE public.providers
  SET
    status      = 'approved',
    verified    = TRUE,
    approved_at = now(),
    updated_at  = now()
  WHERE id = p_target_id;

  RETURN QUERY SELECT
    TRUE,
    v_audit_log_id,
    'Provider approved successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.admin_approve_provider IS
'Atomically approve a provider: sets status=approved, verified=true, approved_at=now() and writes audit log in one transaction.';

-- Keep existing grants
GRANT EXECUTE ON FUNCTION public.admin_approve_provider(UUID, UUID, TEXT) TO authenticated;

-- =============================================================================
-- 3. INVARIANT GUARD — CHECK constraint
-- =============================================================================
-- Prevents the invalid state: approved_at IS NOT NULL while verified = false.
-- Safe for existing data: any row with approved_at set already has verified=true
-- (backfill below handles any stragglers before the constraint is added).
--
-- First, fix any existing rows that have approved_at set but verified=false
-- (defensive backfill — should be 0 rows in a healthy DB).
UPDATE public.providers
SET verified = true
WHERE approved_at IS NOT NULL
  AND verified = false;

-- Also fix rows that have verified=true but no approved_at (the bug we're fixing):
-- these were approved via the old admin_approve_provider that forgot approved_at.
UPDATE public.providers
SET approved_at = updated_at  -- best approximation: use last updated_at
WHERE verified = true
  AND approved_at IS NULL
  AND status = 'approved';

-- Now add the constraint.
ALTER TABLE public.providers
  DROP CONSTRAINT IF EXISTS chk_approved_at_requires_verified;

ALTER TABLE public.providers
  ADD CONSTRAINT chk_approved_at_requires_verified
  CHECK (
    approved_at IS NULL OR verified = true
  );

-- =============================================================================
-- 4. REPLACE DUPLICATED INLINE CHECKS WITH CANONICAL PREDICATE
--    (only for public-facing SELECT policies where the check is purely about
--     provider approval — not for owner/admin policies which intentionally
--     bypass the approval gate)
-- =============================================================================

-- 4a. providers_public_select (baseline_schema.sql)
-- Old: verified = true AND approved_at IS NOT NULL AND deleted_at IS NULL
-- New: is_provider_approved(id)
DROP POLICY IF EXISTS "providers_public_select" ON public.providers;
CREATE POLICY "providers_public_select"
  ON public.providers
  FOR SELECT
  USING (public.is_provider_approved(id));

-- 4b. "Public can view approved providers" (fix_provider_rls_final.sql)
-- Old: status = 'approved' AND verified = true  (missing approved_at check!)
-- New: is_provider_approved(id)
DROP POLICY IF EXISTS "Public can view approved providers" ON public.providers;
CREATE POLICY "Public can view approved providers"
  ON public.providers
  FOR SELECT
  TO authenticated, anon
  USING (public.is_provider_approved(id));

-- 4c. gear_items_public_select (baseline_schema.sql)
-- Old: active = true AND EXISTS (... p.verified = true AND p.approved_at IS NOT NULL AND p.deleted_at IS NULL)
-- New: active = true AND is_provider_approved(provider_id)
DROP POLICY IF EXISTS "gear_items_public_select" ON public.gear_items;
CREATE POLICY "gear_items_public_select"
  ON public.gear_items
  FOR SELECT
  USING (
    active = true
    AND public.is_provider_approved(provider_id)
  );

-- 4d. gear_select_public (baseline_schema.sql) — weaker duplicate, replace with canonical
-- Old: active = true AND EXISTS (... p.verified = true)  (missing approved_at!)
-- New: is_provider_approved(provider_id)
DROP POLICY IF EXISTS "gear_select_public" ON public.gear_items;
CREATE POLICY "gear_select_public"
  ON public.gear_items
  FOR SELECT
  USING (
    active = true
    AND public.is_provider_approved(provider_id)
  );

-- 4e. gear_images_public_select (baseline_schema.sql)
-- Old: gi.active = true AND p.verified = true AND p.approved_at IS NOT NULL AND p.deleted_at IS NULL
-- New: is_provider_approved(gi.provider_id)
DROP POLICY IF EXISTS "gear_images_public_select" ON public.gear_images;
CREATE POLICY "gear_images_public_select"
  ON public.gear_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.gear_items gi
      WHERE gi.id = gear_images.gear_id
        AND gi.active = true
        AND public.is_provider_approved(gi.provider_id)
    )
  );

-- 4f. provider_select_public (baseline_schema.sql)
-- Old: verified = true  (missing approved_at!)
-- New: is_provider_approved(id)
DROP POLICY IF EXISTS "provider_select_public" ON public.providers;
CREATE POLICY "provider_select_public"
  ON public.providers
  FOR SELECT
  USING (public.is_provider_approved(id));

COMMIT;
