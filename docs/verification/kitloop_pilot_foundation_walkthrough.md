# Kitloop Pilot Foundation - Implementation Walkthrough

Tento dokument slouží jako rekapitulace 5 "low-regret" funkčních vylepšení repozitáře před začátkem Kitloop Pilot fáze. Každý krok má definované ověřovací postupy napříč lokálním prostředím, CI a produkcí.

## 1. UI Drift Scan (CI hard fail)

- **Co to dělá**: Vynucuje textovou a designovou konzistenci. Zabraňuje vložení hardcoded textů (místo použití repozitáře microcopy.registry.ts) a zakázaných CSS/Tailwind utilit (`text-[...]`, `shadow-[...]`) do klíčových komponent.
- **Kde to je**:
  - `scripts/microcopy-drift-scan.ts`
  - `scripts/ui-drift-scan.sh`
  - Začleněno v `.github/workflows/ci.yml` s `continue-on-error: false` (zajišťuje hard fail buildu).
- **Lokální ověření**:
  - Vložte slovo `Vydat` přímo do JSX v `src/components/dashboard/OnboardingChecklist.tsx`.
  - Spusťte běh `npx tsx scripts/microcopy-drift-scan.ts`. Výstup musí končit kódem 1 (Chyba) a vypsat řádek s textem `❌ Violation in src/components/...`.
- **CI ověření**: Udělejte push nevalidních řetězců do Pull Requestu. Workflow `ci.yml` failne v jobu `drift_scan`.
- **Post-deploy ověření**: N/A (čistě build-time check).
- **Escape hatch (Bypass)**: Komentář nad daný řádek: `// drift-scan:allow Bypassing pro pilot - urgent hotfix.`

## 2. Data-loss Guard Linter (CI)

- **Co to dělá**: Blokuje provedení destruktivních operací v migracích, čímž chrání produkční databázi před neúmyslným smazáním schématu nebo dat.
- **Kde to je**:
  - `scripts/prevent-data-loss.sh` (Při porovnávání využívá `git diff origin/main` a hledá změny s + flagem v migracích).
  - `.github/workflows/ci.yml` v jobu `migration_guard` před spuštěním samotných testů. Pro správné fungování diffu využívá nastavení `fetch-depth: 0` a explicitní `git fetch origin main`.
- **Blokované sekvence**: `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM` (bez WHERE klauzule).
- **Lokální ověření**: Přidejte do nové migrace např. `DROP TABLE test_table;` a spusťte `bash scripts/prevent-data-loss.sh origin/main`. Očekávaný výsledek je `exit 1` a error log.
- **CI ověření**: Linter zastaví PR, které podobné příkazy obsahuje, pokud u nich není explicitní souhlas.
- **Post-deploy ověření**: N/A
- **Override tag**: Pro schválený zásah je nutné vložit na začátek SQL migrace explicitní referenční komentář na ADR: `-- data-loss-approved: ADR-0003`.

## 3. DB Audit Logy (Triggers)

- **Co to dělá**: Zajišťuje immutable sledování historie (Append-only log) klíčových entit v tabulkách `reservations` a `gear_items` pomocí PostgreSQL Triggerů, odolné vůči úpravám v aplikační vrstvě.
- **Kde to je**:
  - Migrace: `supabase/migrations/20260302122254_pr2_provider_audit_logs.sql` (obsahuje table, indexy, RLS, a trigger `fn_audit_trigger`).
  - Skript: `docs/verification/verify_audit_logs.sql`
- **Lokální ověření**: Zavolat `supabase db reset`, čímž se spustí seed i testování. (Pokud Docker není dostupný lokálně, test přes vzdálené staging prostředí).
- **CI ověření**: Proběhne spuštění db pgTAP testů při pull requestu.
- **Post-deploy ověření**:
  - Přes SQL editor spusťte `docs/verification/verify_audit_logs.sql`.
  - **Očekávaný výstup**: Dotaz vrátí tabulku akcí (INSERT, UPDATE) provedených na entitách. Každá operace musí mít `actor_id` vyplněno `uuid` stringem (nesmí se objevit `null` pro operace přihlášených uživatelů) a odpovídající `provider_id`. Sloupce `old_data` a `new_data` musí obsahovat korektní JSON objekt se stavem dané entity.

## 4. Lightweight ADR struktura

- **Co to dělá**: Poskytuje repozitář pro trvalá technická rozhodnutí ovlivňující business logiku, datový model a třetí strany. Slouží k prevenci ztráty kontextu.
- **Kde to je**: Adresář `docs/adr/`, kde leží `README.md`, `0000-template.md` a historické modely `0001` (UI Drift), `0002` (Audits) a `0003` (Data-loss Guard).
- **Post-deploy ověření**: Provést audit existence odpovídajících ADR ke všem merge pull requestům, jež obsahují override data-loss tag. Každý dokument musí vysvětlovat kontext a dopady.

## 5. Pilot Metric View v DB

- **Co to dělá**: Vytváří standardizovaný pre-kalkulovaný datový pohled pro dashboard foundera. Omezuje se pouze na metriky pro aktuálního poskytovatele za pomoci RLS izolace přes trigger-invoker model.
- **Kde to je**:
  - Migrace: `supabase/migrations/20260302122902_pr5_pilot_metrics_view.sql` (definuje view `vw_pilot_daily_metrics`).
  - Queries: `docs/verification/check_pilot_traction.sql`
- **Lokální ověření**: Nahlédnutí do view definice v migracích, ověření keywordu `security_invoker = true`.
- **CI ověření**: N/A
- **Post-deploy ověření**:
  - Přihlásit se jako standardní operátor/admin daného providera na Staging/Prod a spustit `SELECT * FROM vw_pilot_daily_metrics;`.
  - **Očekávaný výstup**: Ochrana RLS musí zajistit, že vrácené řádky obsahují VÝHRADNĚ `provider_id` tohoto přihlášeného uživatele a zamezí leaku metrik ostatních půjčoven. Kód `docs/verification/check_pilot_traction.sql` by měl vrátit souhrnnou statistiku po dnech pro ověření korektní agregace stavů.
