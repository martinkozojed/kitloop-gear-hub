# SSOT Alignment Audit — 2026-02-19

**SSOT reference:** [`docs/ssot/MVP_SCOPE.md`](../ssot/MVP_SCOPE.md)  
**Auditor:** AI agent (no functional changes made)  
**Scope:** `src/`, `supabase/` (migrations, functions, remote_schema)

---

## A) Status Enum Alignment

### SSOT canonical (MVP_SCOPE.md §2 Reservations)

```
hold | confirmed | issued | returned | cancelled
```

### Reality — DB constraint (remote_schema.sql:344, baseline_schema.sql:170)

```sql
CONSTRAINT "check_reservation_status" CHECK (
  status = ANY (ARRAY[
    'hold', 'pending', 'confirmed', 'active', 'completed', 'cancelled'
  ])
)
```

### Reality — TypeScript type (`src/lib/logic/reservation-state.ts:2-7`)

```ts
export type ReservationStatus =
    | 'pending'    // Created, awaiting confirmation/payment
    | 'confirmed'  // Payment active, waiting for pickup date
    | 'active'     // Picked up (Vydano)
    | 'completed'  // Returned (Vraceno) - Success state
    | 'cancelled'  // Cancelled before pickup
    | 'maintenance'// Internal block for repair
    | 'expired';   // Auto-cancelled after timeout
```

### Reality — UI extended type (`src/lib/status-colors.ts:27-35`, `src/types/dashboard.ts:3`)

```ts
// status-colors.ts also handles:
| 'overdue' | 'ready' | 'unpaid' | 'conflict'
| 'hold' | 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
```

### Reality — ProviderReservations page (`src/pages/provider/ProviderReservations.tsx:231`)

```ts
const validStatuses: ReservationStatus[] = [
  'hold', 'pending', 'confirmed', 'active', 'completed', 'cancelled',
  'overdue', 'ready', 'unpaid', 'conflict'
];
```

### Reality — Analytics queries (`src/lib/analytics/queries.ts:29,36`)

```ts
export const REVENUE_STATUSES = ["confirmed", "active", "completed"] as const;
export const ACTIVE_RESERVATION_STATUSES = ["hold", "confirmed", "active"] as const;
```

### Reality — Seed / e2e harness (`supabase/seed.sql:107`, `supabase/functions/e2e_harness/index.ts:1016`)

Uses `"hold"`, `"confirmed"` — no `"issued"` or `"returned"` in seed data.

### Verdict: **MISMATCH**

| SSOT value | DB constraint | TS type | Notes |
|---|---|---|---|
| `hold` | ✅ | ✅ | OK |
| `confirmed` | ✅ | ✅ | OK |
| `issued` | ❌ absent | ❌ absent | DB uses `active` instead |
| `returned` | ❌ absent | ❌ absent | DB uses `completed` instead |
| `cancelled` | ✅ | ✅ | OK |
| `pending` | present (extra) | present (extra) | Not in SSOT |
| `active` | present (extra) | present (extra) | Semantic alias for `issued` |
| `completed` | present (extra) | present (extra) | Semantic alias for `returned` |
| `maintenance` | absent | present (extra) | TS-only, no DB constraint |
| `expired` | absent | present (extra) | TS-only, no DB constraint |
| `overdue`/`ready`/`unpaid`/`conflict` | absent | UI-derived only | Computed, not stored |

**Summary:** The DB and codebase use `active`/`completed` where SSOT says `issued`/`returned`. The DB also includes `pending` which is not in the SSOT canonical set. These are semantic renames, not data corruption, but they create a naming drift that affects filter chips, audit logs, and any future integrations.

**Commands run:**
```
rg "hold|confirmed|issued|returned|cancelled" src/ supabase/ -n
rg "check_reservation_status" supabase/ -n
```

---

## B) Auth & Provider Approval Gating

### Auth handling files (signup/login/session)

| File | Role |
|---|---|
| `src/context/AuthContext.tsx` | Auth context — session persistence, `useAuth` hook |
| `src/lib/authUtils.ts` | Auth utility helpers |
| `src/pages/Login.tsx` | Login form |
| `src/pages/SignUp.tsx` | Signup form |
| `src/pages/ForgotPassword.tsx` | Password reset request |
| `src/pages/ResetPassword.tsx` | Password reset confirmation |

### Approval source of truth

DB column: `providers.approved_at` (timestamp) + `providers.verified` (boolean).  
Evidence from `supabase/migrations/20250101000000_baseline_schema.sql:575,739`:
```sql
"approved_at" timestamp with time zone,
CREATE INDEX "providers_verified_idx" ON "public"."providers" USING "btree" ("verified", "approved_at");
```

RLS policy (`baseline_schema.sql:1232`):
```sql
CREATE POLICY "providers_public_select" ON "public"."providers"
  FOR SELECT USING (verified = true AND approved_at IS NOT NULL AND deleted_at IS NULL);
```

