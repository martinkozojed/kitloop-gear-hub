# 🚦 Release Gate Checklist - Admin Actions

**Purpose:** Pre-deployment verification for admin action changes  
**Time:** ~10 minutes  
**Frequency:** Before any deployment affecting admin system

---

## ✅ PRE-DEPLOYMENT (Local/Staging)

### 1. Console Guard Verification
```bash
./verify_console_guard.sh
```
**Required:** ✅ PASS (exit code 0)

---

### 2. Edge Function Tests

**Test invalid action (expect 400):**
```bash
curl -X POST $ADMIN_ACTION_URL \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"action":"invalid","target_id":"00000000-0000-0000-0000-000000000000"}'
```
✅ HTTP 400 + validation error

**Test unauthorized (expect 401):**
```bash
curl -X POST $ADMIN_ACTION_URL \
  -d '{"action":"approve_provider","target_id":"00000000-0000-0000-0000-000000000000"}'
```
✅ HTTP 401 + missing auth header

**Test non-admin (expect 403):**
- Login as regular user
- Attempt admin action
✅ HTTP 403 + forbidden

**Test happy path (expect 200):**
```bash
# Use unique reason for E2E verification
RELEASE_GATE_ID="release-gate-$(date -u +%Y%m%d-%H%M%S)"

curl -X POST $ADMIN_ACTION_URL \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"action\":\"approve_provider\",\"target_id\":\"$VALID_PROVIDER_UUID\",\"reason\":\"$RELEASE_GATE_ID\"}"

# Save for E2E check later
echo $RELEASE_GATE_ID > /tmp/release_gate_id.txt
```
✅ HTTP 200 + success message + save audit_log_id from response

**Test rate limiting (expect 429):**
- Send 21 requests rapidly
✅ First 20 succeed, 21st returns HTTP 429

---

### 3. Database Security Verification

**Check privileges:**
```sql
-- Both should return false/false
SELECT 
  has_table_privilege('anon', 'public.admin_audit_logs', 'select') as anon,
  has_table_privilege('authenticated', 'public.admin_audit_logs', 'select') as auth;

SELECT 
  has_table_privilege('anon', 'public.admin_rate_limits', 'select') as anon,
  has_table_privilege('authenticated', 'public.admin_rate_limits', 'select') as auth;
```
✅ All return `false`

**Check RLS status:**
```sql
SELECT 
  relname,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND relname IN ('admin_audit_logs', 'admin_rate_limits');
```
✅ Both tables: `rls_enabled=true, rls_forced=true`

---

### 4. Audit Log Verification

**After successful 200 test:**
```sql
SELECT 
  id,
  admin_id,
  action,
  target_id,
  reason,
  created_at
FROM public.admin_audit_logs
ORDER BY created_at DESC
LIMIT 5;
```
✅ New row present with correct data

---

### 5. Edge Function Health Check (Post-Deploy)

**Why:** Edge functions are the most common source of post-deploy surprises.

**Time:** 2 minutes

#### Option A: Supabase Dashboard (Visual)

1. **Navigate:** Supabase Dashboard → Edge Functions → `admin_action`

2. **Check Invocations (last 24h):**
   - ✅ Expected: > 0 invocations (from your tests)
   - ❌ Red flag: 0 invocations = function not being called

3. **Check Error Rate:**
   - ✅ Expected: < 5% error rate
   - ⚠️ Warning: 5-20% error rate
   - ❌ Red flag: > 20% error rate = immediate investigation

4. **Review Last Error Log:**
   - Click "Logs" → filter by "error"
   - ✅ Expected: No errors OR expected test errors (401/403)
   - ❌ Red flag: 5xx errors, "Function crashed", "Timeout"

5. **Verify Latest Success:**
   - Look for 200 response in logs
   - ✅ Expected: Valid request/response, contains `audit_log_id`
   - ❌ Red flag: Malformed data, missing fields

6. **End-to-End Verification (Critical - Bulletproof):**
   - After 200 response, verify audit log row in DB with EXACT match
   - This proves: edge function → DB → transaction committed → correct data
   ```sql
   -- Bulletproof E2E check with triple filter:
   -- 1. Unique reason (timestamp-based)
   -- 2. Your admin UUID
   -- 3. Your target provider UUID
   -- 4. Recent timestamp (< 2 minutes)
   
   -- Replace these values:
   -- $RELEASE_GATE_ID: e.g. 'release-gate-20260111-143000'
   -- $YOUR_ADMIN_UUID: your user_id from auth.users or profiles
   -- $TARGET_PROVIDER_UUID: the provider UUID you used in test
   
   SELECT 
     id,
     admin_id,
     action,
     target_id,
     reason,
     created_at,
     EXTRACT(EPOCH FROM (now() - created_at)) as age_seconds
   FROM public.admin_audit_logs
   WHERE reason LIKE 'release-gate-%'
     AND admin_id = '$YOUR_ADMIN_UUID'::uuid
     AND target_id = '$TARGET_PROVIDER_UUID'::uuid
     AND created_at > now() - interval '2 minutes'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - ✅ Expected: Exactly 1 row with YOUR reason + admin + target + age < 120 sec
   - ❌ Red flag: 0 rows = edge returned 200 but DB write failed OR wrong data
   - ❌ Red flag: > 1 row = collision (two tests at same time - very unlikely)

#### Option B: CLI (Quick)

```bash
# Check recent function logs
supabase functions logs admin_action --project-ref $PROJECT_REF --limit 20

