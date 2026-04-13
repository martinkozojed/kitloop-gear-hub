# P0 SECURITY FIXES - SMOKE TEST

**Datum:** 2026-01-10  
**Účel:** Verifikace admin action hardening před staging deploy

---

## Prerequisity

```bash
# 1. Lokální Supabase běží
supabase status

# 2. Migrace aplikovány
supabase db reset  # Nebo supabase migration up

# 3. Admin user existuje
# Vytvořte přes Supabase dashboard nebo seed script
```

---

## Test 1: Console Log Audit (Production Build)

```bash
# Build production
npm run build

# Verify console usage
grep -o "console\.\w\+" dist/assets/*.js | sort | uniq -c

# Expected:
#   53 console.error  ✅
#   27 console.warn   ✅
#    0 console.log    ✅ (Supabase logger má debug: false)
```

**PASS Criteria:** Zero `console.log` v dist/ nebo pouze v non-PII kontextu.

---

## Test 2: Database Migration Integrity

```bash
# Check migrations applied
supabase migration list

# Expected:
# ✅ 20251221221000_admin_audit_logs.sql
# ✅ 20260110120001_admin_action_hardening_fixed.sql

# Verify tables exist
psql $DATABASE_URL -c "\dt public.admin_*"

# Expected tables:
# - admin_audit_logs
# - admin_rate_limits
```

**PASS Criteria:** Obě tabulky existují, všechny columns přítomné.

---

## Test 3: Admin Action - Success Path (200)

```bash
# Get admin token (replace with your method)
ADMIN_TOKEN="your_admin_jwt_token"
PROVIDER_ID="target_provider_uuid"

# Test approve
curl -X POST http://localhost:54321/functions/v1/admin_action \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_provider",
    "target_id": "'$PROVIDER_ID'",
    "reason": "Smoke test approval"
  }'

# Expected: 200 OK
# {
#   "success": true,
#   "action": "approve_provider",
#   "audit_log_id": "uuid",
#   "message": "Provider approved successfully"
# }
```

**PASS Criteria:** 200 status, audit log vytvořen v DB.

---

## Test 4: Admin Action - Unauthorized (401)

```bash
# Test bez auth header
curl -X POST http://localhost:54321/functions/v1/admin_action \
  -H "Content-Type: application/json" \
  -d '{"action": "approve_provider", "target_id": "any-uuid"}'

# Expected: 401 Unauthorized
# {"error": "Missing Authorization header"}
```

**PASS Criteria:** 401 status, žádná změna v DB.

---

## Test 5: Admin Action - Forbidden (403)

```bash
# Test s non-admin user tokenem
NON_ADMIN_TOKEN="non_admin_jwt_token"

curl -X POST http://localhost:54321/functions/v1/admin_action \
  -H "Authorization: Bearer $NON_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve_provider", "target_id": "any-uuid"}'

# Expected: 403 Forbidden
# {"error": "Forbidden: Admin access required", "code": "FORBIDDEN"}
```

**PASS Criteria:** 403 status, žádná změna v DB.

---

## Test 6: Rate Limit (429)

```bash
# Spusťte 21x approve action rychle za sebou (limit je 20/min)
for i in {1..21}; do
  curl -X POST http://localhost:54321/functions/v1/admin_action \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "action": "approve_provider",
      "target_id": "'$PROVIDER_ID'",
      "reason": "Rate limit test '$i'"
    }' &
done
wait

# Expected: První 20 vrátí 200, 21. vrátí 429
# {
#   "error": "Too many admin actions. Please wait before trying again.",
#   "code": "RATE_LIMIT_EXCEEDED",
#   "remaining": 0
# }
```

**PASS Criteria:** 21. request vrátí 429, rate limit záznam v `admin_rate_limits`.

---

## Test 7: Invalid Payload (400)

```bash
# Test s nevalidním action
curl -X POST http://localhost:54321/functions/v1/admin_action \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "delete_provider", "target_id": "uuid"}'

# Expected: 400 Bad Request
# {
#   "error": "Validation failed",
#   "code": "VALIDATION_ERROR",
#   "details": {...}
# }
```

**PASS Criteria:** 400 status, žádná změna v DB.

---

## Test 8: Audit Log Verification

```sql
-- Query admin_audit_logs
SELECT 
  admin_id,
  action,
  target_id,
  reason,
  metadata,
  created_at
FROM public.admin_audit_logs
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Všechny admin actions zalogované s:
-- ✅ admin_id (UUID)
-- ✅ action (approve_provider / reject_provider)
-- ✅ target_id (provider UUID)
-- ✅ reason (pokud posláno)
-- ✅ metadata (obsahuje previous_status)
```

**PASS Criteria:** Všechny akce z testů 3, 6 jsou zalogované.

---

## FINAL CHECKLIST

| Test | Status | Notes |
|------|--------|-------|
| 1. Console logs | ⬜ | Zero console.log v dist/ |
| 2. Migrations | ⬜ | Tabulky existují |
| 3. Success (200) | ⬜ | Admin action funguje |
| 4. Unauthorized (401) | ⬜ | Auth block funguje |
| 5. Forbidden (403) | ⬜ | Admin check funguje |
| 6. Rate limit (429) | ⬜ | Durable rate limit funguje |
| 7. Invalid payload (400) | ⬜ | Validace funguje |
| 8. Audit logs | ⬜ | Všechny akce zalogované |

**DEPLOY GATE:** Všech 8 testů musí projít ✅ před staging deploy.

---

## Troubleshooting

### Console.log stále v dist/
```bash
# Re-verify Supabase config
grep "debug:" src/lib/supabase.ts
# Očekávané: debug: false

# Clear cache a rebuild
rm -rf dist/ node_modules/.vite
npm run build
```

### Migrace selhávají
```bash
# Check for conflicting migrations
ls -la supabase/migrations/*admin_action*

# Měla by být pouze jedna:
# 20260110120001_admin_action_hardening_fixed.sql

# Pokud jsou dvě s 20260110120001, smazat _patch.sql
```

### Edge Function vrací 500
```bash
# Check Supabase logs
supabase functions logs admin_action

# Častý error: "function admin_approve_provider does not exist"
# Fix: Migrace nebyla aplikována, nebo je konfliktní _patch.sql
```