Gear visibility gated on approval (`baseline_schema.sql:1059`):
```sql
CREATE POLICY "gear_items_public_select" ON "public"."gear_items"
  FOR SELECT USING (active = true AND EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = gear_items.provider_id
      AND p.verified = true AND p.approved_at IS NOT NULL AND p.deleted_at IS NULL
  ));
```

### Route protection / "locked until approved"

`src/components/auth/ProviderRoute.tsx:87-105`:
```tsx
// If pending, block ALL provider routes except dashboard/pending/setup
if (!isAdmin && provider && provider.status !== 'approved') {
  const allowedPendingPaths = ['/provider/dashboard', '/provider/pending', '/provider/setup'];
  // ...redirect to /provider/pending
}
```

Provider onboarding sets `status: 'pending'` (`src/pages/provider/ProviderSetup.tsx:181`, `src/pages/AddRental.tsx:126`).  
Admin approval page: `src/pages/admin/ProviderApprovals.tsx` — queries `status = 'pending'` and calls `admin_action` RPC.

### Verdict: **OK (with one note)**

Route protection is implemented and blocks non-approved providers. The dual-field approval (`verified` boolean + `approved_at` timestamp) matches the DB RLS policies. The `ProviderRoute` guard checks `provider.status !== 'approved'` which aligns with the `providers.status` column (separate from `approved_at`).

**Note:** The approval check in `ProviderRoute` uses `provider.status` (string field), while DB RLS uses `verified = true AND approved_at IS NOT NULL`. These are two separate fields that must both be set by the admin action — worth verifying `admin_action` RPC sets both atomically.

**Commands run:**
```
rg "approved|approved_at|status.*approved|pending" src/ supabase/ -n --type ts
rg "ProviderRoute|provider.status" src/ -n
```

---

## C) Reservation Guard: Issue Hard Gate

### Issue flow implementation

**UI entry points:**
- `src/components/operations/IssueFlow.tsx:182` — calls `supabase.rpc('issue_reservation', ...)`
- `src/pages/provider/ReservationFlows.tsx:36` — calls `supabase.rpc('issue_reservation', ...)`
- `src/pages/provider/DashboardOverview.tsx:123` — calls `issueReservation()` from `useDashboardData`
- `src/hooks/useDashboardData.ts:234` — calls `supabase.rpc('issue_reservation', ...)`

**Active RPC definition:** `supabase/migrations/20260123193000_update_issue_rpc.sql`

### Status gate (DB-enforced)

```sql
IF v_reservation.status NOT IN ('confirmed', 'pending')
AND NOT p_override THEN
  RAISE EXCEPTION 'Reservation must be confirmed to be issued. Current status: %', v_reservation.status;
END IF;
```

### Asset availability gate (DB-enforced)

```sql
IF v_affected_assets = 0 AND NOT p_override THEN
  RAISE EXCEPTION 'No assets assigned. Cannot issue empty reservation.';
END IF;
```

The RPC iterates `reservation_assignments` and locks assets via `FOR UPDATE`. If no assignments exist and `p_override = false`, it raises an exception. This is a hard gate at the DB level.

### Override handling

Override is supported (`p_override BOOLEAN DEFAULT false`, `p_override_reason TEXT DEFAULT NULL`). When used, it is captured in the audit log:
```sql
INSERT INTO public.audit_logs (..., metadata)
VALUES (..., jsonb_build_object(
  'override', p_override,
  'override_reason', p_override_reason,
  'assets_issued', v_affected_assets,
  'previous_status', v_reservation.status
));
```

### Verdict: **OK (with one note)**

Hard gate exists at DB level. Override is allowed but captures reason + audit trail — this satisfies the SSOT requirement ("allowed only if a reason is captured in the audit trail").

**Note:** The RPC allows issuing from `'pending'` status (not just `'confirmed'`), which is broader than the SSOT canonical flow. This is a minor drift — `pending` is not in the SSOT status set, so this path should not normally be reachable in production.

**Commands run:**
```
rg "issue_reservation|issueReservation" src/ supabase/ -n
cat supabase/migrations/20260123193000_update_issue_rpc.sql
```

---

## D) gear_items is Read-Only View

### SSOT requirement

> `gear_items` is READ-ONLY VIEW (production). Do not INSERT/ALTER it.

### Reality — baseline_schema.sql:364

```sql
CREATE TABLE IF NOT EXISTS "public"."gear_items" (
  ...
  CONSTRAINT "gear_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE ONLY "public"."gear_items" FORCE ROW LEVEL SECURITY;
```

`gear_items` is a **TABLE**, not a VIEW, in the baseline migration and remote schema.

### DML on gear_items

```
rg "INSERT INTO gear_items|UPDATE gear_items|DELETE FROM gear_items" src/ supabase/ -n
```
Result: **no matches** — no application code performs direct INSERT/UPDATE/DELETE on `gear_items`.

However, `supabase/migrations/20250101000000_baseline_schema.sql:334` contains:
```sql
UPDATE public.gear_items
SET quantity_available = ...
```
This is inside an RPC function body (not application-level DML).

