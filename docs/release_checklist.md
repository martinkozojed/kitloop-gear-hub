# Environment Guidelines

- **Vite Priority**: `.env.local` overrides `.env`.
- **Restart Required**: After changing `.env` files, always restart `npm run dev`.
- **API Keys**: Frontend must use `ANON` or `PUBLIC` keys. NEVER use `SERVICE_ROLE_KEY`.
- **Production Smoke**: Verify requests go to `https://<project>.supabase.co`, NOT `127.0.0.1`.

## Pre-Release Checkslist (Pilot Ready)

## 1. Database & Backend

- [ ] **Reset**: `supabase db reset` proběhl čistě lokálně (ideálně 2× po sobě).
- [ ] **Run Read-Only Smoke Tests**: `supabase test db` = PASS (včetně 07a, overbooking, return security).
- [ ] **Run Write Smoke Tests**: `./scripts/test_write.sh` = PASS a log uložen do `docs/staging_smoke_run.md`
  - unpaid issue → fail (P0003)
  - override issue → success + audit exists
  - return damaged → return_report exists + asset=maintenance
  - overbooking cap=2 → 3. confirmed fail
  - tenant A nemůže issue/return tenant B
- [ ] **Manual Verification**: Follow `docs/staging_smoke_run.md` for UI flows (CSV Import, Issue/Return).
- [ ] **Migrations**: Žádné konflikty v `supabase/migrations`. Praktická idempotence: `supabase db reset` 2× bez chyb.
- [ ] **RLS**: Policies aktivní a ověřené pro assets, reservations, return_reports.
- [ ] **Storage**: Bucket `damage-photos` existuje a je private.
- [ ] **Cross-tenant check (2 providery)**: user A nevidí data B, upload do prefixu B selže.

## 2. Frontend & Build

- [ ] **Lint**: Žádné kritické ESLint chyby.
- [ ] **Type Check**: `tsc --noEmit` bez chyb.
- [ ] **Build**: `npm run build` projde.
- [ ] **Env**: `.env` obsahuje správné URL a ANON key (NE service key).
- [ ] **Secret scan**: žádný service_role/service key v client kódu ani buildu.

## 3. Deployment (Staging/Prod)

- [ ] **Migrate**: `supabase db push` na remote projekt.
- [ ] **Seed**: Pokud je potřeba číselníky, ověřit jejich přítomnost.
- [ ] **Storage**: Ověřit existenci bucketu v dashboardu.

## 4. Smoke Test (Manual)

- [ ] **Login**: Admin se přihlásí.
- [ ] **Inventory**: Import 1 produktu, 2 variant, 5 kusů.
- [ ] **Reservation Flow**:
  - Create (Pending/Confirmed).
  - Create (Pending/Confirmed).
  - Issue (Active) - s Override.
  - **Verify UI**: "Issue" / "Return" buttons available in Reservation Detail Sheet.
  - Return (Completed) - s Damage reportem:
    - [ ] Upload photo triggers specific damage logic.
    - [ ] Asset marked as "maintenance".
    - [ ] Return report created with photo path.
    - [ ] **Data Integrity**: Verify no orphaned photos if upload fails.
    - [ ] **Idempotence**: Try clicking "Return" again -> shows "Already Returned".
- [ ] **Data Check**: Asset je po vrácení ve správném stavu (Maintenance nebo Available).
- [ ] **Evidence**: Vyplněný `docs/staging_smoke_run.md` s datem/časem + commit hash.

## 5. Rollback Plan

- Před špičkou export “today schedule” (CSV/tisk).
- Pokud pilot běží: periodický export rezervací (např. každé 2 hodiny).
- **Zpět na papír/Excel**: Pult Staff má připravené formuláře.
- **Data Export**: Poznamenat si ID rezervací vytvořených v systému.
- **Fix**: Nahlásit dev týmu.
- **Revert**: Pokud deploy rozbil FE, revert commit v Gitu a redeploy. Database migrace nerušit (DATA LOSS risk), raději fix dopředu.

---

## 6. Ready to Onboard Partner

Run this before sending the invite link to a rental partner.

- [ ] `npx tsc --noEmit` passes with zero errors.
- [ ] `npm run lint` passes with zero critical errors.
- [ ] `npm run build` succeeds and `dist/` is produced.
- [ ] Netlify deploy is live at the production URL (app loads, no blank screen).
- [ ] `VITE_SUPABASE_URL` in Netlify env points to the production Supabase project (not `127.0.0.1`).
- [ ] `VITE_SUPABASE_ANON_KEY` is set; `SERVICE_ROLE_KEY` is NOT present in Netlify env or the built JS bundle.
- [ ] Supabase Auth redirect URLs include the production origin (required for email confirmation and password reset).
- [ ] Edge Functions deployed: `admin_action`, `reserve_gear`, `cleanup_reservation_holds`.
- [ ] Admin user exists in `profiles` with `role = 'admin'` (required to approve providers via `admin_approve_provider` RPC — see `supabase/migrations/20260110120001_admin_action_hardening_fixed.sql` line 187).
- [ ] `damage-photos` storage bucket exists and is private.
- [ ] RLS policies are active: verify `assets`, `reservations`, `return_reports`, `providers` all have RLS enabled.
- [ ] A test provider account can sign up, complete `/provider/setup`, and appear in **Admin → Provider Approvals**.
- [ ] Admin can approve the test provider; provider lands on `/provider/dashboard` (not the pending screen).
- [ ] Test provider can add a product + variant + asset, create a reservation, issue, and return it end-to-end.
- [ ] Support email `support@kitloop.cz` is monitored and ready to receive partner questions.
