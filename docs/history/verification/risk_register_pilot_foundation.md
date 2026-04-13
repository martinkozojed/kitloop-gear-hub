# Risk register – Kitloop Pilot Foundation

Škála:

- **Impact**: Low / Medium / High / Critical
- **Likelihood**: Low / Medium / High

Všechna rizika identifikovaná během implementace pěti základních vrstev pro ochranu Pilotního sběru testovacích dat.

| Riziko | Impact | Likelihood | Detekce | Mitigace / Ochrana | Fix typ |
|---|---|---|---|---|---|
| `origin/main` diff v CI chybí (data-loss guard nefunguje) | Critical | Low | Skript zhavaruje s `Failed to fetch` chybou od Gitu. | Repozitář `.github/workflows/ci.yml` je explicitně nakonfigurován s `fetch-depth: 0` a provádí explicitní `git fetch`. | Fix Now (Zkontrolovat log v prvním PR) |
| `actor_id` je `NULL` v Audit logu | High | Medium | Záznamy v `provider_audit_logs` postrádají identifikaci uživatele u standardních akcí. | Funkce využívá PostgreSQL `auth.uid()`, což pokryje JWT toky, ale může padat na webhook triggerech. | Fix Now (Ověřit v produkci manuální test) |
| RLS Leak přes `vw_pilot_daily_metrics` | Critical | Low | Admin/Zástupce providera vidí neobvykle velká čísla (globální agregaci součtů cizích půjčoven). | Implementováno Postgres `security_invoker = true` pravidlo ve view, které dědí stávající RLS. | Fix Now (Nutný ověřovací SQL test z non-superadmin klienta) |
| Vynucení Branch Protection `main` chybí | Critical | Medium | CI spadne, přesto merge projde natvrdo. Guard je obelstěn. | Upravit nastavení repozitáře přes Settings GUI -> Requirements. | Fix Now |
| Drift scan false positives | Medium | High | Linter spadne v CI ačkoli kód neobsahuje microcopy chybu. | Nasazena regex heuristika omezující dopad (přeskakuje logiku jako `if`, `return`). Zbytek odblokován přes explicitní Marker `// drift-scan:allow`. | Fix Later (Doladit regex / přepnout na full AST parser) |
| Bypass marker rot ("slepoty schvalování") | Medium | High | Nadměrné používání markrů pro obcházení kvality přes grep counts `drift-scan:allow`. | Doplnit povinný odůvodňovací komentář pro existenci Bypassu na onom místě a nastavit codeowner PR audit proces. | Fix Later (Zapracovat do Playbooku udržování repozitáře) |
| Zneužití override klauzule data-loss linteru | High | Medium | Merge linterem prošel s `-- data-loss-approved` ale žádný ADR dokument to nekryl a data se vlivem DROP zlikvidovala. | Povinnost odkazovat v tagu na specifický ADR, jehož textový dokument je přítomen v PR jako garance dohledu od Lead inženýra. | Fix Now (Svěřeno do režimu Branch protekcí a schvalování) |
| Extrémní objemový růst Audit Log DB velíkosti | Medium | High | Varování v Supabase Database Size Dashboard. | Žádná okamžitá mitigace. Vývoj pro Pilot neselhává, řešíme pro long-term retenční periodu (např. batch deleting). | Fix Later |