RLS policies on `gear_items` allow INSERT/UPDATE/DELETE for owners and admins:
- `gear_items_owner_insert`, `gear_items_owner_update`, `gear_items_owner_delete` policies exist.

### Verdict: **MISMATCH**

The SSOT says `gear_items` is a read-only VIEW; the actual schema defines it as a TABLE with full RLS-gated write access. No application code (src/) performs direct DML, but the DB schema contradicts the SSOT description. This may be an SSOT documentation error (the intent may be "don't write to it from the app layer"), or a schema design debt.

**Commands run:**
```
rg "gear_items" src/ supabase/ -n
grep "CREATE TABLE\|CREATE VIEW" supabase/migrations/20250101000000_baseline_schema.sql | grep gear_items
rg "INSERT INTO gear_items|UPDATE gear_items|DELETE FROM gear_items" src/ supabase/ -n
```

---

## E) Single Operations Surface Rule

### SSOT requirement

> The operational overview is the **Dashboard action center** (the existing dashboard page). No parallel "Operations page" may be created in MVP.

### Reality — routes in `src/App.tsx`

Registered provider routes:
```
/provider/dashboard       → DashboardOverview (ProviderRoute-gated)
/provider/inventory       → ProviderInventory
/provider/reservations    → ProviderReservations
/provider/analytics       → ProviderAnalytics
/provider/maintenance     → ProviderMaintenance
/provider/reservations/new
/provider/settings
/provider/calendar
/provider/customers
/provider/accounts
```

No `/provider/operations` route exists.

### Issue/Return flow surface points

`IssueFlow` and `ReturnFlow` components are imported in:
- `src/pages/provider/DashboardOverview.tsx` ✅ (correct — dashboard action center)
- `src/pages/provider/ReservationFlows.tsx` — separate page/component
- `src/components/reservations/ReservationDetailSheet.tsx` — sheet/modal within reservations list
- `src/pages/provider/ReservationDetail.tsx` — detail page

### Verdict: **OK (minor duplication risk)**

No separate `/operations` route exists. The Issue/Return flows are accessible from the Dashboard (correct per SSOT) but are also embedded in the Reservations detail view and a `ReservationFlows` component. This is a duplication of the action surface — not a separate page, but the same operation is reachable from multiple surfaces. This is a low risk for MVP but worth monitoring.

**Commands run:**
```
grep -n "Route\|path=" src/App.tsx
rg "IssueFlow|ReturnFlow" src/ -n -l
```

---

## Summary Table

| Section | Verdict | Severity |
|---|---|---|
| A) Status enum alignment | **MISMATCH** | Medium — naming drift (`active`/`completed` vs `issued`/`returned`); also `pending` not in SSOT |
| B) Auth & provider approval gating | **OK** (note: dual-field approval) | Low |
| C) Issue hard gate | **OK** (note: `pending` status also allowed) | Low |
| D) gear_items read-only view | **MISMATCH** | Medium — it's a TABLE, not a VIEW; SSOT may be aspirational |
| E) Single operations surface | **OK** (minor duplication risk) | Low |

---

## Next PR Recommendations

### PR 1 — `fix: align reservation status strings to SSOT canonical`
**Smallest path to alignment.** Rename `active` → `issued` and `completed` → `returned` in DB constraint, TS types, UI labels, and analytics constants. Remove `pending` from the canonical set (or document it as a pre-payment transitional state not exposed in UI filters).

Files likely touched:
- `supabase/migrations/` — new migration to update `check_reservation_status` constraint
- `src/lib/logic/reservation-state.ts`
- `src/lib/status-colors.ts`
- `src/lib/analytics/queries.ts` (REVENUE_STATUSES, ACTIVE_RESERVATION_STATUSES)
- `src/locales/cs.json`, `src/locales/en.json`
- `src/pages/provider/ProviderReservations.tsx`

**Pilot blocker:** Yes — status string mismatch causes confusion in audit logs and any future integrations.

### PR 2 — `fix: clarify gear_items table vs view in SSOT + add app-layer guard`
Two options (pick one):
1. Update SSOT to say "gear_items is a TABLE; app layer must not write to it directly" and add a lint/comment guard.
2. Create a read-only view `gear_catalog` and migrate app reads to it, keeping `gear_items` as the write table.

Files likely touched:
- `docs/ssot/MVP_SCOPE.md` (if option 1)
- `supabase/migrations/` (if option 2)
- `src/lib/analytics/queries.ts` (if option 2)

**Pilot blocker:** No — no app-layer DML exists today; this is a documentation/architecture debt.

### PR 3 — `fix: verify admin_action RPC sets both providers.verified and providers.approved_at atomically`
Confirm the admin approval action sets both `verified = true` AND `approved_at = NOW()` in a single transaction. If not, add the missing field update.

Files likely touched:
- `supabase/functions/admin_action/index.ts`
- `supabase/migrations/` (if DB function needs update)

**Pilot blocker:** Yes — if `approved_at` is not set, RLS policies silently block gear visibility even for approved providers.
