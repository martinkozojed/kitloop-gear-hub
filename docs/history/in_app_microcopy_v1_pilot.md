# SSOT: Kitloop In-App Communication & Microcopy v1.0 (PILOT)

> **Scope**: In-app only. Pilot phase. No marketing, no emails, no push, no product news modals.
> **Version**: 1.0-pilot | See `src/content/microcopy.registry.ts` for the typed contract.

**Fixes (post-review):** ISO week boundary a year rollover v `isoWeekKey()` (W08→W09, W00→W01) + parity test suite pro i18n (`src/lib/i18n-parity.test.ts`, 39 testů).

---

## Vocabulary (Use Consistently)

| Concept | Term (CS) | Term (EN) |
|---|---|---|
| Storage of equipment | **Inventář** | **Inventory** |
| A booking | **Rezervace** | **Reservation** |
| Handing over equipment | **Výdej** | **Check-Out / Issue** |
| Receiving equipment back | **Vratka** | **Return** |
| Double-booking conflict | **Kolize** | **Collision** |
| Dashboard / main view | **Přehled** | **Overview** |

---

## Route Mapping (SSOT CTA → Real App Routes)

| SSOT Reference | Route in App | Notes |
|---|---|---|
| Inventory (add item) | `/provider/inventory` | Opens AssetForm modal |
| Inventory (import) | `/provider/inventory?import=true` | Opens CSV import modal |
| Reservation (new) | `/provider/reservations/new` | New reservation form |
| Issue flow | `/provider/dashboard` | Triggered via AgendaRow |
| Return flow | `/provider/dashboard` | Triggered via AgendaRow |
| Export (reservations) | `/provider/reservations` | Download button |
| Export (inventory) | `/provider/inventory` | Download button |
| Dashboard/Overview | `/provider/dashboard` | |
| Settings | `/provider/settings` | |

---

## Engine Rules (Caps & Suppression)

| Rule | Value |
|---|---|
| Max onboarding messages / day | 1 |
| Max tips / week / user | 2 |
| Cooldown (same tip) | 24 hours |
| Dismiss threshold | ≥ 3 → permanent suppress |
| TTL from firstSeenAt | 7 days |
| Suppress when | User focus in input/textarea/select (`isTyping=true`) |

Storage: `localStorage` key `tipEngine:${userId}:${tipId}`

---

## Feature Flags (Tip-Level)

| Flag | Default | Tip | Reason OFF |
|---|---|---|---|
| `tip_scanner` | **OFF** | "Try scanner" | Scanner usage not tracked |
| `tip_collision` | **OFF** | "Collision resolution" | No collision fail count signal |
| `tip_feedback` | **OFF** | "Share feedback" | No feedback UI in app |
| `tip_condition` | **OFF** | "Return condition state" | condition_state not tracked |

Stable tips (default **ON**): `tip_inventory_empty`, `tip_no_reservation_24h`, `tip_unassigned_assets`, `tip_export_after_48h`.

---

## Onboarding Checklist Steps (6)

| # | ID | completeWhen | Signal Source |
|---|---|---|---|
| 1 | workspace | `workspace_completed` | `onboarding_progress.step_workspace_completed_at` |
| 2 | location | `location_completed` | `onboarding_progress.step_location_completed_at` |
| 3 | inventory | `inventory_min_items` | `hasInventory` prop (kpiData.activeRentals > 0) OR `step_inventory_completed_at` |
| 4 | reservation | `reservation_created` | `hasReservation` prop (agendaItems.length > 0) OR `first_reservation_at` |
| 5 | issue | `issue_completed` | `hasIssued` prop from parent (currently defaults to false) |
| 6 | overview | `dashboard_viewed` | Always true once checklist renders |

---

## Deviations from SSOT

| SSOT Expectation | Actual | Reason |
|---|---|---|
| `/provider/settings#team` deep link | `/provider/settings` (no anchor) | Settings page has tabs but no `#team` anchor route |
| `ops_digest_seen` as signal for step 6 | `dashboard_viewed` (always true) | `ops_digest_seen` event does not exist in codebase |
| `scanner_used==0` tip trigger | Feature flag OFF | Scanner usage event not tracked in tip engine |
| `collision_resolved` tip trigger | Feature flag OFF | No collision fail count store available |
| `firstSeenAt` from `activatedAt` | Uses `localStorage.firstSeenAt` | No `activatedAt` field exposed to frontend |
| Step 6 `completeWhen: dashboard_viewed` | Always `true` | By design: viewing checklist = completing overview step |

---

## Files Changed / Created

### New Files

| File | Purpose |
|---|---|
| `src/content/microcopy.registry.ts` | Typed SSOT – all copy references live here |
| `src/content/microcopy.registry.test.ts` | Registry smoke tests |
| `src/content/app-events.registry.ts` | Internal event name constants |
| `src/lib/tip-engine.ts` | Throttle/suppression engine |
| `src/lib/tip-engine.test.ts` | Unit tests for tip engine |
| `src/components/ui/context-tip.tsx` | ContextTip UI component |
| `docs/ssot/in_app_microcopy_v1_pilot.md` | This document |

### Modified Files

| File | Change |
|---|---|
| `src/components/dashboard/OnboardingChecklist.tsx` | Next Best Action section + hasIssued/hasReturned/hasExported props |
| `src/components/operations/IssueFlow.tsx` | Hardcoded auto-assign toast → i18n |
| `src/pages/provider/DashboardOverview.tsx` | Issue/Return success toasts → i18n (ssot keys) |
| `src/lib/telemetry.ts` | Added `tip.dismissed`, `tip.clicked` to TelemetryEventName |
| `src/locales/cs.json` | Added `ssot.*` block + `operations.issueFlow.scan.autoAssigned` |
| `src/locales/en.json` | Added `ssot.*` block + `operations.issueFlow.scan.autoAssigned` |

---

## Verification Commands

```bash
# Unit tests (registry smoke + tip engine)
npm run test

# TypeScript build (0 errors required)
npm run build
```

### Manual Smoke Test

1. `/provider/dashboard` → Onboarding checklist shows "Next recommended step" banner above steps
2. `/provider/inventory` (no assets) → Empty state visible
3. DevTools → Application → Local Storage → delete `tipEngine:*` keys → navigate to inventory → wait 2s → `tip_inventory_empty` appears (if not dismissed)
4. Issue a reservation → toast shows "Výdej byl dokončen" / "Check-out complete"
5. Return a reservation → toast shows "Vratka byla zpracována" / "Return processed"
