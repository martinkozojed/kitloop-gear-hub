# Production Smoke Test Guide (Pilot Release)

**Date**: ______________
**Tester**: ______________
**Environment**: Production (Live)
**Status**: [ ] PASS / [ ] FAIL

## 1. Pre-Run Checks

- [ ] **URL**: Navigate to the production URL.
- [ ] **Login**: Sign in with an Admin account (e.g., `demo@kitloop.cz` if seeded, or your admin credentials).
- [ ] **Clean Slate**: Ensure you are using a test customer and test inventory items to strictly avoid messing with real pilot data if possible.

## 2. Core Flows Verification

### A. Inventory & Setup

- [ ] **Check Inventory**: Verify products list loads.
- [ ] **Add/Check Test Item**: Ensure there is at least one "Test Ski" available.

### B. Reservation Lifecycle (The "Happy Path")

1. **Create Reservation**:
   - [ ] Create a new reservation for "Test Ski" for Today/Tomorrow.
   - [ ] Status should be `Pending` or `Confirmed`.

2. **Issue (Override Workflow)**:
   - [ ] Open the reservation details.
   - [ ] Click **Issue/Pick Up**.
   - [ ] **Expectation**: If unpaid, it should warn or block.
   - [ ] **Action**: Use the "Override" (Force Issue) option if available/prompted.
   - [ ] **Result**: Reservation status changes to `Active`.

3. **Return (Damaged Workflow)**:
   - [ ] Open the same `Active` reservation.
   - [ ] Click **Return**.
   - [ ] **Action**: Mark the item as **Damaged** (check the box).
   - [ ] **Action**: Add a note "Smoke Test Damage".
   - [ ] **Action**: (Optional) Upload a test photo if supported.
   - [ ] Click **Confirm Return**.
   - [ ] **Result**: Reservation status changes to `Completed`.

### C. Data Integrity Check

- [ ] **Asset Status**: Go to Inventory > "Test Ski".
- [ ] **Result**: Status should be `Maintenance` (due to damage report).
- [ ] **Return Report**: Verify a Return Report was created in the UI (if visible) or DB.

## 3. Evidence & Sign-off

**Paste Screenshot of "Maintenance" Asset Status here:**
<!-- Paste image -->

---

**Notes / Issues Found:**
-

-
