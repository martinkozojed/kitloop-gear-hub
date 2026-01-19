-- Add cron_runs logging directly inside the SQL cron function

BEGIN;

CREATE OR REPLACE FUNCTION public.cleanup_reservation_holds_sql()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_deleted int := 0;
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
    WITH deleted AS (
      DELETE FROM public.reservations
      WHERE status = 'hold'
        AND expires_at IS NOT NULL
        AND expires_at < now()
      RETURNING 1
    )
    SELECT COALESCE(count(*), 0) INTO v_deleted FROM deleted;

    v_duration_ms := GREATEST(0, (EXTRACT(EPOCH FROM (now() - v_started_at)) * 1000)::int);

    IF v_run_id IS NOT NULL THEN
      UPDATE public.cron_runs
      SET status = 'success',
          finished_at = now(),
          duration_ms = v_duration_ms,
          metadata = jsonb_build_object('deleted_count', v_deleted)
      WHERE id = v_run_id;
    END IF;

    RETURN jsonb_build_object('deleted_count', v_deleted, 'cron_run_id', v_run_id);
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

COMMIT;
