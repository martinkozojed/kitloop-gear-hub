-- PR-RLS-ASSETS-SELECT: Tighten assets SELECT policy.
-- Drops the permissive "Public view assets" policy (USING true, anon+authenticated)
-- and replaces it with a membership/ownership-scoped SELECT for authenticated only.
-- anon role loses direct SELECT access to assets.
-- Existing write/manage and service_role policies are left untouched.

-- Drop the permissive public SELECT policy introduced in 20260123130000_fix_inventory_rls.sql
DROP POLICY IF EXISTS "Public view assets" ON public.assets;

-- Ensure RLS is still enabled (idempotent)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- New scoped SELECT: authenticated users may only see assets belonging to a provider
-- they own or are a member of.
CREATE POLICY "Member view assets"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_trusted()
    OR EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id = assets.provider_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = assets.provider_id
        AND p.user_id = auth.uid()
    )
  );
