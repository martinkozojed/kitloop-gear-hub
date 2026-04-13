# Pilot Smoke Checklist v2

## Prerekvizity

- `npx supabase start` running
- `npx supabase db reset` PASS (exit 0)
- `npm run dev` running
- Přihlášen jako provider s approved statusem

## Scénáře

| # | Scénář | Kroky | Acceptance | PASS/FAIL |
|---|--------|-------|------------|-----------|
| 1 | Dashboard load | Otevři `/provider/dashboard` | Agenda + KPI renderují, 0 console errors | |
| 2 | Create reservation | Dashboard → New → vyplň → Save | Řádek v DB s `status='confirmed'` | |
| 3 | Issue flow | Klikni Issue na dnešní pickup | Status → `active`, řádek v `audit_logs`, `issue_completed` event v `app_events` | |
| 4 | Issue override | Zkus issue bez podmínek → override s důvodem | Hard gate FAIL → override → `audit_logs.metadata` má `override_reason` | |
| 5 | Return flow | Klikni Return na aktivní | Status → `completed`, `health_state` uložen, `return_completed` event | |
| 6 | Today List | Seed: 1 pickup + 1 return + 1 overdue | Pickups = 1, Returns = 1, Overdue = 1 (správné čísla) | |
| 7 | Print | Otevři handover protokol | Renderuje bez prázdných polí (jméno, datum, položky) | |
| 8 | CSV export | Export inventory/reservations | Soubor stažen, otevíratelný v Excel | |

## Výsledek

- **Všech 8 PASS** → GO pro pilot.
- **Jakýkoli FAIL** → zapsat do `docs/PAIN_BACKLOG.md`, vyhodnotit severity.
