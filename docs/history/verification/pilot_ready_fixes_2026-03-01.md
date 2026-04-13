# Verification: Pilot-Ready Fixes (2026-03-01)

## A) SECURITY DEFINER search_path Fix

**Migration:** `20260301180000_fix_line_items_search_path.sql`
**Function:** `public.update_reservation_total_on_line_item()`

### Verification

After applying the migration, verify with:

```sql
SELECT proname, prosecdef,
       pg_get_functiondef(oid) ~ 'search_path' AS has_search_path
FROM pg_proc
WHERE proname = 'update_reservation_total_on_line_item';
```

Expected: `prosecdef = true`, `has_search_path = true`.

### Local test

```bash
supabase db reset
# Then:
psql "$DATABASE_URL" -c "
  SELECT proname,
         pg_get_functiondef(oid) ILIKE '%search_path%' AS has_search_path
  FROM pg_proc
  WHERE proname = 'update_reservation_total_on_line_item';"
```

---

## B) Email Disabled by Default

**Migration:** `20260301180100_email_disabled_by_default.sql`

### Verification

```sql
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
  AND column_name = 'email_enabled';
```

Expected: `column_default = 'false'`.

### Dispatcher hardening

The `notify-dispatcher` edge function now checks `notification_preferences.email_enabled`
before sending email. If `false` (or no preference row exists), the outbox item is
marked `canceled` without calling Resend.

**Deno tests:** `supabase/functions/notify-dispatcher/index.test.ts`

```bash
deno test --allow-import=deno.land,esm.sh,legacy.esm.sh supabase/functions/notify-dispatcher
```

---

## C) CI RLS Regression Tests

**File:** `.github/workflows/ci.yml` — new `test_rls` job.

The CI now starts a local Supabase instance (DB-only) and runs `supabase test db`,
which executes all `.sql` test files in `supabase/tests/`, including
`rls_membership.sql`.

### Running locally

```bash
supabase start
supabase test db
supabase stop
```

The `test_rls` job fails if any pgTAP assertion fails.

---

## D) Notification Read State

**Migration:** `20260301180200_notification_read_at.sql`
**Component:** `src/components/notifications/NotificationInbox.tsx`

- Added `read_at TIMESTAMPTZ` column to `notification_outbox`.
- Removed hardcoded `is_read: false`.
- "Mark all read" now writes `read_at = NOW()` for all unread inapp outbox items.
- Individual click marks single notification read.
- Unread count = count of items where `read_at IS NULL`.
- RLS UPDATE policy allows users to update their own rows.
