-- Track cron executions for observability and alerting

BEGIN;

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'success', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  error_message text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS cron_runs_name_started_at_idx
  ON public.cron_runs (cron_name, started_at DESC);

ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;

-- Admins (trusted) and service role can read
DROP POLICY IF EXISTS "cron_runs_select_admin_trusted" ON public.cron_runs;
CREATE POLICY "cron_runs_select_admin_trusted"
  ON public.cron_runs
  FOR SELECT TO authenticated
  USING (public.is_admin_trusted());

DROP POLICY IF EXISTS "cron_runs_select_service" ON public.cron_runs;
CREATE POLICY "cron_runs_select_service"
  ON public.cron_runs
  FOR SELECT TO service_role
  USING (true);

-- Service role can insert/update status
DROP POLICY IF EXISTS "cron_runs_insert_service" ON public.cron_runs;
CREATE POLICY "cron_runs_insert_service"
  ON public.cron_runs
  FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "cron_runs_update_service" ON public.cron_runs;
CREATE POLICY "cron_runs_update_service"
  ON public.cron_runs
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