# Look for patterns:
# ✅ 200 responses with audit_log_id
# ✅ 400/401/403 from your tests
# ❌ 5xx errors or crashes
```

**NO-GO Triggers:**
- ❌ Zero invocations after deployment
- ❌ Error rate > 20%
- ❌ Any 5xx errors in last 10 requests
- ❌ "Function crashed" or "Timeout" errors
- ❌ Edge function returned 200 BUT audit log missing in DB
  - This is the most critical check: proves end-to-end flow works

---

## 📊 PASS CRITERIA

| Check | Required | Status |
|-------|----------|--------|
| Console guard script | ✅ PASS | ⬜ |
| 400 Invalid action | ✅ | ⬜ |
| 401 Unauthorized | ✅ | ⬜ |
| 403 Forbidden | ✅ | ⬜ |
| 200 Happy path | ✅ | ⬜ |
| 429 Rate limit | ✅ | ⬜ |
| Privileges revoked | ✅ false/false | ⬜ |
| RLS enabled+forced | ✅ true/true | ⬜ |
| Audit log created | ✅ Row present | ⬜ |
| Edge function health | ✅ <5% errors | ⬜ |

**VERDICT:** ⬜ GO / ⬜ NO-GO

---

## 📦 ARTIFACTS TO ATTACH

**Save these outputs as evidence for audit trail:**

### 1. Console Guard Output
```bash
./verify_console_guard.sh > release_gate_console_guard.txt 2>&1
```
**Required:** Exit code 0, all checks PASS

### 2. Endpoint Test Results
```bash
# Save all curl outputs (REDACT tokens!)
echo "=== Invalid Action (400) ===" > release_gate_endpoints.txt
curl -X POST $URL -H "Authorization: Bearer [REDACTED]" \
  -d '{"action":"invalid",...}' >> release_gate_endpoints.txt 2>&1

# Repeat for 401, 403, 200, 429
# IMPORTANT: Replace actual tokens with [REDACTED]
```

### 3. Database Security Evidence
```sql
-- Save as: release_gate_db_security.sql
\o release_gate_db_security.txt

-- Privileges check
SELECT 
  has_table_privilege('anon', 'public.admin_audit_logs', 'select') as anon_audit,
  has_table_privilege('authenticated', 'public.admin_audit_logs', 'select') as auth_audit,
  has_table_privilege('anon', 'public.admin_rate_limits', 'select') as anon_rate,
  has_table_privilege('authenticated', 'public.admin_rate_limits', 'select') as auth_rate;

-- RLS status
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND relname IN ('admin_audit_logs', 'admin_rate_limits');

\o
```

### 4. Audit Log Sample
```sql
-- Last 5 audit logs (NO admin_id, redact PII)
SELECT 
  id,
  action,
  target_id,
  LEFT(reason, 50) as reason_preview,
  created_at
FROM public.admin_audit_logs
ORDER BY created_at DESC
LIMIT 5;
```

### 5. Edge Function Logs (Post-Deploy)
```bash
# Last 20 function invocations
supabase functions logs admin_action --project-ref $PROJECT_REF --limit 20 \
  > release_gate_edge_function_logs.txt 2>&1

# Or screenshot from Supabase Dashboard:
# Edge Functions → admin_action → Logs (last 24h)
```

### 6. Git Commit Info
```bash
git log -1 --format="%H%n%an%n%ae%n%ai%n%s" > release_gate_commit.txt
```

**Artifact Checklist:**
- [ ] `release_gate_console_guard.txt` (exit 0)
- [ ] `release_gate_endpoints.txt` (tokens redacted)
- [ ] `release_gate_db_security.txt` (all false/true)
- [ ] `release_gate_audit_sample.txt` (5 rows)
- [ ] `release_gate_edge_function_logs.txt` (error rate < 5%)
- [ ] `release_gate_commit.txt` (commit hash)

**Storage:** Attach to deployment ticket/PR or store in `releases/YYYY-MM-DD/` folder

---

## 🚨 NO-GO TRIGGERS

**Immediate rollback if:**
- ❌ Console guard fails
- ❌ Any endpoint returns wrong status code
- ❌ anon/authenticated have SELECT on admin tables
- ❌ RLS not enabled or not forced
- ❌ Audit log not created for successful action
- ❌ Rate limiting not working (no 429 after 20 requests)
- ❌ Edge function error rate > 20%
- ❌ Edge function 5xx errors in last 10 requests
- ❌ Zero invocations post-deployment (function not being called)

---

## 📝 NOTES

**Common Issues:**
1. **Persistent 429:** Check RPC returns array, not object
2. **403 instead of 200:** User not in `user_roles` table
3. **Audit log missing:** Check SECURITY DEFINER on RPC functions
4. **Rate limit bypassed:** Check RLS policies on `admin_rate_limits`
5. **Edge function 5xx:** Check environment variables, service role key
6. **Zero invocations:** Function deployed but not configured in frontend URL

**Time Estimate:**
- Setup: 2 min
- Tests: 5 min
- DB checks: 2 min
- Edge function health: 2 min
- Review: 1 min
- **Total: ~12 min**

---

**Last Updated:** 2026-01-11  
**Version:** 1.0  
**Owner:** Security Team
