# PR#6 Cleanup hold protection & scheduling smoke

## Unauthorized call should fail
```bash
curl -i -X POST https://<project>.functions.supabase.co/cleanup_reservation_holds
# Expect: 401/403
```

## Authorized call (with X-CRON-SECRET)
```bash
curl -i -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  https://<project>.functions.supabase.co/cleanup_reservation_holds
# Expect: 200 and {"deleted_count":<n>}
```

## Authorized call (service_role JWT)
```bash
curl -i -X POST \
  -H "Authorization: Bearer $SERVICE_ROLE_JWT" \
  https://<project>.functions.supabase.co/cleanup_reservation_holds
# Expect: 200 and {"deleted_count":<n>}
```

## Scheduler verification (pg_cron)
```sql
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname = 'cleanup_reservation_holds';
-- Expect one row: */5 schedule, command SELECT public.cleanup_reservation_holds_sql()
```

## Manual SQL run (service role)
```sql
SELECT public.cleanup_reservation_holds_sql();
-- Expect deleted_count >= 0
```

## Runbook (secret rotation)
- Update `CRON_SECRET` in Supabase environment.
- Update scheduler/CI invoking the function with the new secret.

