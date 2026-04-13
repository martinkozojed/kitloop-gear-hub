# Pilot GO/NO-GO Audit — Kitloop MVP

**Date:** 2026-03-01  
**Auditor:** Antigravity Agent (automated repo audit)  
**Commit:** current HEAD on local working tree  
**Scope:** Pilot readiness per `docs/ssot/MVP_SCOPE.md`

---

## Executive Verdict

### 🟡 CONDITIONAL GO (Pilot)

The application is **functionally ready** for a controlled pilot with one provider.
All critical ops flows (inventory CRUD, internal reservations, issue hard gate, return,
print, CSV export) have evidence of implementation and are covered by Playwright tests.
Routing/auth guards are solid. No service-role key is shipped to the client.

**However, 3 items require action before or during pilot launch:**

| # | Blocker | Severity | Section |

| # | Blocker | Severity | Section |
| --- | --- | --- | --- |
| 1 | `update_reservation_total_on_line_item` is `SECURITY DEFINER` **without `SET search_path`** | 🔴 Stop-ship | E2 |
| 2 | `email_enabled` defaults to `true` in `notification_preferences` — pilot may spam provider email if dispatcher cron is active and `RESEND_API_KEY` is set | 🟡 High | D2 |
| 3 | CI RLS tests are a **TODO placeholder** (`echo "TODO: …"`) — no automated RLS regression guard in CI | 🟡 High | E3 |
| 4 | No formal pilot runbook with pain-reporting process (existing `pilot_playbook.md` covers ops flow but not structured feedback capture) | 🟡 Medium | A1 |
| 5 | Notification bell `is_read` is always `false` (hardcoded) — every fetch shows all items as unread, count ≠ actual unread | 🟡 Medium | D1 |

**Recommendation:** Fix blocker #1 (one-line SQL migration), confirm #2 by checking prod env for `RESEND_API_KEY`, then proceed with pilot.

---

## A — Pilot Runbook & Instrumentation

### A1 — Pilot runbook describing flow + pain reporting

| Status | **PARTIAL PASS** |
| --- | --- |
| Evidence | `docs/pilot_playbook.md` — covers import, first reservation, issue, return, incident management, go/no-go criteria (85 lines). `docs/pilot_signoff.md` — prior audit from 2026-01-10. `docs/verification/pilot_smoke.md` — comprehensive smoke checklist (A–I, matching SSOT). |
| Gap | The playbook does **not** describe a structured pain-reporting process (e.g., "fill in this form", feedback channel, weekly review cadence). Section 4 ("Kde hlásit chyby") says "screenshot + Slack/Email" but no template or log. |

**Manual test script (if needed):**
> Not applicable — this is a documentation check.

**Proposed fix:**
Add a "Pain Reporting" section to `docs/pilot_playbook.md`:

```markdown
## 5. Pain Reporting (Pilot)
- After each shift, note any friction in the shared Google Form: [URL].
- Screenshot + step description → send to `pilot-feedback` Slack channel or support@kitloop.cz.
- Weekly review of `app_events` table for silent errors.
```

---

### A2 — Minimal instrumentation for pilot pain points

| Status | **PASS** |
| --- | --- |
| Evidence | `app_events` table exists (`supabase/migrations/20260219190000_app_events_feedback.sql`) with provider-scoped RLS (insert by provider members, select by member/admin). Client-side telemetry helper in `src/lib/app-events.ts`. Events include `reservation_status_changed`, `csv_import_completed`, `return_completed`, etc. |

---

## B — Routing & Access Control

### B1 — Hidden pages/routes are protected

| Status | **PASS** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- **Router:** `src/App.tsx` lines 107–322. All `/provider/*` operational routes are wrapped in `<ProviderRoute>`. All `/admin/*` routes wrapped in `<AdminRoute>`.
- **Feature flags:** Analytics, CRM, Accounts, Maintenance, Calendar, Marketplace are gated by `VITE_ENABLE_*` env vars; disabled routes redirect to `/provider/dashboard` or `/` — no 404 exposure. Documented in `docs/feature_flags.md`.
- **ProviderRoute** (`src/components/auth/ProviderRoute.tsx`): checks `user`, `isProvider || isAdmin`,`provider` record exists, and `provider.status !== 'approved'` → blocks non-approved providers from all routes except `/provider/dashboard`,`/provider/pending`,`/provider/setup`. Deep-link bypass prevented.
- **AdminRoute** (`src/components/auth/AdminRoute.tsx`): checks `user` + `isAdmin`; redirects to `/login` if either fails.
- **Note:** `/provider/setup` and `/provider/pending` are NOT wrapped in `<ProviderRoute>` in the router — however, `ProviderSetup` and `ProviderPending` pages themselves handle auth via `useAuth` hook. This is acceptable for pilot but worth noting.

