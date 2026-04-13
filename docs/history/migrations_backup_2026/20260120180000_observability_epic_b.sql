-- Migration: Observability Epic B
-- Adds cron_job_config table and get_cron_health RPC for admin dashboard.

BEGIN;

-- 1. Create Configuration Table
CREATE TABLE IF NOT EXISTS public.cron_job_config (
    jobname TEXT PRIMARY KEY,
    expected_interval_minutes INT DEFAULT 60,
    stale_after_minutes INT DEFAULT 180,
    cron_identifier_mapping TEXT, -- Optional: if cron_runs.cron_name differs from cron.job.jobname
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (though typically accessed via secure RPC, good practice)
ALTER TABLE public.cron_job_config ENABLE ROW LEVEL SECURITY;

-- Policy: Service role only (admins via dashboard RPC)
CREATE POLICY "Service role can manage config" ON public.cron_job_config
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 2. Seed Configuration for known jobs
INSERT INTO public.cron_job_config (jobname, expected_interval_minutes, stale_after_minutes, cron_identifier_mapping)
VALUES 
    ('cleanup_reservation_holds', 5, 15, 'cleanup_reservation_holds_cron')
ON CONFLICT (jobname) DO UPDATE SET
    expected_interval_minutes = EXCLUDED.expected_interval_minutes,
    stale_after_minutes = EXCLUDED.stale_after_minutes,
    cron_identifier_mapping = EXCLUDED.cron_identifier_mapping;

-- 3. Create Health Check RPC
CREATE OR REPLACE FUNCTION public.get_cron_health()
RETURNS TABLE (
    jobname TEXT,
    schedule TEXT,
    command TEXT,
    last_run_at TIMESTAMPTZ,
    last_status TEXT,
    last_rows_affected INT,
    last_error TEXT,
    active BOOLEAN, -- from cron.job
    stale BOOLEAN,
    config_stale_limit INT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Required to access cron schema
SET search_path = public, cron, extensions
AS $$
DECLARE
    is_admin boolean;
BEGIN
    -- Security Check: Allow if Service Role or Admin Profile
    IF (auth.role() = 'service_role') THEN
       -- OK
    ELSE
       SELECT EXISTS (
         SELECT 1 FROM public.profiles 
         WHERE user_id = auth.uid() AND role = 'admin'
       ) INTO is_admin;
       
       IF NOT is_admin THEN
          RAISE EXCEPTION 'Access denied. Admins only.';
       END IF;
    END IF;

    RETURN QUERY
    WITH latest_runs AS (
        SELECT DISTINCT ON (cron_name)
            cron_name,
            status,
            started_at,
            metadata,
            error_message
        FROM public.cron_runs
        ORDER BY cron_name, started_at DESC
    )
    SELECT 
        j.jobname::TEXT,
        j.schedule::TEXT,
        j.command::TEXT,
        lr.started_at AS last_run_at,
        lr.status::TEXT AS last_status,
        (lr.metadata->>'rows_affected')::INT AS last_rows_affected,
        lr.error_message::TEXT AS last_error,
        j.active,
        CASE 
            WHEN lr.started_at IS NULL THEN true -- Never run implies stale if it should have
            WHEN lr.started_at < (now() - (COALESCE(cfg.stale_after_minutes, 180) || ' minutes')::INTERVAL) THEN true
            ELSE false 
        END AS stale,
        COALESCE(cfg.stale_after_minutes, 180) AS config_stale_limit
    FROM cron.job j
    LEFT JOIN public.cron_job_config cfg ON j.jobname = cfg.jobname
    LEFT JOIN latest_runs lr ON lr.cron_name = COALESCE(cfg.cron_identifier_mapping, j.jobname);
END;
$$;

-- Grant access
REVOKE ALL ON FUNCTION public.get_cron_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cron_health() TO service_role, authenticated;

COMMIT;
