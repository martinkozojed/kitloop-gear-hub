# Staging Smoke Run: Return Flow Hardening (Fix v2)

This document outlines the **10-minute manual verification** process to ensure the Return Flow is secure (`Fix v2`) and recoverable.

**Goal**: Verify strict security isolation and user recoverability on Staging.

## 1. Prerequisites

- Access to Staging Supabase Dashboard (SQL Editor + Storage).
- Two Test Users:
  - **User A** (Owner of Provider A)
  - **User B** (Owner of Provider B)
- One Active Reservation for Provider A.

## 2. Cross-Tenant Storage Isolation (Security)

*Perform this check in the Supabase Dashboard or via API/Client Console.*

1. **Login as User A**.
2. **Attempt List/Read**:
    - Try to view files in bucket `damage-photos`.
    - Prefix: `{provider_B_id}/...`
    - **Expectation**: Access Denied (Empty list or 403).
3. **Attempt Upload**:
    - Try to upload a file to `damage-photos`.
    - Path: `{provider_B_id}/test.jpg`
    - **Expectation**: Upload Failed (403 Policy Violation).

## 3. Return Flow & Recoverability (End-to-End)

*Perform this in the Application UI.*

1. **Open Return Dialog**:
    - Go to Active Reservation (Provider A).
    - Click "Return".
    - Mark 1 item as **Damaged**.
    - **Upload Photo**: Select a valid image.
    - **Disconnect Network (Simulate Fail)**: Turn off Wifi or set Network Throttling to Offline in DevTools.
    - Click **"Complete Return"**.
2. **Verify Partial Success**:
    - App should toast: "Return recorded, but photo upload failed." (or similar).
    - Dialog should **STAY OPEN**.
    - Button should change to **"Retry Upload"**.
3. **Retry**:
    - **Reconnect Network**.
    - Click **"Retry Upload"**.
    - **Expectation**:
        - Upload succeeds.
        - Dialog closes.
        - Success toast appears.

## 4. SQL Verification (Data Integrity)

Run this SQL to verify the final state:

```sql
-- Replace with actual Reservation ID
SELECT 
    r.status as reservation_status,
    rr.id as report_id,
    jsonb_array_length(rr.photo_evidence) as photo_count,
    a.status as asset_status
FROM reservations r
JOIN return_reports rr ON rr.reservation_id = r.id
JOIN reservation_assignments ra ON ra.reservation_id = r.id
JOIN assets a ON ra.asset_id = a.id
WHERE r.id = 'YOUR_RESERVATION_ID';
```

**PASS Criteria for SQL**:

- `reservation_status` = `completed`
- `photo_count` >= 1
- `asset_status` = `maintenance`

## 5. Pass/Fail Definition

| Check | PASS Criteria |
| :--- | :--- |
| **Storage Isolation** | User A CANNOT read/write User B's folder. |
| **Idempotence** | Repeating the return action does not duplicate reports. |
| **Recoverability** | Failed upload does not close dialog; Retry button works. |
| **Data Integrity** | SQL returns correct statuses and photo evidence. |

If ALL checks pass, the release is **PILOT READY**.
