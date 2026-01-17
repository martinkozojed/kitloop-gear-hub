-- Secure security_profile_resets access

BEGIN;

ALTER TABLE public.security_profile_resets ENABLE ROW LEVEL SECURITY;

-- Read: trusted admins only
DROP POLICY IF EXISTS "security_profile_resets_select_admin" ON public.security_profile_resets;
CREATE POLICY "security_profile_resets_select_admin"
ON public.security_profile_resets
FOR SELECT
TO authenticated
USING (public.is_admin_trusted());

-- Ensure no generic INSERT grant
REVOKE INSERT ON public.security_profile_resets FROM authenticated;

-- Insert: service_role only (migrations/SD functions run as elevated)
DROP POLICY IF EXISTS "security_profile_resets_insert_service" ON public.security_profile_resets;
CREATE POLICY "security_profile_resets_insert_service"
ON public.security_profile_resets
FOR INSERT
TO service_role
WITH CHECK (true);

COMMIT;

