# P0 Security Fixes - Smoke Test Protocol

**Date:** 2026-01-10  
**Scope:** Critical security fixes for production deployment  
**Duration:** ~15 minutes

---

## ✅ Pre-requisites

1. **Database migration applied:**
   ```bash
   supabase db push
   # Or locally:
   supabase migration up
   ```

2. **Environment variables set:**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for Edge Functions)

3. **Admin user exists:**
   - Email: `admin@test.cz` (or your test admin)
   - Profile: `role = 'admin'` or `is_admin = true`

4. **Test provider exists:**
   - ID: Note down a valid `provider_id` from your database

---

## 🧪 TEST 1: Admin Action - Invalid Payload (400)

**Purpose:** Verify Zod validation works

### cURL Command:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/admin_action \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "invalid_action",
    "target_id": "not-a-uuid"
  }'
```

### Expected Response:
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "action": {
      "_errors": ["Invalid action. Must be 'approve_provider' or 'reject_provider'"]
    },
    "target_id": {
      "_errors": ["Invalid provider ID format"]
    }
  }
}
```

**Status:** `400 Bad Request`

**✅ PASS if:** Returns 400 with structured validation errors

---

## 🧪 TEST 2: Admin Action - Non-Admin User (403)

**Purpose:** Verify authorization check

### Setup:
1. Login as **non-admin user** (customer or provider)
2. Get auth token from browser DevTools:
   ```javascript
   localStorage.getItem('kitloop-auth-token')
   ```

### cURL Command:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/admin_action \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_provider",
    "target_id": "VALID_PROVIDER_UUID"
  }'
```

### Expected Response:
```json
{
  "error": "Forbidden: Admin access required",
  "code": "FORBIDDEN"
}
```

**Status:** `403 Forbidden`

**✅ PASS if:** Non-admin cannot execute admin actions

---

## 🧪 TEST 3: Admin Action - Success with Audit Log (200)

**Purpose:** Verify atomic operation (audit log + provider update)

### Setup:
1. Login as **admin user**
2. Get admin auth token
3. Note down a `provider_id` with `status != 'approved'`

### cURL Command:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/admin_action \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_provider",
    "target_id": "PROVIDER_UUID",
    "reason": "Test approval for smoke test"
  }'
```

### Expected Response:
```json
{
  "success": true,
  "action": "approve_provider",
  "target_id": "PROVIDER_UUID",
  "audit_log_id": "some-uuid",
  "message": "Provider approved successfully"
}
```

**Status:** `200 OK`

### Verification in Database:
```sql
-- 1. Check provider status updated
SELECT id, status, verified, updated_at 
FROM public.providers 
WHERE id = 'PROVIDER_UUID';
-- Expected: status = 'approved', verified = true

-- 2. Check audit log created
SELECT id, admin_id, action, target_id, reason, created_at
FROM public.admin_audit_logs
WHERE target_id = 'PROVIDER_UUID'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: Row exists with action = 'approve_provider'
```

**✅ PASS if:** 
- Returns 200
- Provider status = 'approved'
- Audit log exists
- Both operations atomic (no provider update without audit log)

---

## 🧪 TEST 4: Admin Action - Rate Limiting (429)

**Purpose:** Verify durable rate limit (20 actions/60s)

### Setup:
Use a simple bash loop to spam requests:

```bash
#!/bin/bash
ADMIN_TOKEN="YOUR_ADMIN_TOKEN"
PROVIDER_ID="YOUR_PROVIDER_UUID"

for i in {1..25}; do
  echo "Request $i"
  curl -s -X POST https://YOUR_PROJECT.supabase.co/functions/v1/admin_action \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"approve_provider\",
      \"target_id\": \"$PROVIDER_ID\",
      \"reason\": \"Spam test $i\"
    }" | jq '.error'
  sleep 0.5
done
```

### Expected Behavior:
- First 20 requests: `200 OK` or `null` (success)
- Requests 21-25: 
  ```json
  {
    "error": "Too many admin actions. Please wait before trying again.",
    "code": "RATE_LIMIT_EXCEEDED",
    "remaining": 0
  }
  ```

**Status:** `429 Too Many Requests` (after 20 requests)

### Verification in Database:
```sql
SELECT admin_id, action_count, window_start, last_action_at
FROM public.admin_rate_limits
WHERE admin_id = 'YOUR_ADMIN_USER_ID';
-- Expected: action_count >= 20
```

**✅ PASS if:** 
- Rate limit triggers after 20 requests
- Returns 429 with proper error
- Rate limit persists across function invocations (durable)

---

## 🧪 TEST 5: PII Logging - Production Build

**Purpose:** Verify no email/phone in browser console logs

### Setup:
1. Build for production:
   ```bash
   npm run build
   npm run preview
   ```

2. Open browser DevTools Console

3. Perform login:
   - Email: `test@example.com`
   - Password: `TestPassword123`

### Expected Console Output:
```
[No logs should appear in production]
```

**OR** (if errors occur):
```
❌ Login failed {
  "message": "Invalid credentials",
  "name": "AuthApiError"
}
```

### ❌ FAIL if you see:
```
🔐 Login attempt for: test@example.com
📡 Supabase auth response: { user: "test@example.com", ... }
```

**✅ PASS if:** 
- No email addresses in console
- No phone numbers in console
- Error messages don't contain stack traces or DB details

---

## 🧪 TEST 6: Error Sanitization - DB Error Leak

**Purpose:** Verify user never sees DB structure

### Trigger a constraint violation:
```bash
# Try to create duplicate provider (if you have one)
curl -X POST https://YOUR_PROJECT.supabase.co/rest/v1/providers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "user_id": "EXISTING_USER_ID",
    "rental_name": "Test Rental"
  }'
```

### Expected User-Facing Error (frontend toast):
```
"Tento záznam již existuje. Zkuste použít jiné hodnoty."
```

### ❌ FAIL if user sees:
```
"duplicate key value violates unique constraint "providers_user_id_key"
Detail: Key (user_id)=(uuid-value) already exists."
```

**✅ PASS if:** Error message is generic, no table/constraint names visible

---

## 📊 Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Invalid Payload (400) | ⬜ | |
| 2. Non-Admin (403) | ⬜ | |
| 3. Success + Audit (200) | ⬜ | |
| 4. Rate Limit (429) | ⬜ | |
| 5. PII Logging | ⬜ | |
| 6. Error Sanitization | ⬜ | |

**Overall:** ⬜ PASS / ⬜ FAIL

---

## 🔧 Rollback Procedure (if needed)

If tests fail critically:

```bash
# 1. Revert database migration
supabase migration down

# 2. Revert code changes
git revert <commit-hash>

# 3. Redeploy previous version
git push origin main
```

---

## ✅ Sign-off

**Tested by:** _________________  
**Date:** _________________  
**Environment:** ⬜ Local ⬜ Staging ⬜ Production  
**Approved for production:** ⬜ YES ⬜ NO

**Notes:**
```
[Any issues or observations during testing]
```
