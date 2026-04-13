# Kitloop MVP Scope (SSOT)

**Status:** ACTIVE — this is the Single Source of Truth for MVP scope  
**Owner:** Maintainers (human)  
**Rule:** If a change is not aligned with this file, it does not ship.

## 0) Goal (what "MVP ready for onboarding" means)

Ship a production-stable **provider-only SaaS** that a real rental can use for:

- inventory management,
- internal reservations (created by staff),
- issue/return operations,
- basic operational overview (today pickups/returns/overdue),
- exports/printouts.

**Warm outreach + manual provider approval.** Landing is onboarding + gate to signup/login (not marketing). No unverifiable promises.

## 1) Product boundary (hard line)

### MVP = Provider-only operations

- **Customers cannot create reservations in MVP.**
- Reservations are created by **provider staff** (walk-in / phone / email / form leads).
- No public catalogue / no customer accounts required for MVP.

### MVP+ = Public "Request link" (poptávka), not instant booking

- Optional but allowed **within MVP timeframe** if it stays request-based:
  - customer submits a request → provider approves/declines → only then an internal reservation is created.
- **No guaranteed real-time availability** in public UI.

## 2) MUST-HAVE (MVP)

### Auth & Provider lifecycle (non-negotiable deliverable)

- Signup / login (email+password via Supabase Auth).
- Session persistence across page reloads.
- Protected routes: unauthenticated users are redirected to login.
- Password reset flow works end-to-end.
- Provider onboarding state machine: `pending` → `approved` (manual by Kitloop admin).
  - App surfaces are **locked until `approved`**: any authenticated but non-approved provider sees a clear **"Pending approval"** screen and cannot access operational features.
  - There is no self-service approval; approval is performed out-of-band by Kitloop staff.

### Inventory & data model

- Providers manage inventory (products/variants/assets or equivalent canonical tables).
- `gear_items` is a **TABLE** (not a view). Schema defined in `supabase/migrations/20250101000000_baseline_schema.sql` (search `CREATE TABLE.*gear_items`).
  - **App-layer rule:** Application code must treat `gear_items` as read-only. No direct INSERT/UPDATE/DELETE from `src/` code. Use canonical flows and canonical tables only.
  - RLS policies exist for owner/admin writes at the DB layer (used by internal RPCs), but no application code in `src/` should bypass this via direct DML.
  - **Do not change this rule without a `SCOPE CHANGE:` PR.**

### Reservations (internal)

- Staff can create/modify/cancel internal reservations.
- **Canonical DB status strings** (actual values stored in the `reservations.status` column and enforced by `check_reservation_status` DB constraint):

  | DB string | UI label shown to users | Notes |
  |---|---|---|
  | `hold` | Hold | Soft block; collision allowed with warning |
  | `pending` | Pending | Pre-confirmation / pre-payment transitional state |
  | `confirmed` | Confirmed | Confirmed, awaiting pickup |
  | `active` | Issued / Vydáno | Picked up (semantic alias for "issued") |
  | `completed` | Returned / Vráceno | Returned (semantic alias for "returned") |
  | `cancelled` | Cancelled | Cancelled before pickup |

  Additional UI-derived/computed statuses (never stored in DB): `overdue`, `ready`, `unpaid`, `conflict`.  
  Additional TS-only statuses (not in DB constraint): `maintenance`, `expired`.

  > **Note:** The SSOT previously listed `issued`/`returned` as the canonical DB strings. The actual DB constraint and codebase use `active`/`completed` for these states. The UI may display "Issued"/"Returned" labels mapped from `active`/`completed`. See audit: `docs/verification/ssot_alignment_audit_2026-02-19.md §A`.

- **Rule: Do not introduce new status strings without a `SCOPE CHANGE:` PR.** Any new value must be added to the DB constraint, the TS type, the UI label mapping, and this table atomically.
- **Collision/overbooking guard — two-tier rule:**
  - *Hold*: soft collision allowed — show a warning but do not block creation.
  - *Issue*: **hard gate** — cannot issue if the required assets are unavailable. The Issue action is blocked, not warned.
  - Override at Issue: allowed **only** if the role explicitly supports it AND a reason is captured in the audit trail. If neither condition is met, there is **no override in MVP**.

