-- Migration: Hold TTL Automation
-- Adds expired_at column, index, updates cleanup logic, and ensures cron schedule.

BEGIN;

-- 1. Add expired_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'expired_at') THEN
        ALTER TABLE public.reservations ADD COLUMN expired_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Add Index for performance
CREATE INDEX IF NOT EXISTS idx_reservations_status_expires ON public.reservations(status, expires_at);

-- 3. Update Cleanup Function (Safe, Idempotent, Audit-logged)
CREATE OR REPLACE FUNCTION public.cleanup_reservation_holds_sql()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_rows_affected int := 0;
  v_run_id uuid;
  v_started_at timestamptz := now();
  v_duration_ms int;
BEGIN
  -- Start log (best-effort)
  BEGIN
    INSERT INTO public.cron_runs (cron_name, status, started_at)
    VALUES ('cleanup_reservation_holds_cron', 'started', v_started_at)
    RETURNING id INTO v_run_id;
  EXCEPTION WHEN others THEN
    v_run_id := NULL;
  END;

  BEGIN
    -- Core Logic: Update expired holds to 'expired'
    WITH expired_updates AS (
      UPDATE public.reservations
      SET status = 'expired',
          expired_at = now(),
          updated_at = now()
      WHERE status = 'hold'
        AND expires_at < now()
      RETURNING 1
    )
    SELECT count(*) INTO v_rows_affected FROM expired_updates;

    v_duration_ms := GREATEST(0, (EXTRACT(EPOCH FROM (now() - v_started_at)) * 1000)::int);

    IF v_run_id IS NOT NULL THEN
      UPDATE public.cron_runs
      SET status = 'success',
          finished_at = now(),
          duration_ms = v_duration_ms,
          metadata = jsonb_build_object('rows_affected', v_rows_affected)
      WHERE id = v_run_id;
    END IF;

    RETURN jsonb_build_object('rows_affected', v_rows_affected, 'cron_run_id', v_run_id);
  EXCEPTION WHEN others THEN
    v_duration_ms := GREATEST(0, (EXTRACT(EPOCH FROM (now() - v_started_at)) * 1000)::int);
    IF v_run_id IS NOT NULL THEN
      UPDATE public.cron_runs
      SET status = 'failed',
          finished_at = now(),
          duration_ms = v_duration_ms,
          error_message = SQLERRM
      WHERE id = v_run_id;
    END IF;
    RAISE;
  END;
END;
$$;

-- 4. Ensure Cron Schedule
-- Run every 5 minutes
SELECT cron.schedule(
  'cleanup_reservation_holds',
  '*/5 * * * *',
  'SELECT public.cleanup_reservation_holds_sql()'
);

COMMIT;
