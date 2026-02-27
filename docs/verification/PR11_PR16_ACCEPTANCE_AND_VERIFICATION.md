# PR#11–PR#16: Acceptance checklists and verification steps

Production-grade onboarding funnel (B2B SaaS, manual approval pilot). SSOT: provider-only MVP, internal reservations, no customer booking.

---

## PR#11 — Real UI proof on onboarding

**Goal:** Replace placeholders with real proof (2 loop videos + 1 screenshot) without hurting CLS/LCP.

### Files changed
- `src/pages/Onboarding.tsx` — OnboardingScreenMedia, 16:9, lazy, IntersectionObserver, preload=none, muted, loop, fallback
- `src/locales/en/onboarding.json` — screensSub, screen1–3Caption
- `src/locales/cs/onboarding.json` — same keys
- `public/onboarding/README.md` — asset requirements (reservation-loop.mp4, handover-loop.mp4, dashboard-screenshot.webp)

### Acceptance checklist
- [ ] Two loop assets + one screenshot used in UI
- [ ] No CLS (fixed 16:9 containers)
- [ ] Videos play only when in view (IntersectionObserver)
- [ ] Fallback when assets missing (copy visible, no broken UI)

### Local verification
1. `npm run build` — passes.
2. Add assets under `public/onboarding/` per README (or leave missing to test fallback).
3. Open `/onboarding`, scroll to each media block; verify videos play when in view, pause when scrolled away.
4. Check DevTools Performance/LCP; no large layout shift.

### Preview verification
- Deploy; run Lighthouse (LCP/CLS); confirm assets load and no regression.

### i18n
- Keys in `en/onboarding.json` and `cs/onboarding.json`: screensSub, screen1Caption, screen2Caption, screen3Caption.

---

## PR#12 — Pilot request is request-only (no password)

**Goal:** `/signup` collects pilot request only; no auth account created.

### Files changed
- `supabase/migrations/20260227200000_pilot_requests_table.sql` — table + RPC submit_pilot_request
- `supabase/functions/submit_pilot_request/index.ts` — verify_jwt=false, validation, **ALLOWED_ORIGINS** CORS allowlist, honeypot, rate limit (PILOT_RATE_LIMIT / PILOT_RATE_WINDOW_MS)
- `supabase/config.toml` — submit_pilot_request verify_jwt=false
- `src/services/pilotRequest.ts` — call Edge Function, optional _hp
- `src/pages/SignUp.tsx` — no password; honeypot ref; submit payload includes _hp

### Rate limit policy (documented)
- **Policy:** `PILOT_RATE_LIMIT` requests per `PILOT_RATE_WINDOW_MS` per **bucket** (default 5 / 60 s). Bucket key = **IP + User-Agent** (first 80 chars) to reduce NAT/cowork false positives.
- Env: `PILOT_RATE_LIMIT`, `PILOT_RATE_WINDOW_MS`, `RATE_LIMIT_SALT` (min 16 chars). When **ENVIRONMENT=production**, missing `RATE_LIMIT_SALT` → **500** (fail-closed).
- When exceeded: **429** with `retry_after_seconds` and `Retry-After` header; no row saved.
- **State is in-memory per instance.** With multiple edge/serverless instances, protection is "soft" (traffic spread across instances). Upgrade path when spam/traffic grows: see **PR#17 — Rate limit upgrade** below.

### CORS
- **ALLOWED_ORIGINS** (CSV): if set, `Origin` header must be **present** and in list or **403**. **Missing Origin** → **403** (safest default; browser form POST typically sends it; some API clients may omit it). Comparison uses **normalized** origin (trim, no trailing slash). Entries in list: scheme + host + port, **no trailing slash** (e.g. `https://app.kitloop.cz`). In practice the `Origin` header has no trailing slash; normalizing helps the allowlist from env. When echoing, response includes **Vary: Origin** so CDN/proxy do not cache CORS for the wrong origin. If unset, `*` (dev). When **ENVIRONMENT=production**, empty `ALLOWED_ORIGINS` → **500** (fail-closed).

