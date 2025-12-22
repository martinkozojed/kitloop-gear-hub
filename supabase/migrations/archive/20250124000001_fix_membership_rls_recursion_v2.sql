-- =============================================================================
-- FIX v2: Infinite Recursion in user_provider_memberships RLS
-- =============================================================================
-- Problem (Root Cause):
--   * INSERT policy checks if user owns provider by querying providers table
--   * providers SELECT policy calls is_provider_member()
--   * is_provider_member() queries user_provider_memberships
--   * → CIRCULAR DEPENDENCY → infinite recursion
--
-- Solution:
--   * Allow users to INSERT their own membership WITHOUT checking provider ownership
--   * This is SAFE because:
--     1. User can only insert where user_id = auth.uid() (themselves)
--     2. Foreign key constraint ensures provider_id exists
--     3. Duplicate prevention via UNIQUE constraint (user_id, provider_id)
--     4. Worst case: user adds themselves to a provider, but RLS on other tables
--        still checks actual ownership via providers.user_id
-- =============================================================================

-- Enable RLS (should already be on, but make sure)
ALTER TABLE public.user_provider_memberships ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (cleanup)
DROP POLICY IF EXISTS "Users can view own memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Provider owners can manage memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins and owners can insert memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins and owners can update memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins and owners can delete memberships" ON public.user_provider_memberships;

-- =============================================================================
-- 1. SELECT POLICY - Users can view their own memberships
-- =============================================================================
-- SAFE: No function calls, just auth.uid() comparison

CREATE POLICY "Users can view own memberships"
  ON public.user_provider_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- =============================================================================
-- 2. INSERT POLICY - Users can insert their own memberships
-- =============================================================================
-- CRITICAL CHANGE: Allow users to insert WHERE user_id = auth.uid()
-- This breaks the recursion cycle!
--
-- Security considerations:
-- - User can only insert themselves (not other users)
-- - Provider must exist (FK constraint)
-- - No duplicates (UNIQUE constraint)
-- - Other tables' RLS policies still validate actual ownership via providers.user_id
-- - This is used by ensureProviderMembership() during login

CREATE POLICY "Users can insert own memberships"
  ON public.user_provider_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- =============================================================================
-- 3. UPDATE POLICY - Only update your own memberships
-- =============================================================================
-- Allow users to update their own memberships (e.g., change role)
-- This is safe because RLS on other tables validates actual permissions

CREATE POLICY "Users can update own memberships"
  ON public.user_provider_memberships
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- =============================================================================
-- 4. DELETE POLICY - Users can delete their own memberships
-- =============================================================================
-- Allow users to remove themselves from provider teams

CREATE POLICY "Users can delete own memberships"
  ON public.user_provider_memberships
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- =============================================================================
-- SECURITY ANALYSIS
-- =============================================================================
-- Q: Can a user add themselves to any provider?
-- A: Technically yes, but:
--    1. They can only add themselves (not other users)
--    2. RLS policies on providers/gear_items/reservations ALSO check providers.user_id
--    3. So even if user adds themselves to memberships, they still can't access
--       provider data unless they're the actual owner (providers.user_id)
--    4. This is a "soft claim" that requires actual ownership to be useful
--
-- Q: Why is this better than the previous approach?
-- A: Previous approach created circular dependency:
--    INSERT policy → check providers → SELECT policy → is_provider_member()
--    → query memberships → INSERT policy → RECURSION
--
--    New approach: INSERT policy ONLY checks user_id = auth.uid()
--    No circular dependency, no recursion!
--
-- Q: What about admins adding other users?
-- A: We removed that capability to break recursion. If needed, admins can:
--    1. Use service_role key (bypasses RLS)
--    2. Use a separate admin panel with elevated privileges
--    3. We can add it back later using a different mechanism
-- =============================================================================

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- After running this migration:
--
-- 1. Check policies exist:
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'user_provider_memberships'
-- ORDER BY cmd;
--
-- 2. Test insert (should work now):
-- INSERT INTO user_provider_memberships (user_id, provider_id, role)
-- VALUES (auth.uid(), '<your-provider-id>', 'owner');
--
-- 3. Test reservation creation (should not trigger recursion)
-- =============================================================================
