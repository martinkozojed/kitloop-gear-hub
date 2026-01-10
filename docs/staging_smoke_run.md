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

Run these snippets in the browser console (F12) while logged in as **User A**.

### 2.1 Verify Access Denied to Competitor's Bucket

```javascript
// Replace with Provider B's ID (get from DB or URL)
const PROVIDER_B_ID = '00000000-0000-0000-0000-000000000000';

// 1. LIST: Should be empty or error
await window.supabase.storage
  .from('damage-photos')
  .list(PROVIDER_B_ID);

// 2. UPLOAD: Should fail (403)
await window.supabase.storage
  .from('damage-photos')
  .upload(`${PROVIDER_B_ID}/hack.txt`, new Blob(['hacked']));
```

### 2.2 Verify Access Allowed to Own Bucket

```javascript
// 3. UPLOAD OWN: Should success
const myId = (await window.supabase.auth.getUser()).data.user.id;
await window.supabase.storage
  .from('damage-photos')
  .upload(`${myId}/test_proof.txt`, new Blob(['proof']));
```

## 3. Return Flow & Idempotence (End-to-End)

1. **Perform Return**:
   - Go to Active Reservation -> Click "Return".
   - Mark as damaged, upload photo.
   - **Disconnect Network** -> "Complete Return".
   - Verify: "Retry" button appears.
2. **Recover**:
   - **Reconnect Network** -> Click "Retry".
   - Verify: Success toast.
3. **Idempotence Check**:
   - Reload page.
   - Try to process return again (if UI allows) OR check SQL below.
   - **Expectation**: Only ONE report exists.

## 4. SQL Verification (Data Integrity)

Run this SQL in Supabase SQL Editor:

```sql
-- Verify exactly ONE report exists
SELECT 
    r.id as reservation_id,
    r.status as res_status,
    count(rr.id) as report_count,
    a.status as asset_status
FROM reservations r
LEFT JOIN return_reports rr ON rr.reservation_id = r.id
JOIN reservation_assignments ra ON ra.reservation_id = r.id
JOIN assets a ON ra.asset_id = a.id
WHERE r.id = 'YOUR_RESERVATION_ID' -- <--- INPUT HERE
GROUP BY r.id, r.status, a.status;
```

**PASS Criteria**:

- `report_count` = 1
- `res_status` = `completed`
- `asset_status` = `maintenance`

## 5. Pass/Fail Definition

| Check | PASS Criteria |
| :--- | :--- |
| **Storage** | Console snippets confirm 403 for Provider B, 200 for Self. |
| **Recovery** | "Retry" flow works after network drop. |
| **Integrity** | SQL confirms single report & correct statuses. |

If ALL checks pass, the release is **PILOT READY**.

## 6. Security & Linter Verification

**Goal**: Verify P0 security hardening fixes.

1. **Notification Logs Security**:
   Run in SQL Editor:

   ```sql
   select
     has_table_privilege('anon', 'public.notification_logs', 'select') as anon_select,
     has_table_privilege('authenticated', 'public.notification_logs', 'select') as auth_select;
   ```

   **Expectation**: Both `false`.

2. **Function Search Paths**:
   Run in SQL Editor:

   ```sql
   SELECT proname FROM pg_proc
   WHERE proname IN ('issue_reservation', 'process_return', 'check_overbooking_guard')
     AND (proconfig IS NULL OR NOT 'search_path=public, auth, extensions' = ANY(proconfig));
   ```

   **Expectation**: 0 rows.
