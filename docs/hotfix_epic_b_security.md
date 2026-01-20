# Manual Hotfix: Epic B Security Regression (Staging)

**Objective**: Immediately stop non-admin access to `get_cron_health` RPC which is currently exposed on staging due to failed deployment of the fix migration.

## Execution

Run these SQL commands via Supabase SQL Editor (Dashboard) or `psql` connected to Staging.

### Variant A: Emergency Disable (Safest & Fastest)

*Use this if you want to completely block the functionality until deployment is fixed.*

```sql
-- 1. Revoke all permissions immediately
REVOKE EXECUTE ON FUNCTION public.get_cron_health() FROM public, anon, authenticated;

-- 2. (Optional) Nuke the function body to prevent any execution even if granted
CREATE OR REPLACE FUNCTION public.get_cron_health() 
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'RPC disabled due to security regression (Incident 2026-01-20).';
END;
$$;
```

### Variant B: Proper Fix (Restores Functionality Securely)

*Use this to manually apply the fix that failed to deploy.*

```sql
-- 1. Redefine function with explicit Security Check
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
BEGIN
    -- Security Barrier: Check if user is a Trusted Admin
    -- Uses existing helper public.is_admin_trusted() which checks user_roles
    IF NOT public.is_admin_trusted() THEN
        RAISE EXCEPTION 'Access denied. Trusted Admins only.';
    END IF;

    -- Logic
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

-- 2. Correct Permissions (Allow authenticated, but Gate inside)
REVOKE EXECUTE ON FUNCTION public.get_cron_health() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_cron_health() TO service_role, authenticated;
```

## Verification Steps

1. **As Non-Admin (Provider/Anon)**:
   - Call `supabase.rpc('get_cron_health')`
   - Expect `403` or `500` with "Access denied".
2. **As Admin**:
   - Call `supabase.rpc('get_cron_health')`
   - Expect `200 OK` + Data.
