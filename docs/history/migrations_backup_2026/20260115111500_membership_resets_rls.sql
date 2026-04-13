-- Secure membership_resets table

BEGIN;

ALTER TABLE public.membership_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_resets_select_admin" ON public.membership_resets;
CREATE POLICY "membership_resets_select_admin"
ON public.membership_resets
FOR SELECT
TO authenticated
USING (public.is_admin_trusted());

REVOKE INSERT ON public.membership_resets FROM authenticated;

DROP POLICY IF EXISTS "membership_resets_insert_service" ON public.membership_resets;
CREATE POLICY "membership_resets_insert_service"
ON public.membership_resets
FOR INSERT
TO service_role
WITH CHECK (true);

COMMIT;

