# Pilot Runbook v2 — Kitloop F1

## Nasazení (lokální)

```bash
git checkout pilot-integration
npx supabase start          # Postgres + Auth + Edge Functions
npx supabase db reset       # Čistý stav + migrace + seed
npm run dev                 # Frontend na localhost:5173
```

## Denní checklist (před směnou)

1. Dashboard load → agenda + KPI renderuje
2. Zkontrolovat overdue (červené položky nahoře)
3. Ověřit pickupy dne (správný seznam)
4. Test issue 1 rezervace (dry run)
5. Zkontrolovat `app_events` na errory: `SELECT * FROM app_events WHERE event_name LIKE '%error%' ORDER BY created_at DESC LIMIT 5;`

## Kontakty + eskalace

| Role | Kontakt | Kdy |
|------|---------|-----|
| Dev support | Slack #kitloop-pilot | UX bug, slow response |
| Blocker | Telefon (TBD) | Data loss, nelze issue/return |

## Rollback

```bash
npx supabase db reset       # Obnoví DB do čistého stavu
npm run dev                 # Restart frontend
```

Pokud je problém v migraci: `git revert <commit>` + `npx supabase db reset`.

## Pain reporting

Každý pain → `docs/PAIN_BACKLOG.md` (viz šablona). Po směně zapsat:

- Co se stalo (1 věta)
- Jak často (1× / opakovaně / vždy)
- Jak moc to bolelo (blocker / high / medium / low)

---

## GO/NO-GO checklist (10 bodů)

| # | Check | Příkaz | PASS |
|---|-------|--------|------|
| 1 | DB reset | `npx supabase db reset` | exit 0 |
| 2 | Typecheck | `npm run typecheck` | exit 0 |
| 3 | Build | `npm run build` | exit 0 |
| 4 | `.or()` v dashboard | `git grep -n "\.or(" src/hooks/useDashboardData.ts` | empty (komentáře OK) |
| 5 | Scanner mimo main | `git grep -n "useBarcodeScanner\|VITE_ENABLE_SCAN_FIRST" src/` | empty |
| 6 | SECURITY DEFINER | P0 SQL audit query | 0 app řádků |
| 7 | Manuální smoke | 8 scénářů (pilot_smoke_v2.md) | všech 8 PASS |
| 8 | Telemetry | `SELECT count(*) FROM app_events WHERE provider_id = '<id>';` | count > 0 (fallback: ruční stopky) |
| 9 | Pain backlog | `test -f docs/PAIN_BACKLOG.md && echo PASS` | PASS |
| 10 | Runbook | `test -f docs/pilot_runbook_v2.md && echo PASS` | PASS |
