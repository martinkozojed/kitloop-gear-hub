# ⚡ ADMIN ACTIONS - 5 MINUTE TEST

**Prerekvizity:**
- Admin účet na https://kitloop.cz
- Pending provider k otestování (nebo použít fake UUID pro základní test)

---

## TEST 1: Get Admin Token (1 min)

1. Login na https://kitloop.cz jako admin
2. Otevřít Console (F12)
3. Spustit:

```javascript
const session = await supabase.auth.getSession();
const token = session.data.session.access_token;
console.warn("Token:", token);
// Zkopírovat token pro další testy
```

---

## TEST 2: Basic Endpoint Tests (2 min)

**V terminálu:**

```bash
# Test 1: 401 bez tokenu (již ověřeno)
curl -s -w "\nHTTP: %{http_code}\n" \
  -X POST https://bkyokcjpelqwtndienos.supabase.co/functions/v1/admin_action \
  -H "Content-Type: application/json" \
  -d '{"action":"approve_provider","target_id":"test"}'

# Očekáváno: {"code":401,"message":"Missing authorization header"}

# Test 2: 400 invalid action
curl -s -w "\nHTTP: %{http_code}\n" \
  -X POST https://bkyokcjpelqwtndienos.supabase.co/functions/v1/admin_action \
  -H "Authorization: Bearer VÁŠ_TOKEN_ZDE" \
  -H "Content-Type: application/json" \
  -d '{"action":"invalid_action","target_id":"123"}'

# Očekáváno: HTTP 400

# Test 3: 400 invalid UUID
curl -s -w "\nHTTP: %{http_code}\n" \
  -X POST https://bkyokcjpelqwtndienos.supabase.co/functions/v1/admin_action \
  -H "Authorization: Bearer VÁŠ_TOKEN_ZDE" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve_provider","target_id":"not-a-uuid"}'

# Očekáváno: HTTP 400
```

---

## TEST 3: Real Admin Action (2 min)

**Pokud máte pending providera:**

```bash
# Approve provider
curl -s -w "\nHTTP: %{http_code}\n" \
  -X POST https://bkyokcjpelqwtndienos.supabase.co/functions/v1/admin_action \
  -H "Authorization: Bearer VÁŠ_TOKEN_ZDE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_provider",
    "target_id": "UUID_PENDING_PROVIDERA",
    "reason": "Production smoke test"
  }'

# Očekáváno: 
# {"success":true,"audit_log_id":"..."}
# HTTP: 200
```

**Ověření v DB:**
1. Supabase dashboard → SQL Editor
2. Spustit:

```sql
-- Ověřit audit log
SELECT * FROM admin_audit_logs 
ORDER BY created_at DESC 
LIMIT 1;

-- Ověřit změnu statusu providera
SELECT id, status FROM providers 
WHERE id = 'UUID_TOHO_PROVIDERA';
-- Status by měl být 'approved'
```

---

## TEST 4: Rate Limiting (volitelné, 1 min)

```bash
# Rychlé 21 requestů
for i in {1..21}; do
  STATUS=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST https://bkyokcjpelqwtndienos.supabase.co/functions/v1/admin_action \
    -H "Authorization: Bearer VÁŠ_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"action":"approve_provider","target_id":"fake-uuid"}')
  echo "Request $i: $STATUS"
done

# Očekáváno:
# Requesty 1-20: 400 (invalid UUID, ale projde rate limitem)
# Request 21: 429 (rate limit exceeded)
```

---

## ✅ PASS CRITERIA

| Test | Expected | Status |
|------|----------|--------|
| Get token | Success | ⬜ |
| 401 no auth | 401 | ⬜ |
| 400 invalid action | 400 | ⬜ |
| 400 invalid UUID | 400 | ⬜ |
| 200 approve | 200 + audit log | ⬜ |
| 429 rate limit | 429 on 21st req | ⬜ |

---

## 🚨 IF FAIL

**500 errors:**
- Check edge function logs: `supabase functions logs admin_action`
- Check DB migrations applied
- Možná potřeba redeploy edge function

**Rate limiting nefunguje:**
- Check `admin_rate_limits` table exists
- Check migration 20260110120001 applied

**Audit log nevznikl:**
- Check RPC function `check_admin_rate_limit` exists
- Check edge function code calls audit insert

---

**Čas celkem:** 5-7 minut  
**Priorita:** 🟡 MEDIUM (funkčnost, ne security)  
**Můžete to udělat zítra:** ✅ Ano
