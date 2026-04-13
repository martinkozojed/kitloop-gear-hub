# P0 RC1 - Staging Deployment Runbook

**Execute Date:** 2026-01-10  
**Executor:** Release Manager  
**Commit:** b0c73e7486a23814eb27a2162be28957d61861dc

---

## STEP A: UNPAUSE STAGING (MANUAL - 2 minutes)

### A1. Open Dashboard
```
URL: https://supabase.com/dashboard/project/cnlqceulvvqgonvskset
```

### A2. Unpause Project
1. Look for "Paused" banner or status indicator
2. Click "Resume Project" or "Unpause" button
3. Wait for confirmation (project becomes Active)

### A3. Verify Status
```bash
supabase projects list | grep cnlqceulvvqgonvskset
```

**Expected Output:**
```
● | mnpaeesxgmfwltinhxbh | cnlqceulvvqgonvskset | Kitloop Staging | West EU (Ireland)
```
(Note the ● symbol indicating active)

**Timestamp:** [FILL IN WHEN DONE]  
**Status:** [Active/Failed]

---

## STEP B: STAGING DEPLOY (CLI - 10 minutes)

### B1. Link Staging Project

```bash
cd /Users/mp/Downloads/kitloop-gear-hub-main
supabase link --project-ref cnlqceulvvqgonvskset
```

**Expected Output:**
```
Finished supabase link.
```

**Actual Output:**
```
[PASTE HERE]
```

---

### B2. Push Database Migrations

```bash
supabase db push
```

**Expected Output:**
```
Applying migration 20260110120001_admin_action_hardening_fixed.sql...
Finished supabase db push on branch main.
```

**Actual Output:**
```
[PASTE HERE]
```

**Verify Migration:**
```bash
supabase migration list | grep 20260110120001
```

**Expected:**
```
20260110120001 | 20260110120001 | 2026-01-10 12:00:01
```

---

### B3. Deploy Edge Function

```bash
supabase functions deploy admin_action
```

**Expected Output:**
```
Bundling Function: admin_action
Deploying Function: admin_action (script size: ~800KB)
Deployed Functions on project cnlqceulvvqgonvskset: admin_action
```

**Actual Output:**
```
[PASTE HERE]
```

**Get Function URL:**
```bash
supabase projects list | grep cnlqceulvvqgonvskset
```

**Function URL Pattern:**
```
https://cnlqceulvvqgonvskset.supabase.co/functions/v1/admin_action
```

---

### B4. Build Frontend

```bash
npm run build
```

**Verify Kill Switch:**
```bash
grep "console\.log=()=>{}" dist/assets/*.js
```

**Expected:** Found (1 match)

---

### B5. Deploy Frontend to Staging

**Option A: Netlify**
```bash
netlify deploy --prod --site=<STAGING_SITE_ID>
```

**Option B: Vercel**
```bash
vercel --prod
```

**Option C: Manual**
```
Upload dist/ to staging hosting
```

**Staging URL:** [FILL IN AFTER DEPLOY]

---

## STEP C: MANUAL CONSOLE TESTS (5 minutes)

### C1. Browser Console Test

1. Open: [STAGING_URL]
2. Press F12 → Console tab
3. Execute tests:

```javascript
// Test 1: console.log must be SILENT
console.log("TEST - MUST BE SILENT");

// Test 2: console.info must be SILENT
console.info("TEST - MUST BE SILENT");

// Test 3: console.debug must be SILENT
console.debug("TEST - MUST BE SILENT");

// Test 4: console.warn must APPEAR
console.warn("TEST - MUST APPEAR");

// Test 5: console.error must APPEAR
console.error("TEST - MUST APPEAR");
```

**Results:**
```
Test 1 (log):   [SILENT/VISIBLE]
Test 2 (info):  [SILENT/VISIBLE]
Test 3 (debug): [SILENT/VISIBLE]
Test 4 (warn):  [PASS/FAIL - should be visible]
Test 5 (error): [PASS/FAIL - should be visible]
```

---

### C2. Critical Flow Tests

#### Flow 1: Login/Logout

1. Navigate to /login
2. Enter credentials
3. Submit login
4. **Check Console:** Should have ZERO console.log/info/debug
5. Click logout
6. **Check Console:** Should have ZERO console.log/info/debug

**Console Output:**
```
[PASTE ANY UNEXPECTED OUTPUT HERE]
Expected: Only warnings/errors (if any)
Actual: [FILL IN]
```