### B2 — No public endpoints allow sensitive data operations with `anon` role

| Status | **PASS** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- **Supabase client** (`src/lib/supabase.ts`): uses `VITE_SUPABASE_ANON_KEY` only. No service role key in client code.
- **`/book/:token` public route:** `PublicBookingRequest` page — creates booking requests (MVP+ feature). RLS on `booking_requests` table enforces rate limiting via server-side function. Acceptable per SSOT §3.
- **RLS enabled on all critical tables:** `notification_preferences`, `notification_outbox`, `notification_deliveries`, `reservation_line_items`, `app_events`. Policies scope by `auth.uid()` or provider membership.
- **Security-definer functions** (`issue_reservation`, `process_return`): use `assert_provider_role()` to derive and verify provider from the reservation, ignoring client-supplied `p_provider_id`.

### B3 — No service role key shipped to client bundle

| Status | **PASS** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- `src/lib/supabase.ts` line 5–7: only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` used.
- `grep -r "SUPABASE_SERVICE_ROLE" src/` → **0 results.**
- `window.supabase` exposure is gated: `import.meta.env.MODE !== "production" && (DEV || VITE_EXPOSE_SUPABASE === "true")`(`src/App.tsx` line 335). Never exposed in production.
- `.env.production.local` contains only `E2E_SUPABASE_URL` — no keys.

---

## C — Core Ops Flow

### C1 — Provider approval gate

| Status | **PASS** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- **Route guard**: `ProviderRoute.tsx` lines 89–96: if `provider.status !== 'approved'`, user is redirected to `/provider/pending` for all routes except dashboard/pending/setup. Dashboard shows a blocking `PendingOverlay`.
- **DB**: `providers.status` column with `pending` → `approved` lifecycle. `approve_provider(target_user_id)` function is `SECURITY DEFINER SET search_path = public` with admin-only guard (`supabase/migrations/20260115130000_secure_sd_functions.sql` line 278).
- **Playwright test**: `smoke-checklist.spec.ts` tests A1–A5 (signup → pending screen → approval → dashboard access → logout/login).

### C2 — Inventory CRUD, provider-scoped

| Status | **PASS** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- **UI**: `ProviderInventory`, `InventoryForm`, `InventoryImport` pages exist in `src/pages/provider/`.
- **RPC**: `create_inventory_item`, `update_inventory_item`, `soft_delete_inventory_item` functions referenced in `src/lib/inventory.ts`.
- **RLS**: Products, variants, assets tables have RLS enabled with provider-membership policies. `gear_items` is treated as read-only per SSOT.
- **CSV export**: `exportInventoryCsv()` in `src/lib/csv-export.ts` — exports with BOM for Excel.
- **Playwright tests**: Steps B1–B4 in `smoke-checklist.spec.ts`.

### C3 — Internal reservations creation

| Status | **PASS** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- **UI**: `ReservationForm` page (`src/pages/provider/ReservationForm.tsx`) — staff creates reservations.
- **Route**: `/provider/reservations/new` wrapped in `<ProviderRoute>`.
- **Collision detection**: Tested in Playwright C2 — overlapping `hold` shows collision warning.
- **Playwright tests**: Steps C1–C5 cover create, collision, status display, edit, cancel.

### C4 — Issue/Return hard gate

| Status | **PASS** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- **`issue_reservation` RPC** (`supabase/migrations/20260218150000_pr4_1a_harden_issue_return.sql`): SECURITY DEFINER, SET search_path = public, calls `assert_provider_role()`, checks `v_affected_assets = 0 AND NOT p_override → RAISE EXCEPTION 'No available non-deleted assets assigned. Cannot issue reservation.'`. Full audit log with override reason.
- **`process_return` RPC** (same file): SECURITY DEFINER, SET search_path = public, `assert_provider_role()`, handles damage flag, idempotent (noop if already completed).
- **UI guard**: Playwright tests D1–D2 confirm `issue-confirm-btn` is disabled when no assets available, and `issue-no-assets-warning` is visible.
- **Overload cleanup**: `supabase/migrations/20260228180000_cleanup_rpc_overloads.sql` drops legacy function signatures to prevent ambiguity.

### C5 — Operational overview (dashboard)

| Status | **PASS** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- **DashboardOverview** (`src/pages/provider/DashboardOverview.tsx`): Uses `useDashboardData()` hook with KPI strip, agenda items (pickups/returns), and exceptions (overdue).
- **`useDashboardData`** (`src/hooks/useDashboardData.ts`): Three queries — KPIs, agenda (today's pickups/returns with issue/return mutations), exceptions (overdue). Provider-scoped via `provider.id` filter.
- **Playwright tests**: Steps F1–F2 verify dashboard sections.

### C6 — Print handover protocol

| Status | **PASS** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- **Component**: `ReservationHandoverPrint` (`src/pages/provider/ReservationHandoverPrint.tsx`) — 330 lines. Full print layout with provider info, dates, customer, items table, admin notes, signature blocks, terms URL. CSS `@media print` rules hide nav/sidebar.
- **Route**: `/provider/reservations/:id/print` wrapped in `<ProviderRoute>`.
- **Playwright test**: Step G1 verified.

### C7 — Export (CSV)

| Status | **PASS** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- **`src/lib/csv-export.ts`**: `exportInventoryCsv()` and `exportReservationsCsv()` — RFC 4180, UTF-8 BOM, Excel-friendly.
- **Headers**: Inventory (7 columns: item_id, asset_tag, product_name, variant_name, sku, status, created_at). Reservations (9 columns: reservation_id, status, date_from, date_to, customer_name, customer_email, customer_phone, total_lines, created_at).
- **Analytics export**: Additional `src/lib/analytics/csvExport.ts` exists.
- **Playwright tests**: Steps H1–H2 verified. |

---

## D — Notifications (Pilot: In-App Only)

### D1 — In-app notification infrastructure + UI bell

| Status | **PASS (with caveat)** |
| --- | --- |
| Evidence | See below for detailed evidence. |

**Evidence:**

- **Tables**: `notification_preferences`, `notification_outbox`, `notification_deliveries` created in `supabase/migrations/20260228165515_notification_infrastructure.sql`. All have RLS enabled with user-scoped policies.
- **Navbar bell**: `src/components/notifications/NotificationInbox.tsx` — Bell icon with animated red dot for unread count. Popover with notification list, "Mark all read" button. Rendered in `Navbar.tsx` line 111: `{(isProvider || isAdmin) && <NotificationInbox />}`.
- **Caveat**: `is_read` is hardcoded to `false` (line 61: `is_read: false // Hardcoded for simplicity during prototyping`). Every notification always appears unread. Unread count = total count of inapp notifications. This is a UX annoyance but not a blocker for pilot.

