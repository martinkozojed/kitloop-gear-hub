# P0 Fixes - Local Setup & Testing Guide

**Quick start guide for testing P0 security fixes locally**

---

## 🚀 Quick Setup (5 minutes)

### 1. Apply Database Migration

```bash
# From project root
cd /path/to/kitloop-gear-hub-main

# Apply migration
supabase migration up

# Verify tables created
supabase db diff
```

**Expected output:**
```
Applied migration: 20260110120000_admin_action_hardening.sql
Created tables: admin_audit_logs, admin_rate_limits
Created functions: check_admin_rate_limit, admin_approve_provider, admin_reject_provider
```

---

### 2. Install Frontend Dependencies

```bash
# Install new logger dependency (if needed)
npm install

# Build for production test
npm run build
```

---

### 3. Create Test Admin User

**Option A: Via Supabase Dashboard**
1. Go to: Authentication → Users
2. Create user: `admin@test.cz`
3. Go to: Database → profiles table
4. Set `role = 'admin'` or `is_admin = true` for this user

**Option B: Via SQL**
```sql
-- 1. Create auth user (if not exists)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@test.cz', crypt('AdminPass123', gen_salt('bf')), now());

-- 2. Create profile
INSERT INTO public.profiles (user_id, role, is_admin, created_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@test.cz'),
  'admin',
  true,
  now()
);
```

---

### 4. Get Auth Tokens

**For Testing:**

```javascript
// Login via app, then in browser console:
const token = localStorage.getItem('kitloop-auth-token');
console.log(token);
```

**Or via cURL:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.cz",
    "password": "AdminPass123"
  }'
```

---

## 🧪 Run Quick Smoke Test

### Test 1: Invalid Payload (should fail with 400)
```bash
curl -X POST http://localhost:54321/functions/v1/admin_action \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "invalid"}' | jq
```

**Expected:** `400` with validation error

---

### Test 2: Admin Approval (should succeed)

**First, get a provider ID:**
```sql
SELECT id, rental_name, status FROM public.providers LIMIT 1;
```

**Then approve:**
```bash
curl -X POST http://localhost:54321/functions/v1/admin_action \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_provider",
    "target_id": "PROVIDER_UUID_HERE",
    "reason": "Local test approval"
  }' | jq
```

**Verify:**
```sql
-- Check provider updated
SELECT id, status, verified FROM public.providers WHERE id = 'PROVIDER_UUID';

-- Check audit log created
SELECT * FROM public.admin_audit_logs ORDER BY created_at DESC LIMIT 1;
```

---

### Test 3: Rate Limit (should throttle after 20)

```bash
# Spam 25 requests
for i in {1..25}; do
  echo "Request $i"
  curl -s -X POST http://localhost:54321/functions/v1/admin_action \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"approve_provider\", \"target_id\": \"PROVIDER_UUID\"}" \
    | jq -r '.error // "OK"'
  sleep 0.3
done
```

**Expected:** First 20 = "OK", then "Too many admin actions..."

---

### Test 4: Frontend PII Check

```bash
# Build production
npm run build

# Search for PII in build artifacts
grep -ri "console.log.*email" dist/
grep -ri "console.log.*phone" dist/

# Should return: NO RESULTS
```

**Start preview:**
```bash
npm run preview
# Open http://localhost:4173
# Login as test user
# Check browser console → should be silent (no logs)
```

---

## 🔍 Debugging Common Issues

### Issue 1: "Function not found"
```bash
# Ensure Edge Function is deployed locally
supabase functions serve admin_action

# Or start all functions
supabase start
```

---

### Issue 2: "Missing admin_audit_logs table"
```bash
# Check migration applied
supabase migration list

# If not applied:
supabase migration up
```

---

### Issue 3: "User is not admin" (but they are)
```sql
-- Verify user's admin status
SELECT u.email, p.role, p.is_admin
FROM auth.users u
JOIN public.profiles p ON p.user_id = u.id
WHERE u.email = 'admin@test.cz';

-- Should show: role='admin' OR is_admin=true
```

---

### Issue 4: Rate limit not working
```sql
-- Check rate limit table
SELECT * FROM public.admin_rate_limits;

-- Manually reset if needed
DELETE FROM public.admin_rate_limits WHERE admin_id = 'YOUR_ADMIN_UUID';
```

---

## 📊 Verification Checklist

Before marking as complete:

- [ ] Database migration applied successfully
- [ ] Tables `admin_audit_logs` and `admin_rate_limits` exist
- [ ] RPC functions callable: `check_admin_rate_limit`, `admin_approve_provider`
- [ ] Admin user can approve/reject providers
- [ ] Non-admin user gets 403 Forbidden
- [ ] Invalid payload gets 400 with Zod errors
- [ ] Rate limit triggers after 20 requests
- [ ] Audit logs created atomically with provider updates
- [ ] Production build has no `console.log` with PII
- [ ] Error messages don't leak DB structure

---

## 🎯 Next Steps

1. ✅ Complete local testing
2. ✅ Run full smoke test protocol (`P0_FIXES_SMOKE_TEST.md`)
3. 🚀 Deploy to staging
4. 🧪 Re-run smoke tests on staging
5. 🚀 Deploy to production
6. 📊 Monitor for 24h

---

## 💡 Tips

**Fast iteration:**
```bash
# Terminal 1: Watch Edge Functions
supabase functions serve --inspect-mode

# Terminal 2: Watch frontend
npm run dev

# Terminal 3: Database client
supabase db diff --linked
```

**Reset everything:**
```bash
supabase db reset
supabase migration up
npm run build
```

---

**Questions?** See `P0_FIXES_IMPLEMENTATION_SUMMARY.md` for detailed architecture.