### Production release gate (fail-closed)
- Set **ENVIRONMENT=production** in prod (Supabase Edge Function secrets / Netlify env — ensure it is always set for prod deploy). Then: **ALLOWED_ORIGINS** and **RATE_LIMIT_SALT** (min 16 chars) must be set or the function returns **500** "Server misconfiguration" and logs `RELEASE GATE: ...`.

### Acceptance checklist
- [ ] No password field on `/signup`
- [ ] Submit creates row in `pilot_requests` (DB)
- [ ] No auth user created on submit
- [ ] Honeypot: server returns **422** when `_hp` non-empty; **no row** saved; no per-request log
- [ ] Rate limit: when RATE_LIMIT_SALT set, 429 after N requests in window (test with policy above)
- [ ] CORS: when ALLOWED_ORIGINS set, request without Origin or with Origin not in list → 403
- [ ] Time trap: submit &lt; 2.5s after load → client-side error; server still enforces _hp

### Local verification
1. `npm run build` — passes.
2. Apply migrations: `supabase db reset` or apply `20260227200000_*`.
3. Start app + Supabase (local or linked); open `/signup`, fill form, submit.
4. In DB: `SELECT * FROM pilot_requests ORDER BY created_at DESC LIMIT 1` — row exists; no new row in `auth.users`.
5. **Submit with _hp non-empty**: e.g. call API with `_hp: "x"` — server returns **422**, **no row** in `pilot_requests`. No per-request log (minimal logging to avoid spam).
6. **Submit without _hp / empty** — request succeeds.
7. Submit within 2.5s of page load — client shows "Please wait a moment before submitting." (time trap is **frontend-only**; server-side rate limit + _hp are the real protection.)

### Preview verification
- Deploy Edge Function + frontend; submit from preview URL; confirm row in hosted DB, no auth user.

### i18n
- Signup copy in `en.json` / `cs.json` (signup.*) — already present.

---

## PR#13 — Pending experience upgrade

**Goal:** Pending is a clear process state + how to speed up; optional call link.

### Files changed
- `src/pages/provider/ProviderPending.tsx` — “What happens next” (3 steps), “How to speed up”, contact, “Book 15 min call” gated by VITE_BOOK_CALL_URL
- `src/locales/en.json` — pending.*
- `src/locales/cs.json` — pending.*

### Acceptance checklist
- [ ] Clear 3-step “What happens next”
- [ ] “How to speed up” (CSV, pricing, deposit)
- [ ] Contact visible
- [ ] “Book 15 min call” only when VITE_BOOK_CALL_URL is set

### Local verification
1. Build; set `VITE_BOOK_CALL_URL=https://cal.example.com/book` (or leave unset).
2. As pending provider, open `/provider/pending` — see 3 steps and speed-up checklist; call button only if env set.

### i18n
- pending.* in en and cs.

---

## PR#14 — Minimal email drip (Resend, optional)

**Goal:** 3 emails: confirmation, D+1 prep, D+3 nudge; app works without secrets.

### Files changed
- `supabase/functions/_shared/pilot_emails.ts` — templates (request_confirmation, prep_checklist, activation_nudge)
- `supabase/functions/submit_pilot_request/index.ts` — send request_confirmation when RESEND_* set; set request_confirmation_sent_at
- `supabase/functions/run_pilot_drip/index.ts` — select by created_at + *_sent_at; send prep/activation; update flags
- Migration: request_confirmation_sent_at, prep_checklist_sent_at, activation_nudge_sent_at (in 20260227200000)
- `.env.example` — RESEND_API_KEY, RESEND_FROM, optional VITE_BOOK_CALL_URL

### Acceptance checklist
- [ ] 3 email templates (process/help only)
- [ ] request_confirmation sent on submit when Resend configured
- [ ] run_pilot_drip sends D+1 prep and D+3 activation for eligible rows
- [ ] App and submit work when RESEND_* not set (no-op)

### Local verification
1. Without RESEND_*: submit pilot request — success, no email.
2. With RESEND_*: submit — confirmation email; run `run_pilot_drip` (cron or manual) — prep/activation for eligible rows.

