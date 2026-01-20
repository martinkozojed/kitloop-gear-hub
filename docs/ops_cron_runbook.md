## Cron runbook (cleanup_reservation_holds)

### Quick health SQL
```sql
-- Last run (any status)
SELECT *
FROM public.cron_runs
WHERE cron_name = 'cleanup_reservation_holds_cron'
ORDER BY started_at DESC
LIMIT 1;

-- Last failure
SELECT *
FROM public.cron_runs
WHERE cron_name = 'cleanup_reservation_holds_cron'
  AND status = 'failed'
ORDER BY started_at DESC
LIMIT 1;

-- Stale detection (no run in 15 minutes)
SELECT count(*) AS runs_last_15m
FROM public.cron_runs
WHERE cron_name = 'cleanup_reservation_holds_cron'
  AND started_at > now() - interval '15 minutes';
```

Expected: status `success`, reasonable `duration_ms`, `metadata->>'deleted_count'` present. `runs_last_15m` should be > 0 (schedule is */5). Manual HTTP runs (edge) are logged separately under `cleanup_reservation_holds_manual`.

### If cron isn’t running
- Check job exists: `SELECT * FROM cron.job WHERE jobname = 'cleanup_reservation_holds';`
  - If missing: rerun migration `20260115160000_cleanup_scheduler.sql` or schedule manually with the same SELECT call.
- Permissions: ensure `pg_cron` extension enabled and `service_role` can execute `public.cleanup_reservation_holds_sql()`.
- Function deployed: pg_cron calls the SQL function directly (`SELECT public.cleanup_reservation_holds_sql()`); edge deployment is only for manual runs.
- Schedule drift: verify server clock; re-create the job if next_start is NULL or far in the future.