**Manual test script:**

1. Log in as an approved provider.
2. Verify bell icon appears in Navbar (top-right).
3. If notifications exist, verify red dot indicator appears.
4. Click bell → popover opens showing notifications.
5. Click "Mark all read" → unread indicators should clear (Note: on next page load, they will reappear — known MVP limitation).

### D2 — Pilot noise control (email disabled or flagged)

| Status | **⚠️ NOT VERIFIED — RISK** |
| --- | --- |
| Evidence | |
| | **Migration**: `notification_preferences` has `email_enabled boolean not null default true` (line 8). This means **email is ON by default** for new providers. |
| | **Dispatcher** (`supabase/functions/notify-dispatcher/index.ts`): Processes **all** channels from outbox (email + inapp). For email, it requires `RESEND_API_KEY` env var — if not set, email delivery fails gracefully with error "RESEND_API_KEY is not configured" (line 87). The dispatcher does **not** check `notification_preferences` before sending — it sends whatever channel is in the outbox record. |
| | **Risk**: If the notification cron writes both `email` and `inapp` records to outbox AND `RESEND_API_KEY` is configured in production, the pilot provider will receive email notifications. |
| | **Mitigation (already in place)**: If `RESEND_API_KEY` is NOT set in production Supabase secrets, email sending will silently fail. |

