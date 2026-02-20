# Pilot Smoke Checklist
**Version:** 1.0 — 2026-02-20  
**Run before:** every rental demo / pilot onboarding session  
**Scope:** SSOT MUSTs ([`docs/ssot/MVP_SCOPE.md`](../ssot/MVP_SCOPE.md)) + PR111 approval gate

---

## Go / No-Go

| Signal | Criteria |
|--------|----------|
| **GO** | Section A passes **AND** Section D passes **AND** Section G passes **AND** at least one export in Section H passes |
| **NO-GO** | Approval gating broken (A3 fails) **OR** issue hard gate broken (D2 fails) **OR** print view broken (G1 fails) |

> If NO-GO: do not proceed with demo. File a bug, reference this checklist.

---

## A — Access & Approval (pending → approved)

- [ ] **A1** Sign up with a fresh email → land on **"Pending approval"** screen; no operational features accessible.
- [ ] **A2** Reload the page → still shows "Pending approval" (session persists, route is protected).
- [ ] **A3** Approve the provider via Kitloop admin (out-of-band / Supabase dashboard) → provider can now access the app without re-logging in (or after one reload).
- [ ] **A4** Log out → redirected to login. Log back in → lands on dashboard (not pending screen).
- [ ] **A5** Attempt to access a protected route while logged out → redirected to login.

---

## B — Inventory Basics (create / edit / find asset)

- [ ] **B1** Create a new product with at least one variant and one asset; save succeeds without errors.
- [ ] **B2** Edit the product name → change is reflected immediately in the inventory list.
- [ ] **B3** Search / filter the inventory list by the asset name → asset appears in results.
- [ ] **B4** Asset count on the variant matches the number of individual assets created.

---

## C — Internal Reservation (create, collision signal)

- [ ] **C1** Create a reservation (`confirmed`) for the asset created in B1 for dates T+1 → T+3; save succeeds.
- [ ] **C2** Create a second reservation (`hold`) for the **same asset** overlapping the same dates → creation is **allowed** but a collision warning is shown.
- [ ] **C3** Reservation status shows correctly in the reservations list (`confirmed` / `hold`).
- [ ] **C4** Edit the confirmed reservation (e.g. change end date) → update saves without errors.
- [ ] **C5** Cancel the `hold` reservation → status changes to `cancelled`; asset is no longer flagged as conflicting.

---

## D — Issue Hard Gate

- [ ] **D1** Attempt to issue a reservation that has **no available assets** (e.g. all assets already `active`) → issue action is **blocked** (hard gate, no override prompt).
- [ ] **D2** Confirm the hard gate message is visible and descriptive (user knows why it's blocked).
- [ ] **D3** Make an asset available (cancel or return the conflicting reservation) → issue action is now enabled.
- [ ] **D4** Issue the reservation → status changes to `active`; asset is marked as out.

---

## E — Return (return → state updates)

- [ ] **E1** Return the issued reservation from D4 → status changes to `completed`.
- [ ] **E2** Asset status reflects the return (no longer shown as out / unavailable).
- [ ] **E3** Returned reservation appears in the dashboard "Today's returns" or history; it does **not** appear in active pickups.

---

## F — Ops Dashboard (pickups / returns / overdue visible)

- [ ] **F1** Dashboard shows today's pickups and today's returns sections; counts match the reservations created above.
- [ ] **F2** Any overdue reservation (end date in the past, status `active`) appears in the overdue section.

---

## G — Print Handover

- [ ] **G1** Open the print handover view for an `active` reservation → print preview renders without blank page or JS error; key fields (asset name, dates, renter info) are visible.

---

## H — CSV Exports

- [ ] **H1** Export inventory as CSV → file downloads; open in Excel/Numbers — columns and rows are present, no encoding errors.
- [ ] **H2** Export reservations as CSV → file downloads; rows include the reservations created in this session.

---

## I — If Something Fails

- [ ] **I1** Check the browser console and the Supabase `app_events` table for silent errors. Any unexpected `error` or `warning` event should be filed as a bug before the demo proceeds.

---

*Checklist complete. Record pass/fail per section and attach to the demo prep ticket.*
