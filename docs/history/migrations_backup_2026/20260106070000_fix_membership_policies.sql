-- Fix RLS recursion on user_provider_memberships
-- Removes recursive/self-referencing policy patterns and replaces them with
-- simple predicates over auth.uid() and providers (owned by auth.uid()).

BEGIN;

-- Clean existing policies to avoid conflicts
DROP POLICY IF EXISTS "membership_insert_by_owner" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_delete_provider_owner" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_select_self" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_update_self" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_update_owner" ON public.user_provider_memberships;

-- SELECT: a user can read their own memberships
CREATE POLICY "membership_select_self"
  ON public.user_provider_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: user can insert their own membership OR provider owner can insert
CREATE POLICY "membership_insert_self_or_owner"
  ON public.user_provider_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
        AND p.user_id = auth.uid()
    )
  );

-- UPDATE: user can update their own membership OR provider owner can update
CREATE POLICY "membership_update_self_or_owner"
  ON public.user_provider_memberships
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
        AND p.user_id = auth.uid()
    )
  );

COMMIT;