**Result:** [PASS/FAIL]

---

#### Flow 2: Create Reservation

1. Navigate to reservation form
2. Fill details
3. Submit
4. **Check Console:** No data logs

**Result:** [PASS/FAIL]

---

#### Flow 3: Inventory Import

1. Navigate to inventory import
2. Upload test CSV
3. Process import
4. **Check Console:** No PapaParse logs

**Result:** [PASS/FAIL]

---

#### Flow 4: QR Scan

1. Navigate to QR scan feature
2. Scan test QR code
3. **Check Console:** No ZXing logs

**Result:** [PASS/FAIL]

---

## STEP D: ADMIN ACTION SMOKE TESTS (15 minutes)

### Setup Test Environment

```bash
# Save test script
cat > /tmp/admin_smoke_tests.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

# Configuration
STAGING_URL="[YOUR_STAGING_URL]"
ADMIN_TOKEN="[YOUR_ADMIN_JWT_TOKEN]"
PROVIDER_UUID="[TEST_PROVIDER_UUID]"
ANON_KEY="[STAGING_ANON_KEY]"

echo "=== ADMIN ACTION SMOKE TESTS ==="
echo "Staging URL: $STAGING_URL"
echo ""

# Test 1: 400 - Invalid Action
echo "Test 1: 400 - Invalid Action"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$STAGING_URL/functions/v1/admin_action" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "invalid_action", "target_id": "'$PROVIDER_UUID'"}')
echo "$RESPONSE"
echo ""

# Test 2: 401 - Missing Authorization
echo "Test 2: 401 - Missing Authorization"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$STAGING_URL/functions/v1/admin_action" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve_provider", "target_id": "'$PROVIDER_UUID'"}')
echo "$RESPONSE"
echo ""

# Test 3: 403 - Non-admin user (need non-admin token)
echo "Test 3: 403 - Non-admin User"
NON_ADMIN_TOKEN="[INSERT_NON_ADMIN_TOKEN]"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$STAGING_URL/functions/v1/admin_action" \
  -H "Authorization: Bearer $NON_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve_provider", "target_id": "'$PROVIDER_UUID'"}')
echo "$RESPONSE"
echo ""

# Test 4: 200 - Success
echo "Test 4: 200 - Success (Approve Provider)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "$STAGING_URL/functions/v1/admin_action" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_provider",
    "target_id": "'$PROVIDER_UUID'",
    "reason": "Staging smoke test - approve"
  }')
echo "$RESPONSE"
AUDIT_LOG_ID=$(echo "$RESPONSE" | grep -o '"audit_log_id":"[^"]*"' | cut -d'"' -f4)
echo "Audit Log ID: $AUDIT_LOG_ID"
echo ""

# Test 5: DB Audit Log Check
echo "Test 5: Verify Audit Log in DB"
echo "Run this SQL query on staging DB:"
echo "SELECT id, admin_id, action, target_id, reason FROM admin_audit_logs WHERE id = '$AUDIT_LOG_ID';"
echo ""

# Test 6: 429 - Rate Limit (21 requests)
echo "Test 6: 429 - Rate Limit (21 requests in 60s)"
for i in {1..21}; do
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
    "$STAGING_URL/functions/v1/admin_action" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"action": "approve_provider", "target_id": "'$PROVIDER_UUID'"}')
  
  if [ "$HTTP_CODE" = "429" ]; then
    echo "Request $i: HTTP_$HTTP_CODE (Rate limited ✓)"
  elif [ "$HTTP_CODE" = "200" ]; then
    echo "Request $i: HTTP_$HTTP_CODE (Success)"
  else
    echo "Request $i: HTTP_$HTTP_CODE (Unexpected)"
  fi
done
echo ""

# Test 7: Parallel Rate Limit (25 concurrent requests)
echo "Test 7: Parallel Rate Limit (25 concurrent requests)"
echo "Launching 25 parallel requests..."
for i in {1..25}; do
  (
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
      "$STAGING_URL/functions/v1/admin_action" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"action": "approve_provider", "target_id": "'$PROVIDER_UUID'", "reason": "Parallel test '$i'"}')
    echo "Parallel $i: HTTP_$HTTP_CODE"
  ) &
done
wait
echo ""

# Test 8: Check for DB structure leakage
echo "Test 8: Check Response for DB Leakage"
RESPONSE=$(curl -s -X POST \
  "$STAGING_URL/functions/v1/admin_action" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "invalid", "target_id": "not-a-uuid"}')
echo "$RESPONSE"
echo ""
echo "Check for leaked keywords: constraint, table, column, foreign_key, pg_"
echo "$RESPONSE" | grep -i "constraint\|table\|column\|foreign_key\|pg_" && \
  echo "⚠️ WARNING: DB structure leaked!" || \
  echo "✓ No DB structure in response"

echo ""
echo "=== SMOKE TESTS COMPLETE ==="
EOFSCRIPT

chmod +x /tmp/admin_smoke_tests.sh
```

