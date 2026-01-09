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
  - Issue (Active) - s Override.
  - Return (Completed) - s Damage reportem + foto.
- [ ] **Data Check**: Asset je po vrácení ve správném stavu (Maintenance nebo Available).
- [ ] **Evidence**: Vyplněný `docs/staging_smoke_run.md` s datem/časem + commit hash.

## 5. Rollback Plan

- Před špičkou export “today schedule” (CSV/tisk).
- Pokud pilot běží: periodický export rezervací (např. každé 2 hodiny).
- **Zpět na papír/Excel**: Pult Staff má připravené formuláře.
- **Data Export**: Poznamenat si ID rezervací vytvořených v systému.
- **Fix**: Nahlásit dev týmu.
- **Revert**: Pokud deploy rozbil FE, revert commit v Gitu a redeploy. Database migrace nerušit (DATA LOSS risk), raději fix dopředu.