**Manual test script:**

1. SSH/dashboard into production Supabase → check if `RESEND_API_KEY` secret is set.
2. If YES → either remove it for pilot, or set `email_enabled = false` as default in a new migration.
3. If NO → email is already disabled. Document this as the pilot guard.
4. Verify: check `notification_outbox` for any records with `channel = 'email'` and `status = 'sent'`. Should be 0 for pilot.

**Proposed fix (smallest):**

- Option A: Verify `RESEND_API_KEY` is not set in production. Document.
- Option B: Add migration to change default: `ALTER TABLE notification_preferences ALTER COLUMN email_enabled SET DEFAULT false;`

### D3 — Realtime subscription uses provider-scoped filters

| Status | **PASS** |
| --- | --- |
| Evidence | |
| | **NotificationInbox.tsx** line 84: Realtime subscription filter is `filter: \`user_id=eq.${user.id}\``. This is user-scoped, not just provider-scoped. |
| | **RLS**: `notification_outbox` has SELECT policy `auth.uid() = user_id` — even if realtime delivered a record for another user, the query to fetch it would be blocked by RLS. |
| | **No cross-provider leakage**: The realtime filter + RLS double-guard prevents any user from seeing another user's notifications. |

---

## E — Data Integrity & SSOT Alignment

### E1 — Reservation totals derived safely (trigger/DB), FE cannot override

| Status | **PASS** |
| --- | --- |
| Evidence | |
| | **Trigger**: `update_reservation_total_on_line_item` in `supabase/migrations/20260228190000_reservation_line_items.sql` — fires on INSERT/UPDATE/DELETE of `reservation_line_items`, updates `reservations.total_price` and `amount_total_cents` via delta math. |
| | **No FE override**: The trigger uses SECURITY DEFINER to update `reservations` — the client doesn't need direct UPDATE on `total_price`. Line items have RLS for provider-member insert/update/delete, and the total is computed server-side. |

### E2 — Security-definer functions have safe `search_path`

| Status | **🔴 FAIL** |
| --- | --- |
| Evidence | |
| | **`update_reservation_total_on_line_item`** in `supabase/migrations/20260228190000_reservation_line_items.sql` line 100: `LANGUAGE plpgsql SECURITY DEFINER;` — **NO `SET search_path = public`**. This is a violation of the SSOT rule (§2 Security). |
| | **Other functions verified OK**: `issue_reservation`, `process_return`, `expire_stale_holds`, `approve_provider`, `check_is_member_safe`, `check_is_owner_safe` all have `SET search_path = public` (verified in `20260115130000_secure_sd_functions.sql` and `20260218150000_pr4_1a_harden_issue_return.sql`). |

**Proposed fix:**
Create migration `supabase/migrations/20260301180000_fix_line_items_search_path.sql`:

```sql
-- Fix: add SET search_path to SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.update_reservation_total_on_line_item()
RETURNS TRIGGER AS $$
DECLARE v_res_id UUID;
v_diff numeric(12, 2) := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN v_res_id := NEW.reservation_id; v_diff := NEW.amount;
  ELSIF TG_OP = 'UPDATE' THEN v_res_id := NEW.reservation_id; v_diff := NEW.amount - OLD.amount;
  ELSIF TG_OP = 'DELETE' THEN v_res_id := OLD.reservation_id; v_diff := - OLD.amount;
  END IF;
  IF v_diff != 0 THEN
    UPDATE public.reservations SET total_price = total_price + v_diff,
      amount_total_cents = amount_total_cents + (v_diff * 100)::integer
    WHERE id = v_res_id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### E3 — Smoke tests exist and are passing in CI

| Status | **PARTIAL PASS** |
| --- | --- |
| Evidence | |
| | **Playwright tests**: `e2e/smoke-checklist.spec.ts` (903 lines) — comprehensive coverage of steps A–I matching `docs/verification/pilot_smoke.md`. Tests e2e flows: signup, approval, inventory CRUD, reservation lifecycle (create/collision/edit/cancel), issue hard gate, return, dashboard ops, print, CSV export. |
| | **CI config**: `.github/workflows/ci.yml` — runs lint, typecheck, Deno unit tests (edge functions), and build. Has `e2e-smoke.yml` and `smoke.yml` workflow files for Playwright. |
| | **Gap**: The RLS test step in `ci.yml` is a **TODO placeholder** (line 100–102): `echo "TODO: configure Supabase CLI db test to run supabase/tests/rls_membership.sql"`. No automated RLS regression testing in CI. |
| | **DB tests**: `test_db` job exists but runs only nightly/manual and requires `SUPABASE_DB_URL` secret. |
| | **Documented run**: `docs/verification/pilot_smoke.md` exists as run-before-demo checklist. Previous sign-off at `docs/pilot_signoff.md` (2026-01-10). |

**Manual test script:**

1. Run `npx playwright test e2e/smoke-checklist.spec.ts` locally against a running Supabase instance.
2. Verify all steps A1–I1 pass.
3. Check `playwright-report/` for detailed results.
4. If any fail, file bug referencing failing step ID.

---

## Summary Table

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| A1 | Pilot runbook + pain reporting | 🟡 PARTIAL | Playbook exists but no structured feedback process |
| A2 | Instrumentation | ✅ PASS | `app_events` table + client telemetry |
| B1 | Route protection | ✅ PASS | ProviderRoute + AdminRoute + feature flags |
| B2 | No public anon writes | ✅ PASS | RLS on all tables, SD functions use assert_provider_role |
| B3 | No service key in client | ✅ PASS | Only anon key used; production guard on window.supabase |
| C1 | Provider approval gate | ✅ PASS | ProviderRoute blocks pending providers, approve_provider RPC |
| C2 | Inventory CRUD | ✅ PASS | UI + RPC + RLS + Playwright |
| C3 | Reservations creation | ✅ PASS | ReservationForm + collision detection + Playwright |
| C4 | Issue/Return hard gate | ✅ PASS | SD function with asset availability check + UI guard |
| C5 | Dashboard overview | ✅ PASS | KPI + agenda + exceptions (overdue) |
| C6 | Print handover | ✅ PASS | Full print layout with signatures |
| C7 | CSV export | ✅ PASS | Inventory + Reservations with BOM |
| D1 | In-app notifications + bell | ✅ PASS* | Bell works but is_read always false (cosmetic) |
| D2 | Pilot noise control | ⚠️ NOT VERIFIED | email_enabled defaults true; check RESEND_API_KEY in prod |
| D3 | Realtime scoping | ✅ PASS | user_id filter + RLS double guard |
| E1 | Totals derived safely | ✅ PASS | Trigger on reservation_line_items |
| E2 | SD functions search_path | 🔴 FAIL | `update_reservation_total_on_line_item` missing search_path |
| E3 | Tests in CI | 🟡 PARTIAL | Playwright exists but CI RLS tests are TODO |

---

## Recommended Next Actions (max 10)

1. **🔴 Fix `update_reservation_total_on_line_item`** — add `SET search_path = public`. One migration, zero risk. Apply before pilot launch.
2. **⚠️ Verify `RESEND_API_KEY`** — confirm it is NOT set in production Supabase secrets. If it is, remove it or change `email_enabled` default to `false`. Document the decision.
3. **🟡 Activate CI RLS tests** — replace the TODO echo step with `supabase db test` against a local or CI Supabase instance. This prevents regression.
4. **📝 Add pain-reporting section to `pilot_playbook.md`** — include a feedback form link, Slack channel, and weekly review cadence.
5. **🐛 Fix `is_read` in NotificationInbox** — track read status in DB (e.g., delivery record = read) or at minimum in localStorage. Low priority for pilot but annoying.
6. **📋 Run full Playwright smoke** (`e2e/smoke-checklist.spec.ts`) against production deployment before D-Day. Record results in `docs/verification/`.
7. **🔒 Consider adding explicit `REVOKE ALL … FROM public;` + `GRANT EXECUTE … TO authenticated;`** for `update_reservation_total_on_line_item` (it's a trigger function so GRANT is less critical, but defense-in-depth).
8. **📊 After pilot D-Day, query `app_events` table** for error-level events and review with provider.
9. **🔍 Verify `notification_cron_job` migration** (`20260228170020`) — confirm cron is configured to call dispatcher at the expected interval and with correct auth.
10. **📝 Update `docs/pilot_signoff.md`** with fresh audit results from this report before pilot launch.
