-- Fix for Infinite Recursion in RLS Policies
-- Problem: 'providers' policies checked 'memberships', and 'memberships' policies checked 'providers', causing a loop.
-- Solution: Use SECURITY DEFINER functions to break the chain.

BEGIN;

-- 1. Safe Membership Check (Bypasses RLS on user_provider_memberships)
CREATE OR REPLACE FUNCTION public.check_is_member_safe(p_provider_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_provider_memberships
    WHERE provider_id = p_provider_id
    AND user_id = p_user_id
  );
$$;

-- 2. Safe Owner Check (Bypasses RLS on providers)
CREATE OR REPLACE FUNCTION public.check_is_owner_safe(p_provider_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = p_provider_id
    AND user_id = p_user_id
  );
$$;

-- 3. Fix 'providers' policy (Select for member)
DROP POLICY IF EXISTS "provider_select_member" ON public.providers;
CREATE POLICY "provider_select_member"
  ON public.providers
  FOR SELECT
  TO authenticated
  USING (
    public.check_is_member_safe(id, auth.uid())
  );

-- 4. Fix 'user_provider_memberships' policy (Insert by owner)
DROP POLICY IF EXISTS "membership_insert_by_owner" ON public.user_provider_memberships;
CREATE POLICY "membership_insert_by_owner"
  ON public.user_provider_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.check_is_owner_safe(provider_id, auth.uid())
  );

-- 5. Fix 'user_provider_memberships' policy (Delete by owner)
DROP POLICY IF EXISTS "membership_delete_provider_owner" ON public.user_provider_memberships;
CREATE POLICY "membership_delete_provider_owner"
  ON public.user_provider_memberships
  FOR DELETE
  TO authenticated
  USING (
    public.check_is_owner_safe(provider_id, auth.uid())
  );

-- 6. Also fix 'gear_items' (assets) policies if they rely on recursive checks directly
-- (They usually inspect providers/memberships, so using the safe function there is also good practice, 
-- but fixing the root 'providers' policy usually suffices. For safety, let's leave them if they just use EXISTS(providers)).

COMMIT;