### i18n
- Email content in pilot_emails.ts (EN only for emails is acceptable; no UI strings added).

---

## PR#15 — Activation alignment

**Goal:** In-app checklist and wizard match “first hour” promise; nudges after steps 1 and 2.

### Files changed
- `src/pages/provider/ProviderSetup.tsx` — toasts after steps 1 and 2 (nudgeNextLocation, nudgeNextInventory)
- `src/components/dashboard/OnboardingChecklist.tsx` — “Next: …” line with link to first incomplete step when href exists
- `src/locales/en.json`, `src/locales/cs.json` — onboarding.wizard.nudgeNextLocation, nudgeNextInventory, onboarding.checklist.nextStep

### Acceptance checklist
- [ ] Wizard + checklist map to 4 steps: workspace, location, inventory, first reservation
- [ ] Nudges after steps 1 and 2 guide next action
- [ ] “Next: …” in checklist links to first incomplete step when href present

### Local verification
1. As provider, complete setup step 1 → see nudge to location; step 2 → nudge to inventory.
2. On dashboard, checklist shows “Next: …” with link when step has href.

### i18n
- en + cs: onboarding.wizard.nudgeNextLocation, nudgeNextInventory, onboarding.checklist.nextStep.

---

## PR#16 — Approve & invite (complete request-only model)

**Goal:** After manual approval, create/invite user and mark pilot_requests status; non-admin cannot access.

### Files changed
- `supabase/migrations/20260227210000_pilot_requests_invited.sql` — invited_at, invited_by on pilot_requests
- `supabase/migrations/20260227220000_admin_list_pilot_requests.sql` — RPC admin_list_pilot_requests() (admin-only list)
- `supabase/migrations/20260227230000_pilot_requests_inviting_state.sql` — status inviting/invite_failed, inviting_at, invite_error (no "stuck invited")
- `supabase/functions/approve_and_invite/index.ts` — verify_jwt=true, is_admin_trusted, inviteUserByEmail, update pilot_requests, audit log
- `supabase/functions/reset_pilot_request_inviting/index.ts` — admin-only; inviting → invite_failed (manual_reset)
- `supabase/config.toml` — approve_and_invite, reset_pilot_request_inviting verify_jwt=true
- `src/pages/admin/PilotRequests.tsx` — list pilot_requests, “Approve & Invite” → invoke Edge Function
- `src/App.tsx` — route `/admin/pilot-requests`, lazy PilotRequests
- `src/components/provider/ProviderSidebar.tsx` — admin nav link “Pilot requests” (Mail icon)
- `src/locales/en.json` — admin.pilotRequests.*, provider.sidebar.nav.pilotRequests
- `src/locales/cs.json` — same

### Acceptance checklist
- [ ] One click turns a pilot_request (pending) into an invited user
- [ ] Approved user can sign in via invite link and set password
- [ ] pilot_requests row: status=invited, invited_at, invited_by set
- [ ] Non-admin cannot read pilot_requests or call approve_and_invite (RPC admin_list_pilot_requests + verify_jwt + is_admin_trusted)
- [ ] List data via RPC `admin_list_pilot_requests()` only (no direct SELECT from client); RPC has SECURITY DEFINER, SET search_path = public, REVOKE from public
- [ ] **redirectTo** URL is whitelisted in Supabase Auth → Redirect URLs
- [ ] Double-click / concurrent admin: second request gets 409 "Already processed" (atomic update where status='pending')
- [ ] **User already exists**: UI shows clear message; operatively use "Send password reset" or link existing user manually
- [ ] **No "stuck invited"**: on invite failure, status = invite_failed + **sanitized** invite_error (codes only: REDIRECT_NOT_ALLOWED, USER_EXISTS, RATE_LIMIT, PROVIDER_ERROR); UI shows "Retry invite"
- [ ] **inviting in-progress**: second click while inviting (&lt; 2 min) → 409 IN_PROGRESS; UI: "Invite is being sent, try again in a moment."
- [ ] **Stuck inviting**: inviting_at &gt; 10 min → server allows retry (resets to invite_failed); or admin uses "Reset to invite_failed" button
- [ ] **Audit**: metadata includes from_status, to_status, pilot_request_id, **target_email_hash** (SHA256, not plain email)
- [ ] Minimal audit: admin_audit_logs entry (action=other, metadata.action=approve_and_invite_pilot)

