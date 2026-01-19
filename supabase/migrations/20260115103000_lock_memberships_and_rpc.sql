-- Lock down user_provider_memberships and introduce trusted add_provider_member RPC

BEGIN;

-- 1) Tighten RLS on user_provider_memberships
DROP POLICY IF EXISTS "membership_select_self" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_insert_self_or_owner" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_update_self_or_owner" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_delete_provider_owner" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_insert_by_owner" ON public.user_provider_memberships;

-- Expand allowed roles to match downstream usage
ALTER TABLE public.user_provider_memberships
  DROP CONSTRAINT IF EXISTS user_provider_memberships_role_check;
ALTER TABLE public.user_provider_memberships
  ADD CONSTRAINT user_provider_memberships_role_check
  CHECK (role IN ('owner','manager','staff','viewer','revoked'));

ALTER TABLE public.user_provider_memberships ENABLE ROW LEVEL SECURITY;

-- Read: self only (no cross-tenant leak)
CREATE POLICY "membership_select_self"
  ON public.user_provider_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert/Update/Delete: service_role or provider owner (trusted) or platform admin
CREATE POLICY "membership_manage_owner_or_admin"
  ON public.user_provider_memberships
  FOR ALL
  TO authenticated
  USING (
    -- platform admin allowlist
    public.is_admin_trusted()
    OR
    -- provider owner (providers.user_id)
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin_trusted()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
        AND p.user_id = auth.uid()
    )
  );

-- Service role bypass (explicit grant via policy)
CREATE POLICY "membership_manage_service"
  ON public.user_provider_memberships
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2) Trusted RPC for adding member (service/admin/owner only)
CREATE OR REPLACE FUNCTION public.add_provider_member(p_provider_id uuid, p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF p_role IS NULL OR p_role NOT IN ('owner','manager','staff','viewer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  -- Auth guard: allow service_role, trusted admin, or provider owner only
  IF NOT (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR public.is_admin_trusted()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = p_provider_id
        AND p.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Enforce owner constraint: only service_role or trusted admin can assign 'owner'
  IF p_role = 'owner' AND NOT (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR public.is_admin_trusted()
  ) THEN
    RAISE EXCEPTION 'Owner role requires service or admin';
  END IF;

  INSERT INTO public.user_provider_memberships (user_id, provider_id, role)
  VALUES (p_user_id, p_provider_id, p_role)
  ON CONFLICT (user_id, provider_id) DO UPDATE
    SET role = EXCLUDED.role;
END;
$$;

REVOKE ALL ON FUNCTION public.add_provider_member(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_provider_member(uuid, uuid, text) TO service_role;

-- 3) Rogue membership audit & quarantine
CREATE TABLE IF NOT EXISTS public.membership_resets (
  user_id uuid,
  provider_id uuid,
  role text,
  revoked_at timestamptz DEFAULT now(),
  reason text,
  PRIMARY KEY (user_id, provider_id)
);

INSERT INTO public.membership_resets (user_id, provider_id, role, reason)
SELECT m.user_id, m.provider_id, m.role, 'owner/admin without trusted grant'
FROM public.user_provider_memberships m
WHERE m.role IN ('owner','admin')
AND NOT EXISTS (
  SELECT 1 FROM public.providers p WHERE p.id = m.provider_id AND p.user_id = m.user_id
)
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = m.user_id AND ur.role = 'admin'
);

-- Soft revoke by setting role to 'revoked' (avoid hard delete)
UPDATE public.user_provider_memberships m
SET role = 'revoked'
WHERE (m.user_id, m.provider_id) IN (
  SELECT user_id, provider_id FROM public.membership_resets
);

COMMIT;
