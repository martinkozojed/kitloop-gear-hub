-- Harden rpc_logs access to trusted admin/service

BEGIN;

-- Ensure RLS enabled
ALTER TABLE public.rpc_logs ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies
DROP POLICY IF EXISTS "Admins view logs" ON public.rpc_logs;

-- Select: trusted admin or service_role
CREATE POLICY "rpc_logs_select_admin_trusted"
ON public.rpc_logs
FOR SELECT TO authenticated
USING (public.is_admin_trusted());

CREATE POLICY "rpc_logs_select_service"
ON public.rpc_logs
FOR SELECT TO service_role
USING (true);

-- Insert: service_role only (edge/system)
DROP POLICY IF EXISTS "rpc_logs_insert_any" ON public.rpc_logs;
CREATE POLICY "rpc_logs_insert_service"
ON public.rpc_logs
FOR INSERT TO service_role
WITH CHECK (true);

COMMIT;

