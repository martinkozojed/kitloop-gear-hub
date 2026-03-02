# Merge Checklist: Pilot Foundation (`feature/onboarding-proof-assets-p2`)

Před povolením merge této větve ověřte bezchybnost zavedených pravidel.

## Pre-merge: CI a Review kontroly

- [ ] **Data-loss Guard v CI (Produkční build)**: Sledování workflow pipeline `migration_guard`. Ověřte, že krok provádí `fetch origin main --depth=1` a správně nesejde na chybě gitu.
- [ ] **UI Drift v CI**: Job `drift_scan` musí běžet s `continue-on-error: false` pro plné zastavení mergu v případě výskytu drift kódu.
- [ ] **Bypass Review**: Propátrejte Diff repozitáře a ověřte, že neexistují `// drift-scan:allow` tam, kde jde pouze o lenost přidat proměnnou do `microcopy.registry.ts`.
- [ ] **Přítomnost ADR linků**: Migrační bypass `-- data-loss-approved: ADR-XXXX` vyžaduje reálný mergenutelný markdown v `docs/adr/`.
- [ ] **Branch Protection Policy**: (Základní předpoklad) Na větvi `main` v GitHubu musí být zapnuto pravidlo bloku přes CI Checks. Pokud není zapnuto, nastavte jej ještě před mergem, jinak tyto build statusy ztrácí vynutitelnost.

## Post-merge / Post-deploy ověření na Staging/Prod

Tyto kroky vykonejte ihned po nasazení a aplikování migrací na živé prostředí:

- [ ] **Prověření izolace poskytovatelů přes View (RLS leak)**
  - Zkuste exekuovat `SELECT * FROM public.vw_pilot_daily_metrics` pod běžným autentizovaným uživatelem.
  - **Pass Condition**: Vidíte pouze metriky vlastní firmy.
  - **Fail Condition**: Pokud vidíte cizí business data (leak).
- [ ] **SQL Verification na Pilot Metrics (Admin)**
  - Spusťte celý report: `docs/verification/check_pilot_traction.sql` pod PostgreSQL nebo Supabase adminem a ověřte agregaci sedmidenních čísel aktivních rezervací.
- [ ] **Trigger loggování s `actor_id` a payloady**
  - Vygenerujte přes UI nebo API jednu novou rezervaci a následně ji upravte (dejte např. schválit).
  - V databázi spusťte: `SELECT * FROM public.provider_audit_logs ORDER BY created_at DESC LIMIT 5;`
  - **Pass Condition**: Jsou zalogovány operace `INSERT` a `UPDATE` se solidními objekty `new_data` a `old_data`. Důležité je, že ve sloupci `actor_id` existuje reálné UUID osoby, která interakci vyvolala.
  - **Fail Condition**: `actor_id` je po akci oprávněného uživatele prázdný (`NULL`), nebo log nezaznamenal diff změn.