---

### Fill in Configuration

Edit `/tmp/admin_smoke_tests.sh` and replace:

1. **STAGING_URL:** From Step B5
2. **ADMIN_TOKEN:** Get from staging login:
   ```javascript
   // In browser console after login:
   supabase.auth.getSession().then(r => console.log(r.data.session.access_token))
   ```
3. **PROVIDER_UUID:** Create test provider or use existing:
   ```sql
   SELECT id FROM providers WHERE status = 'pending' LIMIT 1;
   ```
4. **NON_ADMIN_TOKEN:** Login as regular user and get token

---

### Execute Smoke Tests

```bash
/tmp/admin_smoke_tests.sh 2>&1 | tee /tmp/smoke_test_results.txt
```

**Results:** [PASTE OUTPUT HERE]

---

### Manual Verification Checklist

After running automated tests, verify:

| Test | Expected | Result |
|------|----------|--------|
| 1. 400 Invalid | HTTP 400, validation error | [PASS/FAIL] |
| 2. 401 Unauth | HTTP 401, missing auth | [PASS/FAIL] |
| 3. 403 Forbidden | HTTP 403, admin required | [PASS/FAIL] |
| 4. 200 Success | HTTP 200, audit_log_id | [PASS/FAIL] |
| 5. Audit Log | Row exists in DB | [PASS/FAIL] |
| 6. 429 Sequential | 21st request = 429 | [PASS/FAIL] |
| 7. 429 Parallel | Max 20 success, rest 429 | [PASS/FAIL] |
| 8. No DB Leak | No constraint/table names | [PASS/FAIL] |

---

## STEP E: UPDATE EVIDENCE DOCUMENT

```bash
# Evidence document is at:
# docs/P0_STAGING_EXECUTION_EVIDENCE.md

# Update with:
# - Staging URL
# - Deploy command outputs
# - Test results (PASS/FAIL table)
# - Final verdict (GO/NO-GO)
```

---

## QUICK CHECKLIST

- [ ] Step A: Staging unpaused (Active status)
- [ ] Step B1: supabase link successful
- [ ] Step B2: DB migrations pushed
- [ ] Step B3: Edge function deployed
- [ ] Step B4: Frontend built (kill switch verified)
- [ ] Step B5: Frontend deployed (staging URL obtained)
- [ ] Step C1: Console tests (log/info/debug silent)
- [ ] Step C2: Flow tests (login, reservation, import, QR)
- [ ] Step D: Admin action smoke tests (8/8 + parallel)
- [ ] Step E: Evidence document updated

**If ALL checkboxes are ✓:** Proceed to verdict

---

## VERDICT DECISION TREE

### All Tests PASS (8/8 console + 8/8 smoke)
→ **GO FOR PRODUCTION**

### 1-2 Tests FAIL (minor issues)
→ Review fails, create minimal patch plan
→ **CONDITIONAL GO** or **NO-GO** (depends on severity)

### 3+ Tests FAIL (major issues)
→ **NO-GO FOR PRODUCTION**
→ Create patch plan and re-test

---

## TROUBLESHOOTING

### Issue: Staging won't unpause
**Solution:** Contact Supabase support or use production for testing (not recommended)

### Issue: Migration fails
**Error:** "Migration already applied"
**Solution:** Migrations are idempotent, check `supabase migration list`

### Issue: Edge function 503
**Error:** "name resolution failed"
**Solution:** Function not deployed, re-run `supabase functions deploy admin_action`

### Issue: Console still logs
**Error:** console.log produces output
**Solution:** 
1. Verify build: `grep "console\.log=()=>{}" dist/`
2. If missing, rebuild: `npm run build`
3. If present, check browser cache (hard refresh: Cmd+Shift+R)

---

**END OF RUNBOOK**
