# 🐛 Debug Provider Onboarding - Complete Checklist

## 📋 Pre-Flight Check

Before testing with a new user, verify these prerequisites:

### 1. Environment Variables
```bash
# Check .env file exists and has values
cat .env
```
Expected output:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 2. Database Migrations
Run in Supabase SQL Editor:
```sql
-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check RLS policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'providers';
```

Expected output:
- Trigger: `on_auth_user_created` on `auth.users`
- Policies:
  - `Anyone can view verified providers`
  - `Providers can insert own data`
  - `Providers can update own data`

### 3. Verify Provider Table Columns
Run `verify_providers_columns.sql` in Supabase SQL Editor.

Required columns:
- ✅ id
- ✅ user_id
- ✅ rental_name
- ✅ contact_name
- ✅ email
- ✅ phone
- ✅ company_id
- ✅ address
- ✅ location
- ✅ country
- ✅ category
- ✅ time_zone
- ✅ currency
- ✅ website (nullable)
- ✅ seasonal_mode
- ✅ onboarding_completed
- ✅ onboarding_step
- ✅ status
- ✅ verified
- ✅ current_season

---

## 🧪 Test Procedure

### Step 1: Clear Previous State
```bash
# In browser console
localStorage.clear();
# Refresh page
```

### Step 2: Sign Up New Provider
1. Navigate to `/signup`
2. Fill in:
   - Email: `test-provider-debug@kitloop.cz`
   - Password: `test123456`
   - Role: **Provider** (radio button)
3. Click "Create Account"

**Expected:**
- ✅ Console: `📝 Sign up attempt for: test-provider-debug@kitloop.cz with role: provider`
- ✅ Console: `📦 Supabase signup response: { user: {...}, error: null }`
- ✅ Console: `✅ Profile fetched: { role: 'provider', ... }`
- ✅ Redirect to `/provider/setup`

**If error:**
- Check console for error details
- Verify email not already registered

### Step 3: Complete Onboarding Steps 1-3

**Step 1 - Company Info:**
- Rental name: `Testovací Půjčovna`
- Contact person: `Jan Novák`
- IČO: `12345678`
- Click "Continue"

**Step 2 - Location:**
- Address: `Testovací 123`
- City: `České Budějovice`
- Country: `Czech Republic`
- Phone: `+420 123 456 789`
- Click "Continue"

**Step 3 - Business Details:**
- Select some categories (optional)
- Click "Complete Setup"

### Step 4: Monitor Complete Setup Button

**Click "Complete Setup →"**

Watch browser console carefully for this sequence:

```
🎯 Completing provider setup for user: 41a67ada-7a63-4460-a2fd-74ef1d3bfa16
📝 Inserting provider data: { user_id: "...", rental_name: "...", ... }
📦 Supabase INSERT response: {
  insertedProvider: { ... },
  insertError: null,
  errorCode: undefined,
  errorMessage: undefined
}
✅ Provider created successfully: { id: "...", rental_name: "...", ... }
🔄 Refreshing profile to load provider data...
```

**Then should redirect to `/provider/dashboard`**

---

## ❌ Common Errors & Fixes

### Error Code: `42501` (Permission Denied)

**Console:**
```
❌ Provider insert failed: {
  code: "42501",
  message: "new row violates row-level security policy"
}
```

**Cause:** RLS policy missing or incorrect

