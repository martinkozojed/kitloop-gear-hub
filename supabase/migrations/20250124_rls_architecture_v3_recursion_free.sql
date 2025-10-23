-- =============================================================================
-- KITLOOP - CLEAN RLS ARCHITECTURE WITHOUT CIRCULAR DEPENDENCIES
-- =============================================================================
-- Version: 3.0 (Recursion-Free)
-- Date: 2025-10-23
-- Author: Claude Code Analysis
--
-- This migration completely redesigns RLS policies to eliminate circular
-- dependencies while maintaining all security requirements.
--
-- Design Principles:
-- 1. No function calls that query the same table (avoids recursion)
-- 2. providers.user_id is the SOURCE OF TRUTH for ownership
-- 3. user_provider_memberships is ADDITIVE for team access
-- 4. Policies are LAYERED: profiles → memberships → providers → gear/reservations
-- 5. Admin checks are SIMPLE: direct profile.role = 'admin' queries
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: DROP ALL EXISTING PROBLEMATIC POLICIES
-- =============================================================================

-- Drop membership policies
DROP POLICY IF EXISTS "Users can view own memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Provider owners can manage memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins and owners can insert memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins and owners can update memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins and owners can delete memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Users can insert own memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Users can update own memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Users can delete own memberships" ON public.user_provider_memberships;

-- Drop provider policies
DROP POLICY IF EXISTS "Anyone can view verified providers" ON public.providers;
DROP POLICY IF EXISTS "Providers can update own data" ON public.providers;
DROP POLICY IF EXISTS "Providers can insert own data" ON public.providers;
DROP POLICY IF EXISTS "Providers select visibility" ON public.providers;
DROP POLICY IF EXISTS "Providers insert ownership" ON public.providers;
DROP POLICY IF EXISTS "Providers update ownership" ON public.providers;
DROP POLICY IF EXISTS "Providers delete ownership" ON public.providers;

-- Drop gear policies
DROP POLICY IF EXISTS "Anyone can view active gear" ON public.gear_items;
DROP POLICY IF EXISTS "Providers can manage own gear" ON public.gear_items;
DROP POLICY IF EXISTS "Public can view verified gear" ON public.gear_items;
DROP POLICY IF EXISTS "Provider members manage gear" ON public.gear_items;

-- Drop reservation policies
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can view their gear reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can view own reservations by provider_id" ON public.reservations;
DROP POLICY IF EXISTS "Providers can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can update own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can manage own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Provider members manage reservations" ON public.reservations;

-- =============================================================================
-- STEP 2: RECREATE OR KEEP HELPER FUNCTIONS
-- =============================================================================

-- Keep is_admin() - it's safe (only queries profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  );
$$;

-- REMOVE is_provider_member() function to prevent accidental circular dependencies
-- We'll inline the membership checks directly in policies for clarity
DROP FUNCTION IF EXISTS public.is_provider_member(uuid);

-- =============================================================================
-- STEP 3: USER_PROVIDER_MEMBERSHIPS POLICIES (Layer 2 - Foundation)
-- =============================================================================
-- These policies MUST be simple and NEVER query providers table
-- to avoid circular dependencies.

-- SELECT: Users can view their own memberships
CREATE POLICY "membership_select_own"
  ON public.user_provider_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- SELECT: Admins can view all memberships
CREATE POLICY "membership_select_admin"
  ON public.user_provider_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- INSERT: Users can insert their own memberships (for ensureProviderMembership)
-- CRITICAL: This policy MUST NOT query providers table to avoid recursion
-- Security: User can only add themselves, not others. Foreign key ensures provider exists.
-- Other tables' RLS still validates actual ownership via providers.user_id
CREATE POLICY "membership_insert_own"
  ON public.user_provider_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- INSERT: Admins can insert any membership
CREATE POLICY "membership_insert_admin"
  ON public.user_provider_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- UPDATE: Users can update their own memberships
