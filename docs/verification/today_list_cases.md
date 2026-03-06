# Today List — Correctness Test Cases

## Context

The "Today List" triage on the Dashboard uses 3 **separate, server-side** queries:

| Query | Filter | Status |
|-------|--------|--------|
| **Pickups Today** | `start_date ∈ [today, tomorrow)` | `pending`, `confirmed`, `hold` |
| **Returns Today** | `end_date ∈ [today, tomorrow)` | `active` |
| **Overdue** | `end_date < today` | `active` |

Date format: `YYYY-MM-DD` (Postgres DATE columns). No `.toISOString()`.

---

## Seed Scenario (today = 2026-03-06)

| # | Reservation | start_date | end_date   | status    | Expected List |
|---|-------------|------------|------------|-----------|---------------|
| 1 | R-pickup-confirmed | 2026-03-06 | 2026-03-08 | confirmed | ✅ Pickups Today |
| 2 | R-pickup-pending   | 2026-03-06 | 2026-03-09 | pending   | ✅ Pickups Today |
| 3 | R-pickup-hold      | 2026-03-06 | 2026-03-10 | hold      | ✅ Pickups Today |
| 4 | R-pickup-tomorrow  | 2026-03-07 | 2026-03-10 | confirmed | ❌ Not today |
| 5 | R-return-today     | 2026-03-03 | 2026-03-06 | active    | ✅ Returns Today |
| 6 | R-return-completed | 2026-03-03 | 2026-03-06 | completed | ❌ Not active |
| 7 | R-overdue          | 2026-03-01 | 2026-03-04 | active    | ✅ Overdue |
| 8 | R-overdue-returned | 2026-03-01 | 2026-03-04 | completed | ❌ Already returned |

## Expected Results

- **Pickups Today**: R1, R2, R3 (3 items)
- **Returns Today**: R5 (1 item)
- **Overdue**: R7 (1 item)
- **Not shown**: R4 (tomorrow), R6 (completed), R8 (completed)

## Edge Cases

| Case | Scenario | Expected |
|------|----------|----------|
| Same-day round-trip | start=today, end=today, confirmed → issued during day | Shows in Pickups; after issue (status=active) shows in Returns |
| Midnight boundary | Operator checks at 23:59 CET → `format(now, 'yyyy-MM-dd')` = today's date | Correct: uses local clock |
| UTC+1 vs UTC | DB stores DATE (no timezone) | Correct: YYYY-MM-DD comparison has no shift |

## Indexes Used

| Query | Index |
|-------|-------|
| Pickups Today | `idx_reservations_provider_start_status (provider_id, start_date, status)` |
| Returns Today | `idx_reservations_provider_end_status (provider_id, end_date, status)` |
| Overdue | `idx_reservations_provider_end_status (provider_id, end_date, status)` |
| KPI returns | `idx_reservations_provider_end_status (provider_id, end_date, status)` |