**Fix:**
```sql
-- In Supabase SQL Editor
DROP POLICY IF EXISTS "Providers can insert own data" ON public.providers;

CREATE POLICY "Providers can insert own data"
  ON public.providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

### Error Code: `23505` (Duplicate Key)

**Console:**
```
❌ Provider insert failed: {
  code: "23505",
  message: "duplicate key value violates unique constraint"
}
```

**Cause:** Provider record already exists for this user

**Fix:**
```sql
-- Delete existing provider record
DELETE FROM public.providers WHERE user_id = 'your-user-id';
```

Or use a new test user email.

---

### Error Code: `23502` (NOT NULL Violation)

**Console:**
```
❌ Provider insert failed: {
  code: "23502",
  message: "null value in column X violates not-null constraint"
}
```

**Cause:** Required field missing

**Fix:**
1. Check which column is missing in error details
2. Update ProviderSetup.tsx to include that field
3. Or make column nullable in database

---

### Error Code: `42703` (Column Does Not Exist)

**Console:**
```
❌ Provider insert failed: {
  code: "42703",
  message: "column X of relation providers does not exist"
}
```

**Cause:** ProviderSetup.tsx trying to insert into non-existent column

**Fix:**
```sql
-- Add missing column (example for current_season)
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS current_season TEXT DEFAULT 'all-year';
```

Or remove that field from providerData in ProviderSetup.tsx.

---

### No Error, Just Hangs Forever

**Console shows:**
```
📝 Inserting provider data: { ... }
(nothing after this)
```

**Possible causes:**
1. Network timeout
2. Supabase project paused/disabled
3. CORS issue
4. Invalid Supabase credentials

**Fix:**
1. Check Supabase Dashboard → Project is active
2. Check Network tab in browser DevTools
3. Verify `.env` credentials are correct
4. Check Supabase → Logs for any errors

---

## ✅ Success Criteria

After completing onboarding, verify:

### 1. Database Record Created
```sql
SELECT * FROM public.providers
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'test-provider-debug@kitloop.cz'
);
```

Expected:
- ✅ One record returned
- ✅ `rental_name` = "Testovací Půjčovna"
- ✅ `onboarding_completed` = true
- ✅ `verified` = false

### 2. Console Logs Clean
- ✅ No errors in console
- ✅ All logs show success (✅ emoji)

### 3. Redirect Behavior

**If verified = false (expected):**
- Redirects to `/provider/verify` page
- Shows "Your account is pending verification"

**If verified = true (after manual update):**
- Stays on `/provider/dashboard`
- Shows dashboard UI

---

## 🔧 Manual Verification Bypass (Testing Only)

To test dashboard access without admin verification:

```sql
-- Set provider as verified
UPDATE public.providers
SET verified = true
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'test-provider-debug@kitloop.cz'
);
```

Then refresh browser. Should stay on `/provider/dashboard`.

---

## 📊 Full Debug Log Example (Success)

```
🔧 Initializing auth...
🔍 Checking for existing session...
📦 Existing session found: test-provider-debug@kitloop.cz
📝 Fetching profile for user: 41a67ada-7a63-4460-a2fd-74ef1d3bfa16
✅ Profile fetched: { role: 'provider', ... }
👤 User is provider, fetching provider data...
ℹ️ No provider record yet (user is in onboarding)
✅ Auth initialized with existing session
🏁 Auth initialization complete

[User completes onboarding form...]

🎯 Completing provider setup for user: 41a67ada-7a63-4460-a2fd-74ef1d3bfa16
📝 Inserting provider data: {
  user_id: "41a67ada-7a63-4460-a2fd-74ef1d3bfa16",
  rental_name: "Testovací Půjčovna",
  contact_name: "Jan Novák",
  email: "test-provider-debug@kitloop.cz",
  phone: "+420 123 456 789",
  company_id: "12345678",
  address: "Testovací 123",
  location: "České Budějovice",
  country: "CZ",
  category: "Ferraty & Via Ferrata, Climbing & Mountaineering",
  time_zone: "Europe/Prague",
  currency: "CZK",
  website: null,
  seasonal_mode: false,
  onboarding_completed: true,
  onboarding_step: 4,
  status: "pending",
  verified: false,
  current_season: "all-year"
}
📦 Supabase INSERT response: {
  insertedProvider: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    user_id: "41a67ada-7a63-4460-a2fd-74ef1d3bfa16",
    rental_name: "Testovací Půjčovna",
    ...
  },
  insertError: null,
  errorCode: undefined,
  errorMessage: undefined
}
✅ Provider created successfully!
🔄 ProviderRoute: No provider data, refreshing...
📝 Fetching profile for user: 41a67ada-7a63-4460-a2fd-74ef1d3bfa16
✅ Profile fetched: { role: 'provider', ... }
👤 User is provider, fetching provider data...
✅ Provider data fetched: { rental_name: "Testovací Půjčovna", verified: false, ... }
⚠️ Provider not verified, redirecting to verify page
```

---

## 🎯 Next Steps After Successful Test

1. ✅ Provider onboarding works
2. Create `/provider/verify` page (pending verification screen)
3. Create admin panel to verify providers
4. Test full flow: signup → onboarding → verify → dashboard

---

**Good luck debugging! 🚀**
