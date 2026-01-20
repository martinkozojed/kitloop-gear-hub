-- Codify scheduled cleanup of reservation holds using pg_cron

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to cleanup holds (SQL variant for cron)
CREATE OR REPLACE FUNCTION public.cleanup_reservation_holds_sql()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM public.reservations
  WHERE status = 'hold'
    AND expires_at IS NOT NULL
    AND expires_at < now()
  RETURNING 1 INTO v_deleted;

  RETURN jsonb_build_object('deleted_count', COALESCE(v_deleted,0));
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_reservation_holds_sql() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_reservation_holds_sql() TO service_role;

-- Schedule job (every 5 minutes) idempotently
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_reservation_holds') THEN
    PERFORM cron.schedule(
      'cleanup_reservation_holds',
      '*/5 * * * *',
      'SELECT public.cleanup_reservation_holds_sql()'
    );
  END IF;
END $$;

COMMIT;

