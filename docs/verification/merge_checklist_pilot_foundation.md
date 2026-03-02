# Merge checklist – Kitloop Pilot Foundation

Ověřte následující kroky před spojením větve `feature/onboarding-proof-assets-p2` do `main`.

## Pre-merge: CI a Review validations

- [ ] Ochrana GitHub větve: Ověřte, že `main` repozitáře má zapnuté pravidlo pod branch protection rules: "Require status checks to pass before merging" pro `drift_scan` a `migration_guard`. Jestliže není, nastavte jej IHNED (Fix Now).
- [ ] Workflow checks: V logu `.github/workflows/ci.yml` se ujistěte, že job `migration_guard` na Git má k dispozici origin/main log (`fetch-depth: 0` a explicitní `git fetch`). Aktuální workflow fetch provádí.
- [ ] Drift scan: Poslední commit je v CI zelený a `drift_scan` job není nastaven na `continue-on-error: true`. Očekáváme striktní fallback.
- [ ] Žádné zneužití bypassů: Proveďte `git grep "drift-scan:allow"` a `git grep "data-loss-approved"`. Žádné neoprávněné override pro ignoraci i18n registru neprohází.
- [ ] Historická integrita: Žádný override tag `data-loss-approved` v migracích se neodkazuje na chybějící ADR. Zkontrolujte `/docs/adr/`.

## Post-merge / Post-deploy

Ihned po slinkovaní větve a nasazení s `supabase db push` učiňte pár verifikací v produkční instanci Půjčoven:

- [ ] **Data-loss Guard v produkční CI**: Proveřte první produkční pipeline push z main basu, zda Guard nespadl na neexistujícím diffu (sanity check githooku).
- [ ] **RLS izolace (View)**: Jako standardní non-admin user se dotazte `SELECT * FROM public.vw_pilot_daily_metrics`. Nesmíte zahlédnout globalní data konkurenční půjčovny (izolace přes `security_invoker`).
- [ ] **Validita JSON payloadů**: Přes `psql`, API, nebo Studio aplikujte dotaz z `docs/verification/check_pilot_traction.sql`. Ověřte matematiku za dashboardem posledních sedmi dnů.
- [ ] **Funkční Audit logy**: Zkuste lokálně v appce poslat jednu reálnou rezervaci. Uvnitř `provider_audit_logs` musíte vidět odpovídající `INSERT` událost. Hodnota sloupce `actor_id` nesmí být `NULL`, pokud rezervaci zakládal přihlášený operátor.

## Rollback Plán

V případě bloku Pilotních obchodních procesů (Fix Later):

- Pro DB: Deaktivovat odpovídající Triggery: `DROP TRIGGER trg_audit_reservations ON reservations;`.
- Pro CI guardy: Okamžitý commit přesouvající zpět `continue-on-error: true` pro `drift_scan` v `.github/workflows/ci.yml`.
