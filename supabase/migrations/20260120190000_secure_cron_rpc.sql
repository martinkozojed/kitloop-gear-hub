-- Fix: Secure get_cron_health RPC
-- Enforce Admin Role check inside the function as GRANTs are insufficient for public/authenticated separation in this setup.

CREATE OR REPLACE FUNCTION public.get_cron_health()
RETURNS TABLE (
    jobname TEXT,
    schedule TEXT,
    command TEXT,
    last_run_at TIMESTAMPTZ,
    last_status TEXT,
    last_rows_affected INT,
    last_error TEXT,
    active BOOLEAN,
    stale BOOLEAN,
    config_stale_limit INT
)
LANGUAGE plpgsql
SECURITY DEFINER
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
            WHEN lr.started_at IS NULL THEN true
            WHEN lr.started_at < (now() - (COALESCE(cfg.stale_after_minutes, 180) || ' minutes')::INTERVAL) THEN true
            ELSE false 
        END AS stale,
        COALESCE(cfg.stale_after_minutes, 180) AS config_stale_limit
    FROM cron.job j
    LEFT JOIN public.cron_job_config cfg ON j.jobname = cfg.jobname
    LEFT JOIN latest_runs lr ON lr.cron_name = COALESCE(cfg.cron_identifier_mapping, j.jobname);
END;
$$;