### Local verification
1. Apply migrations 20260227210000, 20260227220000, 20260227230000 (invited_at/invited_by, admin_list_pilot_requests, inviting/invite_failed).
2. Add **redirectTo** (e.g. `http://localhost:5173/reset-password`) to Supabase Auth → Redirect URLs.
3. Ensure admin user exists (profile.role=admin / user_roles).
4. Create a pending pilot request via `/signup`.
5. As admin, open `/admin/pilot-requests`, click “Approve & Invite” for that request.
6. Check DB: pilot_requests.status=invited, invited_at and invited_by set; auth.users has new user (invited); admin_audit_logs has entry.
7. Use invite email link (or Auth dashboard) → set password and sign in.
8. **Non-admin**: as non-admin, open `/admin/pilot-requests` — redirect/403; RPC admin_list_pilot_requests returns error.
9. **Race**: click "Approve & Invite" twice quickly on same request — first succeeds, second gets 409 "Already processed".
10. **User exists**: approve request for an email that already has an account — 409 USER_EXISTS; UI shows "Use password reset or link manually".
11. **Simulate invite failure**: remove redirectTo from Auth Redirect URLs; click "Approve & Invite" — status = invite_failed, invite_error set; UI shows "Retry invite".
12. **Retry flow**: re-add redirectTo; click "Retry invite" on that row — invite succeeds; status=invited.
13. **Inviting in-progress**: (optional) trigger invite, then click again within 2 min — 409 IN_PROGRESS; UI shows "Invite is being sent, try again in a moment."
14. **Stuck inviting**: row in inviting &gt; 10 min → "Approve & Invite" / "Retry invite" allowed (server resets to invite_failed and retries); or click "Reset to invite_failed" then "Retry invite".
15. **invite_error sanitized**: after invite failure, invite_error is a short code (e.g. REDIRECT_NOT_ALLOWED), not raw stack or internal IDs.
16. **Audit**: admin_audit_logs row has metadata.from_status, to_status, pilot_request_id, target_email_hash (no plain email).

### Preview verification
- Deploy functions + app; repeat steps 3–16 on preview URL and hosted DB.

### i18n
- admin.pilotRequests.* (incl. inProgress, resetToInviteFailed, resetDone) and provider.sidebar.nav.pilotRequests in en and cs.

---

## PR#17 — Rate limit upgrade path (when needed)

Current in-memory limit is a fair compromise for pilot traffic. When spam or real traffic grows, in-memory state does not protect across instances. Documented here as **ready-to-merge** when you want to harden.

**Variant A — Postgres counter (no extra service)**  
- Table `pilot_rate_limits`: `bucket_key` (hash of ip+ua+salt), `window_start` (timestamptz), `count` (int).  
- Service role: `INSERT ... ON CONFLICT (bucket_key, window_start) DO UPDATE SET count = count + 1 RETURNING count`. If `count > N` → **429**.  
- Cleanup: cron/job once per day: `DELETE FROM pilot_rate_limits WHERE window_start < now() - interval '1 day'`.  
- **Pros:** central and consistent across instances; no new dependency. **Cons:** one DB write per request (acceptable for pilot traffic).

**Variant B — External KV/Redis**  
- Upstash/Redis etc. Best technically; adds another service. Use when you already have or want a dedicated rate-limit store.

**Action:** Keep soft limit for now; implement PR#17 when you see spam or need stricter guarantees.

---

## Release gate (before production)

