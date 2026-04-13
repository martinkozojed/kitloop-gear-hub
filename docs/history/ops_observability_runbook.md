# Ops Runbook: Observability & Cron Jobs

## Overview

This runbook describes how to monitor and debug background jobs (cron) in the Kitloop Gear Hub system.
The system uses `pg_cron` for scheduling and a custom `cron_runs` table for logging execution history.

## Dashboard

Navigate to `/admin/observability` to see the "Cron Jobs Health" section.

- **Summary Cards**: Quick status of all jobs.
- **Table**: List of jobs with their last known status.
- **History**: Click "History" on any job to see the last 10 runs.

## Common Issues

### 1. Job showing "Stale"

**Symptom**: The "Stale" badge appears next to a job.
**Meaning**: The job has not run successfully within its configured `stale_after_minutes` threshold.

**Investigation**:

1. Check if the database is running and `pg_cron` extension is active.
2. Check `cron_runs` for failures:

   ```sql
   SELECT * FROM cron_runs 
   WHERE cron_name = 'JOB_NAME' 
   ORDER BY started_at DESC LIMIT 5;
   ```

3. Check `cron.job` to ensure it is scheduled:

   ```sql
   SELECT * FROM cron.job;
   ```

**Resolution**:

- If the job exists but isn't running: Restart database or re-schedule (`SELECT cron.schedule(...)`).
- If the job is failing: Check `error_message` in logs.

### 2. Job showing "Failed"

**Symptom**: The "Failed" badge appears.
**Meaning**: The last execution threw an exception.

**Investigation**:

- Click "History" in the UI to see the error message.
- Or query:

  ```sql
  SELECT started_at, error_message 
  FROM cron_runs 
  WHERE cron_name = 'JOB_NAME' AND status = 'failed' 
  ORDER BY started_at DESC LIMIT 1;
  ```

### 3. Missing Job in Dashboard

**Symptom**: A cron job you expect to see is missing.
**Cause**: The dashboard joins `cron.job` with `cron_job_config`.
**Resolution**:

- Ensure the job is in `cron.job` (created via migration).
- Ensure a generic config exists in `cron_job_config` (migrations should seed this).
- Manually insert config if needed:

  ```sql
  INSERT INTO cron_job_config (jobname) VALUES ('new_job_name');
  ```

## SQL Reference

**Check Cron Health (Raw)**

```sql
SELECT * FROM get_cron_health();
```

**List All Run Logs**

```sql
SELECT * FROM cron_runs ORDER BY started_at DESC LIMIT 50;
```
