# Kitloop Pilot Foundation – Implementation Walkthrough

Na základě `kitloop_foundation_audit.md` a `implementation_plan.md` bylo do repozitáře implementováno 5 “low-regret” bodů nutných pro pilotní fázi. Změny jsou připravené k mergi (branch: `feature/onboarding-proof-assets-p2`).

## Přehled

1) Hard Fail na UI Drift Scan (CI)
2) Data-loss Guard Linter (CI)
3) DB Audit Logy (Triggers)
4) Lightweight ADR struktura
5) Pilot Metric View v DB

## Předpoklady

- Node/TS runtime pro lokální běh skriptů (např. `npx tsx ...`).
- Přístup k DB (Supabase) pro nasazení migrací a spuštění ověřovacích SQL.
- CI je GitHub Actions, workflow: `.github/workflows/ci.yml`.

## 1) Hard Fail na UI Drift Scan (CI)

### Co to dělá

Detekuje hardcoded user-facing texty v definovaném scope (Dashboard, Onboarding) a failne CI, pokud se objeví nepovolený text. Na rozdíl od návrhu, tento skript *nehlídá* zakázané design utility (jako `text-*`), soustředí se čistě na `microcopy`. Pro utility se používá paralelní bash script.

### Kde to je

- Skript: `scripts/microcopy-drift-scan.ts` (kontroluje texty) a `scripts/ui-drift-scan.sh` (kontroluje css classes).
- CI workflow: `.github/workflows/ci.yml` (hard fail via `continue-on-error: false`)

### Lokální ověření (pass/fail)

1. Do `src/components/dashboard/OnboardingChecklist.tsx` vlož schválně hardcoded text (např. `Vydat`) do JSX.
2. Spusť: `npx tsx scripts/microcopy-drift-scan.ts`
3. Očekávané chování: skript vypíše `❌ Violation in src/components/...` a skončí s exit code 1.

### Bypass (jen výjimečně)

Nad konkrétní chybující řádek přidej komentář: `// drift-scan:allow`

### Ověření v CI

- CI spadne při detekci hardcoded textu během jobu `drift_scan`.

## 2) Data-loss Guard Linter (CI)

### Co to dělá

Chrání migrace proti destruktivním operacím bez explicitního schválení. Kontroluje nově přidané řádky v `.sql` souborech vůči větvi origin/main.

### Kde to je

- Skript: `scripts/prevent-data-loss.sh`
- CI workflow: `.github/workflows/ci.yml` v jobu `migration_guard`. Step používá `fetch-depth: 0` a explicitní `git fetch` base větve.

### Blokované direktivy (bez override tagu)

- `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, plošný `DELETE FROM` (bez WHERE)

### Lokální ověření

1. Přidej novou migraci např. s obsahem `DROP TABLE providers;`
2. Spusť `bash scripts/prevent-data-loss.sh origin/main`
3. Očekávané chování: Skript napíše `❌ FATAL: Operations that drop tables/columns...` a vrátí exit code 1.

### Override

Bypass lze aktivovat obsažením komentáře v migraci, který se fixuje na ADR: `-- data-loss-approved: ADR-0003`

## 3) DB Audit Logy (Triggers)

### Kde to je

- Migrace: `supabase/migrations/20260302122254_pr2_provider_audit_logs.sql`
- Verify SQL: `docs/verification/verify_audit_logs.sql`
- Tabulka: `provider_audit_logs` (ukládá `provider_id`, `actor_id`, `old_data`, `new_data`)
- Trigger: `fn_audit_trigger` pověšený na `reservations` a `gear_items` pro `INSERT`, `UPDATE`, `DELETE`.

### Ověření

1. Aplikuj migrace do DB: `supabase db push`
2. Spusť ověřovací skript: `psql -f docs/verification/verify_audit_logs.sql` (nebo spustit v Supabase SQL editoru).
3. Očekávané chování: Query vrátí 4 záznamy akcí simulující chování, kde `actor_id` dává smysl (nesmí mít null při volání authenticated userem) a json payload ukazuje diff.

## 4) Lightweight ADR struktura

- Dokumenty slouží k udržení kontextu závažných architektonických rozhodnutí, obzvláště těch obcházející data-loss guard.
- Kde to je: `docs/adr/README.md`, `docs/adr/0000-template.md`, `docs/adr/0001-ui-drift-prevention.md`, `docs/adr/0002-append-only-audit-log.md`, `docs/adr/0003-data-loss-guard.md`.

## 5) Pilot Metric View v DB

### Kde to je

- Migrace: `supabase/migrations/20260302122902_pr5_pilot_metrics_view.sql` (vytváří globální view `vw_pilot_daily_metrics`).
- Verify SQL: `docs/verification/check_pilot_traction.sql`

### Kritické

View zohledňuje `security_invoker = true`, díky čemuž filtruje výsledek automaticky na základě provider_id volajícího.

### Ověření

Spusť `docs/verification/check_pilot_traction.sql` na produkci/staging; view musí vracet správně agregované statistiky daného sessionu (např. počet vydaných rezervací / den). Zkus z obou stran izolace (Superadmin vs. Běžný Provider).
