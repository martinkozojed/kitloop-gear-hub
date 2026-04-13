# Database Smoke Test Guide

## Purpose

This script validates the database schema integrity and Row Level Security (RLS) configuration for the Kitloop MVP. It's designed to be run manually in the Supabase SQL Editor to verify that all critical tables and security policies are correctly deployed.

## Prerequisites

- Access to Supabase Dashboard
- SQL Editor access (no service role key required)
- Migrations must be applied to the target environment

## How to Run

### Step 1: Navigate to Supabase SQL Editor

1. Open your Supabase project: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select the project you want to test (e.g., "Kitloop Staging" or "Kitloop Production")
3. Click on the "SQL Editor" tab in the left sidebar

### Step 2: Load the Smoke Test Script

1. Open `scripts/db_smoke.sql` in your code editor
2. Copy the entire contents (⌘+A / Ctrl+A, then ⌘+C / Ctrl+C)
3. Paste into the Supabase SQL Editor

### Step 3: Execute the Script

1. Click the **"Run"** button (or press ⌘+Enter / Ctrl+Enter)
2. The script will execute all queries sequentially
3. Review the results in the output pane below

## Expected Results

### Section 1: Table Existence Checks

Each query should return **1 row** with `exists = true`:

```
┌──────────────────┬────────┐
│ profiles_exists  │ true   │
│ providers_exists │ true   │
│ products_exists  │ true   │
│ assets_exists    │ true   │
│ ...              │ ...    │
└──────────────────┴────────┘
```

**❌ FAIL**: If any query returns `false`, the corresponding table is missing.

### Section 2: RLS Status Checks

Should return a table showing **all critical tables with `rls_enabled = true`**:

```
┌────────────┬───────────────────┬──────────────┐
│ schemaname │ tablename         │ rls_enabled  │
├────────────┼───────────────────┼──────────────┤
│ public     │ assets            │ true         │
│ public     │ products          │ true         │
│ public     │ profiles          │ true         │
│ public     │ providers         │ true         │
│ public     │ reservation_lines │ true         │
│ public     │ reservations      │ true         │
└────────────┴───────────────────┴──────────────┘
```

**❌ FAIL**: If any critical table shows `rls_enabled = false`, RLS is disabled.

### Section 3: RLS Policy Count Checks

Each critical table should have **at least 1 policy**:

```
┌────────────┬──────────────┬───────────────┐
│ schemaname │ tablename    │ policy_count  │
├────────────┼──────────────┼───────────────┤
│ public     │ assets       │ 1             │
│ public     │ products     │ 2             │
│ public     │ providers    │ 2             │
│ public     │ reservations │ 2             │
└────────────┴──────────────┴───────────────┘
```

**❌ FAIL**: If `policy_count = 0` for any table, policies are missing.

### Section 4: Constraint Checks

Should show foreign key relationships to `providers`:

```
┌─────────────┬──────────────┬─────────────────────┬──────────────────────┐
│ table_name  │ column_name  │ foreign_table_name  │ foreign_column_name  │
├─────────────┼──────────────┼─────────────────────┼──────────────────────┤
│ assets      │ provider_id  │ providers           │ id                   │
│ products    │ provider_id  │ providers           │ id                   │
│ reservations│ provider_id  │ providers           │ id                   │
└─────────────┴──────────────┴─────────────────────┴──────────────────────┘
```

**❌ FAIL**: If any expected relationship is missing, referential integrity is broken.

### Section 5: Enum Type Checks

Should list all values for critical enum types:

```
┌────────────────────────┬───────────────┐
│ enum_name              │ enum_value    │
├────────────────────────┼───────────────┤
│ asset_status_type      │ available     │
│ asset_status_type      │ reserved      │
│ asset_status_type      │ active        │
│ maintenance_type       │ cleaning      │
│ maintenance_type       │ repair        │
│ reservation_status_type│ pending       │
│ ...                    │ ...           │
└────────────────────────┴───────────────┘
```

**❌ FAIL**: If enum types are missing, type definitions are incomplete.

## Troubleshooting

### Problem: Tables Are Missing

**Cause**: Migrations not applied or partially failed.

**Solution**:

1. Check migration status in Supabase Dashboard → Database → Migrations
2. Verify all migrations in `supabase/migrations/` are listed
3. If needed, reset local database: `npx supabase db reset`
4. Redeploy to staging/production

### Problem: RLS Is Disabled

**Cause**: Migration script missing `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

**Solution**:

1. Review the migration file that creates the table
2. Ensure it includes RLS enablement
3. Apply a fix migration or reset the database

### Problem: No Policies Exist

**Cause**: Policy creation migration failed or was skipped.

**Solution**:

1. Review RLS policy migrations (e.g., `20251110000000_squash_rls_migrations.sql`)
2. Verify policies are defined for all critical tables
3. Manually create missing policies or re-run migrations

### Problem: Foreign Keys Missing

**Cause**: Schema changes removed constraints or migration order issue.

**Solution**:

1. Review constraint definitions in migrations
2. Ensure `provider_id` columns exist on all tenant-scoped tables
3. Add missing constraints via new migration

## Local Verification

To run this smoke test against your **local Supabase instance**:

```bash
# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db reset

# Copy db_smoke.sql contents
# Paste into local Studio SQL Editor: http://localhost:54323
# Execute and verify results
```

## CI/CD Integration (Future)

This script is currently **manual-only** for security reasons (no service role keys in CI). Future automation options:

- GitHub Actions workflow with Supabase CLI (`supabase db execute`)
- Read-only connection string stored as GitHub secret
- Automated smoke test on PR merge to staging

## Maintenance

This script should be updated when:

- New critical tables are added (e.g., `invoices`, `payments`)
- RLS policies are restructured
- Enum types are modified
- Security requirements change

**Last Updated**: 2026-02-16
