-- =============================================================================
-- FIX: Infinite Recursion in user_provider_memberships RLS
-- =============================================================================
-- Problem:
--   * user_provider_memberships table has RLS enabled but NO policies
--   * When is_provider_member() tries to read from it, it triggers infinite recursion
--   * This blocks ALL reservation creation
--
-- Solution:
--   * Add simple RLS policies that allow users to read their own memberships
--   * Use auth.uid() directly (no helper functions to avoid recursion)
-- =============================================================================

-- Enable RLS (should already be on, but make sure)
ALTER TABLE public.user_provider_memberships ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (cleanup)
DROP POLICY IF EXISTS "Users can view own memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Provider owners can manage memberships" ON public.user_provider_memberships;

-- =============================================================================
-- 1. SELECT POLICY - Users can view their own memberships
-- =============================================================================
-- IMPORTANT: Use auth.uid() directly, NO function calls to avoid recursion!

CREATE POLICY "Users can view own memberships"
  ON public.user_provider_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- =============================================================================
-- 2. INSERT POLICY - Only admins or provider owners can add memberships
-- =============================================================================

CREATE POLICY "Admins and owners can insert memberships"
  ON public.user_provider_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin check (safe - doesn't touch user_provider_memberships)
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
    OR
    -- Provider owner check (safe - uses providers.user_id directly)
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 3. UPDATE POLICY - Only admins or provider owners can update memberships
-- =============================================================================

CREATE POLICY "Admins and owners can update memberships"
  ON public.user_provider_memberships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 4. DELETE POLICY - Only admins or provider owners can delete memberships
-- =============================================================================

CREATE POLICY "Admins and owners can delete memberships"
  ON public.user_provider_memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
  );

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After this migration, test:
-- 1. Create reservation → should work (no more infinite recursion)
-- 2. Check memberships → users should only see their own
-- 3. Admin actions → should work
-- =============================================================================
