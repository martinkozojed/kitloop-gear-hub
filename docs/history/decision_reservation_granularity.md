# Decision #60: Reservation Granularity (DATE vs TIMESTAMPTZ)

**Status**: Decided (Keep DATE Semantics)
**Date**: 2026-01-20
**Driver**: P2 Epic Planning

## Context

Current reservation system uses `TIMESTAMPTZ` columns (`start_date`, `end_date`) but enforces **Day-based (DATE)** granularity logically. E2E tests currently enforce 24h duration.
Business requirement is primarily outdoor gear rental (ski, bike), which is typically daily. However, future segments (e-bike, SUP) may require hourly.

## Options Considered

### Option A: Keep DATE Semantics (Recommended)

Use `TIMESTAMPTZ` columns but strictly enforce midnight-aligned intervals (or treat them as dates). Add `pickup_time` / `return_time` as descriptive metadata only.

- **Pros**:
  - **Simplicity**: Availability logic is simpler (days don't overlap partially).
  - **Stability**: Existing code/tests assume day-based chunks.
  - **UX**: Simpler date range pickers.
- **Cons**:
  - Cannot handle "2-hour rental" availability enforcement.
  - Granularity is locked to 1 day minimum.

### Option B: Move to Hourly (TIMESTAMPTZ Semantics)

Fully utilize `TIMESTAMPTZ` for availability.

- **Pros**:
  - Flexible rental periods (hours, minutes).
  - Better inventory utilization for short-term rentals.
- **Cons**:
  - **Complexity**: Availability check must handle partial overlaps, business hours/opening times.
  - **Migration**: UI must change to Date+Time pickers.
  - **Risk**: High surface for bugs in overlaps/timezone handling.

## Recommendation

**Select Option A: Keep DATE Semantics for MVP/P2.**

**Rationale**:

1. **Complexity vs Value**: Hourly availability is a major featureset ("Booking Engine") that distracts from the current goal of System Automation & Observability (P2).
2. **Schema Compatibility**: We already use `TIMESTAMPTZ` types, so "upgrading" to hourly later doesn't strictly require a column type migration, just a logic migration.
3. **Stability**: Our current E2E and logic are stabilized around daily rentals. Breaking this for hourly capabilities introduces significant regression risk.

## Impact Analysis

- **DB Schema**: No change needed immediately. We can add `pickup_time`/`return_time` (TEXT or TIME) columns for user information without affecting availability logic.
- **RPCs**: `check_variant_availability` remains day-based.
- **Holds TTL**: `expires_at` is independent (15 min from creation), works for both.
- **UI**: Remains Date Range Picker.

## Implementation Plan (Staged)

1. **Phase 1 (Immediate)**: Explicitly document "Daily Only" constraint. Update `reservations` table to include `pickup_time` / `return_time` (optional) for logistics.
2. **Phase 2 (Future)**: "Hourly Rentals" Epic.
    - Requires new Availability RPC.
    - Requires new UI Time Picker.

## Definition of Done

- Decision logged in Issue #60.
- Architecture assumes Daily Availability.
- "Hourly Rentals" deferred to P3+.