- [ ] **submit_pilot_request**: **ENVIRONMENT=production** set in prod; **ALLOWED_ORIGINS** and **RATE_LIMIT_SALT** set or function returns 500 (fail-closed).
- [ ] **submit_pilot_request**: CORS allowlist — entries exact (scheme + host + port, no trailing slash); Origin normalized the same way.
- [ ] **submit_pilot_request**: Rate limit tested (429); key = IP + User-Agent to reduce NAT false positives.
- [ ] **approve_and_invite**: Inviting in-progress (double-click within 2 min) → 409 IN_PROGRESS; no second invite sent.
- [ ] **approve_and_invite**: Inviting older-than-X retry or "Reset to invite_failed" + confirm dialog in UI.
- [ ] **approve_and_invite**: invite_failed stores **sanitized** error; **target_email_hash** uses normalized email (trim + lower + NFC).
- [ ] **Audit**: Metadata taxonomy consistent (from_status, to_status, pilot_request_id, target_email_hash, invite_error_code).
- [ ] **Non-admin**: admin RPC and route blocked (tested).
- [ ] **Redirect URL** whitelisted in Supabase Auth; real invite link tested.

---

## Final release gate tests (run before production)

Run these on preview/staging with prod-like env to confirm behaviour.

### A) PR#12 — submit_pilot_request

**Prod env misconfig (simulate on preview):**
- Unset **ALLOWED_ORIGINS** (with ENVIRONMENT=production) → expect **500** + body "Server misconfiguration", log `RELEASE GATE: ALLOWED_ORIGINS...`.
- Unset **RATE_LIMIT_SALT** (with ENVIRONMENT=production) → expect **500** + log `RELEASE GATE: RATE_LIMIT_SALT...`.

**CORS allowlist:**
- Request **without Origin** header (when allowlist set) → **403**.
- Request with **Origin** not in allowlist → **403** (including OPTIONS).
- Request with **Origin** in allowlist → **200** (or 201) with **Access-Control-Allow-Origin: &lt;that origin&gt;** and **Vary: Origin**.

**Honeypot:**
- POST with **\_hp="x"** → **422**, no row in `pilot_requests`.

**Rate limit:**
- Exceed N requests in window (same IP+UA) → **429** + **Retry-After** header.

### B) PR#16 — approve_and_invite

**IN_PROGRESS:**
- Click "Approve & Invite" twice quickly on same pending request → second request returns **409 IN_PROGRESS**; UI toast "Invite is being sent, try again in a moment."

**Stuck recovery:**
- Set `inviting_at` in DB to &gt; 10 min ago for a row with status=inviting; call approve again → row is reset to invite_failed and retry is allowed (or use "Reset to invite_failed" button).

**Simulate redirect fail:**
- Remove redirect URL from Supabase Auth → Redirect URLs; click Approve & Invite → status = **invite_failed**, **sanitized** error code (e.g. REDIRECT_NOT_ALLOWED).

**Retry:**
- Re-add redirect URL to allowlist; on same row click "Retry invite" → status = **invited**, **invited_at** set.

**Non-admin:**
- AdminRoute blocks `/admin/pilot-requests` (redirect/403). Calling **admin_list_pilot_requests** RPC as non-admin returns error (is_admin_trusted = false).

---

## Production env verification and ops drill

**Before production, confirm in the live environment:**

- [ ] **ENVIRONMENT=production** is set (Supabase Edge Function secrets / Netlify env).
- [ ] **ALLOWED_ORIGINS** is set (CSV of allowed origins, no trailing slash).
- [ ] **RATE_LIMIT_SALT** is set and has **≥ 16 characters**.

**Release gate tests:** Run the **Final release gate tests** (sections A and B above) on **deploy preview** and again on the **production domain** — especially CORS and redirect URL whitelist.

**Ops drill (redirect whitelist):**

1. Intentionally **remove** the invite redirect URL from Supabase Auth → Redirect URLs.
2. As admin, click **Approve & Invite** on a pending request → expect **invite_failed** and UI “Retry invite”.
3. **Re-add** the redirect URL to the allowlist.
4. Click **Retry invite** on that row → expect **invited**, **invited_at** set.
5. Optionally open invite email and complete sign-in to confirm end-to-end.

---

## Build and design

- All PRs: `npm run build` passes.
- UI uses existing design tokens (no new product features beyond scope).
- i18n: all new user-facing strings in en + cs where relevant.