### Operations (single surface — no duplicates)

The operational overview is the **Dashboard action center** (the existing dashboard page).

- Surfaces: today's pickups, today's returns, overdue items.
- Issue flow + return flow are accessible from this surface.
- Print handover protocol (print view) works.
- **No parallel "Operations page" may be created in MVP.** One surface only. If a separate page is proposed, it requires a `SCOPE CHANGE:` PR.

### Exports

- CSV export inventory + reservations (Excel-friendly).

### Security (non-negotiable)

- Never trust provider_id from client when derivable.
- Provider-only operations must derive provider via server-side chain and enforce membership/role.
- All SECURITY DEFINER functions:
  - `SET search_path = public`
  - correct GRANT/REVOKE (no PUBLIC/anon unless explicitly intended)
- RLS must be enabled and correct on all sensitive tables.

### Reliability

- Each PR includes explicit verification steps.
- Main branch stays stable (typecheck/lint/build gates pass).

## 3) MUST-HAVE (MVP+) — Public Request Link (only if implemented)

- Public provider page (Kitloop URL) + simple request form (day-level dates).
- `booking_requests` (or equivalent) stored with rate limiting / anti-spam.
- Provider dashboard page to approve/decline requests.
- Approve creates an internal reservation using canonical server-side flow.

**Language:** Use "Poptávka / Request", not "Rezervace", unless it is guaranteed.

## 4) OUT OF SCOPE (explicit non-goals for MVP)

These are NOT required and must not block shipping:

- Embedded widget / "integrate Kitloop into their website" (full integration)  
- Instant online booking with guaranteed availability  
- Hour-level pickup slots, opening-hours scheduling, buffers  
- Payments, Stripe checkout, refunds  
- Customer notifications as a blocker (ok to add later; internal reminders optional)  
- Reviews, public profiles, marketplace discovery  
- Multi-location providers, complex pricing rules

If any of the above is proposed, it must go through Scope Change (section 6).

## 5) Engineering guardrails (how we work)

- Surgical MVP alignment: prefer hiding via feature flags over refactors.
- 1 PR = 1 theme, small diff, clear verification.
- If something loops twice → split task or stop and escalate.
- **Production parity guardrail:** Any migration that touches a canonical table or view must be validated against the production schema before merging.
  - Minimum check: record `pg_get_viewdef('gear_items'::regclass)` (or the exact prod view definition) before and after; confirm no unintended divergence.
  - Canonical tables/views that **must not diverge** without explicit sign-off: `gear_items` (view), `products`, `variants`, `assets`, `reservations`, `reservation_items`.
  - Evidence of the parity check must be included in the PR description.

## 6) Scope change control (prevents drift)

Any change that expands scope MUST be a dedicated PR:

- PR title starts with: `SCOPE CHANGE: ...`
- Update this file with:
  - what changes,
  - why it's necessary for onboarding,
  - what gets deprioritized.
Otherwise the PR is rejected.

## 7) Definition of Done (per PR)

- Typecheck, lint, build pass.
- Security/RLS not weakened (explicitly verified).
- Verification steps written in PR description.
- No new "silent failures" (errors surfaced to user or logged to app_events).

---

### Approved Scope Changes

#### SCOPE CHANGE: Notification Infrastructure (2026-02-28)

- **What changes:** Implementation of a robust, outbox-pattern notification infrastructure (preferences, outbox queue, delivery logs, edge dispatcher, DB triggers for `ops.overdue_detected`, etc.).
- **Why it's necessary:** Essential for operational reliability ("Pultový OS") to prevent providers from returning to Excel by ensuring they don't miss overdue items or tomorrow's pickups. Centralizes and deduplicates all system messaging.
- **What gets deprioritized:** Ad-hoc pricing (`reservation_line_items`), public request links (`booking_requests`), and Asset Tracking via QR are pushed back to subsequent post-MVP phases.