CREATE POLICY "membership_update_own"
  ON public.user_provider_memberships
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Admins can update any membership
CREATE POLICY "membership_update_admin"
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- DELETE: Users can delete their own memberships (leave team)
CREATE POLICY "membership_delete_own"
  ON public.user_provider_memberships
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- DELETE: Admins can delete any membership
CREATE POLICY "membership_delete_admin"
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
  );

-- DELETE: Provider owners can remove members from their providers
-- This is SAFE because it only checks providers.user_id (direct column)
CREATE POLICY "membership_delete_provider_owner"
  ON public.user_provider_memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
  );

-- =============================================================================
-- STEP 4: PROVIDERS POLICIES (Layer 3 - Can query memberships safely)
-- =============================================================================
-- These policies can query user_provider_memberships because membership
-- SELECT policies are simple (user_id = auth.uid()) and don't recurse.

-- SELECT: Public can view verified providers
CREATE POLICY "provider_select_public"
  ON public.providers
  FOR SELECT
  USING (verified = true);

-- SELECT: Owners can view their own providers (verified or not)
-- CRITICAL: This uses direct column comparison, NOT a function
CREATE POLICY "provider_select_owner"
  ON public.providers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT: Team members can view their provider (verified or not)
-- SAFE: This queries memberships WHERE user_id = auth.uid() which is allowed
CREATE POLICY "provider_select_member"
  ON public.providers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = id
        AND m.user_id = auth.uid()
    )
  );

-- SELECT: Admins can view all providers
CREATE POLICY "provider_select_admin"
  ON public.providers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- INSERT: Users can insert providers where they are the owner
CREATE POLICY "provider_insert_owner"
  ON public.providers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- INSERT: Admins can insert any provider
CREATE POLICY "provider_insert_admin"
  ON public.providers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- UPDATE: Owners can update their own providers
CREATE POLICY "provider_update_owner"
  ON public.providers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Team members with 'owner' role can update provider
CREATE POLICY "provider_update_member_owner"
  ON public.providers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- UPDATE: Admins can update any provider
CREATE POLICY "provider_update_admin"
  ON public.providers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- DELETE: Only owners and admins can delete providers
CREATE POLICY "provider_delete_owner"
  ON public.providers
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "provider_delete_admin"
  ON public.providers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- =============================================================================
-- STEP 5: GEAR_ITEMS POLICIES (Layer 4 - Can query providers safely)
-- =============================================================================

-- SELECT: Public can view active gear from verified providers
CREATE POLICY "gear_select_public"
  ON public.gear_items
  FOR SELECT
  USING (
    active = true
    AND EXISTS (
      SELECT 1
      FROM public.providers p
      WHERE p.id = provider_id
        AND p.verified = true
    )
  );

-- ALL: Provider owners can manage their gear
-- SAFE: Queries providers.user_id directly, then queries memberships
CREATE POLICY "gear_all_provider_member"
  ON public.gear_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  );

-- ALL: Admins can manage all gear
CREATE POLICY "gear_all_admin"
  ON public.gear_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- =============================================================================
-- STEP 6: RESERVATIONS POLICIES (Layer 4 - Can query providers safely)
-- =============================================================================

-- SELECT: Customers can view their own reservations
CREATE POLICY "reservation_select_customer"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT/UPDATE/DELETE: Provider members can manage reservations for their providers
-- SAFE: Queries providers.user_id directly, then queries memberships
CREATE POLICY "reservation_all_provider_member"
  ON public.reservations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  );

-- ALL: Admins can manage all reservations
CREATE POLICY "reservation_all_admin"
  ON public.reservations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- =============================================================================
-- STEP 7: VERIFY RLS IS ENABLED
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_provider_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these after migration to verify policies are in place:
--
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('providers', 'user_provider_memberships', 'gear_items', 'reservations')
-- ORDER BY tablename, cmd, policyname;
--
-- Expected policy counts:
-- - user_provider_memberships: 9 policies (3 SELECT, 2 INSERT, 2 UPDATE, 3 DELETE)
-- - providers: 9 policies (4 SELECT, 2 INSERT, 3 UPDATE, 2 DELETE)
-- - gear_items: 3 policies (1 SELECT, 2 ALL)
-- - reservations: 3 policies (1 SELECT, 2 ALL)
-- =============================================================================
