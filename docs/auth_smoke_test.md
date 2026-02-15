# Auth & Approval Smoke Test - PR1

## Prerequisites

- Clean Supabase project (or ability to delete test providers)
- Supabase Studio access (for manual approval step)
- Local dev server running on <http://localhost:8080> (or 5173 for standard Vite)
- Local Supabase running (`supabase start`) with Mailpit on port 54324
- Production site accessible at <https://kitloop.cz> (or staging URL)

---

## Test 1: Pending Provider Blocked from Core Features

### Steps

1. Navigate to <http://localhost:5173/signup>
2. Create new provider account:
   - Email: `test-pending-pr1@example.com`
   - Password: `TestPass123!`
   - Complete signup form
3. Verify redirect to `/provider/setup`
4. Complete ProviderSetup form (rental name, contact info, etc.)
5. Submit setup form

**EXPECTED RESULT**:

- Redirect to `/provider/dashboard` with pending overlay
- Pending message displays in Czech: "Čekáme na schválení"
- "Očekávaná doba: do 24 hodin" message visible
- Overlay blocks all interaction with dashboard

1. Attempt to navigate to `/provider/inventory` (type URL manually in address bar)

**EXPECTED RESULT**:

- **IMMEDIATE REDIRECT** to `/provider/dashboard` (no access to inventory)
- Overlay still blocks interaction

1. Attempt to navigate to `/provider/reservations` (type URL manually)

**EXPECTED RESULT**:

- **IMMEDIATE REDIRECT** to `/provider/dashboard` (no access to reservations)
- Overlay still blocks interaction

1. Attempt to navigate to `/provider/settings` (type URL manually)

**EXPECTED RESULT**:

- **IMMEDIATE REDIRECT** to `/provider/dashboard` (no access to settings)

1. Navigate to `/provider/pending` (type URL manually)

**EXPECTED RESULT**:

- Pending page loads WITHOUT overlay (clean view)
- Shows Czech pending message and support contact button

1. Click "Kontaktovat podporu" button

**EXPECTED RESULT**:

- Opens email client with:
  - To: <support@kitloop.cz>
  - Subject: "Schválení účtu"
  - Body: Pre-filled Czech message

---

## Test 2: Approved Provider Gains Full Access

### Steps

1. Open Supabase Studio → Authentication → Users
2. Find user `test-pending-pr1@example.com`
3. Copy user UUID
4. Open SQL Editor and run:

   ```sql
   UPDATE providers 
   SET status = 'approved', approved_at = NOW() 
   WHERE user_id = '<UUID>';
   ```

5. Refresh browser on `/provider/dashboard` page

**EXPECTED RESULT**:

- Overlay DISAPPEARS
- Full dashboard access restored
- No more pending message

1. Navigate to `/provider/inventory`

**EXPECTED RESULT**:

- Inventory page loads successfully
- Can click "Add Item" button
- No redirect, no blocking

1. Navigate to `/provider/reservations`

**EXPECTED RESULT**:

- Reservations page loads successfully
- Can click "New Reservation" button

1. Navigate to `/provider/settings`

**EXPECTED RESULT**:

- Settings page loads successfully

1. Logout and login again with same account

**EXPECTED RESULT**:

- After login, redirects to `/provider/dashboard`
- No pending overlay
- Full access maintained

---

## Test 3: Password Reset Flow (LOCAL)

### Steps

1. Navigate to <http://localhost:5173/login>
2. Look for "Forgot Password" link or similar

**EXPECTED RESULT**:

- Password reset link/button exists and is visible

1. Click "Forgot Password"

**EXPECTED RESULT**:

- Shows password reset form with email input field

1. Enter email: `test-pending-pr1@example.com`
2. Submit form

**EXPECTED RESULT**:

- Success message displays: "Password reset email sent" (or similar)
- No errors

1. Check email inbox:
   - **Local dev**: Check Mailpit at <http://localhost:54324>
   - Look for password reset email

2. Open password reset email
3. Inspect the reset link URL

**CRITICAL CHECK**:

- Reset link MUST contain: `redirect_to=http://localhost:8080` or `http://localhost:5173`  
  (depends on `site_url` in `supabase/config.toml`)
- If link contains production domain instead → **CONFIGURATION ERROR**  
  (check `supabase/config.toml` [auth] section)

1. Click reset link

**EXPECTED RESULT**:

- Redirects to `http://localhost:5173/...` (LOCAL domain)
- Shows "Set New Password" form

1. Enter new password: `NewPass456!`
2. Confirm password: `NewPass456!`
3. Submit

**EXPECTED RESULT**:

- Success message: "Password updated"
- Either auto-logged in OR redirected to login page

1. Logout (if logged in)
2. Login with NEW password: `NewPass456!`

**EXPECTED RESULT**:

- Login successful
- Redirects to `/provider/dashboard`

---

## Test 4: Password Reset Flow (PRODUCTION) 🔴 HARD GATE

**CRITICAL**: This test MUST pass before PR1 can be merged to production.

### Supabase Redirect URL Configuration

**Before starting this test, verify Supabase configuration:**

1. Open Supabase Studio (cloud dashboard)
2. Navigate to: **Authentication** → **URL Configuration**
3. Locate section: **Redirect URLs**
4. Ensure the following patterns are added:

```
http://localhost:5173/**
http://127.0.0.1:5173/**
https://kitloop.cz/**
https://*.netlify.app/**
```

1. Click "Save" if any changes made
2. Wait ~1 minute for config to propagate

### Test Steps (Production)

1. Navigate to **<https://kitloop.cz/login>** (production domain)
2. Click "Forgot Password"
3. Enter test email (you may need to create a test account first on production):
   - Option A: Use existing pilot account email
   - Option B: Sign up new test account on production first

4. Submit password reset form

**EXPECTED RESULT**:

- Success message displays

1. Check REAL email inbox (not Inbucket - this is production)
2. Open password reset email
3. **CRITICAL INSPECTION**: Check the reset link URL

**PASS CRITERIA**:

- ✅ Link contains: `redirect_to=https://kitloop.cz` (production domain)
- ❌ If link contains `localhost` → **FAIL** - Redirect URLs misconfigured

1. Click reset link in email

**EXPECTED RESULT**:

- Browser redirects to `https://kitloop.cz/...` (PRODUCTION domain)
- Shows "Set New Password" form on production site

1. Set new password
2. Submit

**EXPECTED RESULT**:

- Password updated successfully
- Can login with new password on production

### If Test 4 Fails

**Symptom**: Email link redirects to `localhost` instead of production

**Root Cause**: Supabase redirect URL configuration issue

**Fix Steps**:

1. Check Supabase Studio → Authentication → URL Configuration
2. Verify `https://kitloop.cz/**` is in redirect URL list
3. Check for typos in domain
4. Save configuration
5. Re-test password reset flow
6. If still failing, check Supabase project settings (correct project linked?)

**BLOCKER**: PR1 cannot merge until this test passes. Password reset on production is a hard MVP requirement.

---

## Test 5: RLS Isolation (Bonus - Cross-Provider Check)

**Optional but Recommended**: Verify Row Level Security prevents cross-provider data access.

### Steps

1. Create Provider A account: `provider-a-pr1@example.com`
2. Approve Provider A in Supabase:

   ```sql
   UPDATE providers 
   SET status = 'approved', approved_at = NOW() 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'provider-a-pr1@example.com');
   ```

3. Login as Provider A
4. Navigate to `/provider/inventory`
5. Create 1 inventory item: "Test Snowboard A"
6. Note the item appears in inventory list
7. Logout

8. Create Provider B account: `provider-b-pr1@example.com`
9. Approve Provider B in Supabase (same SQL, different email)
10. Login as Provider B
11. Navigate to `/provider/inventory`

**EXPECTED RESULT**:

- Inventory list is **EMPTY**
- Does NOT show "Test Snowboard A"
- Provider B can only see their own items

1. Create inventory item as Provider B: "Test Bike B"
2. Verify only "Test Bike B" appears in Provider B's inventory

3. Logout, login as Provider A
4. Navigate to `/provider/inventory`

**EXPECTED RESULT**:

- Only "Test Snowboard A" appears
- Does NOT show "Test Bike B"

**If RLS Test Fails**:

- **RED ALERT** - Do NOT merge PR1
- RLS policies are broken
- Escalate to security review
- Run `supabase/tests/rls_*` test scripts

---

## Supabase Configuration Reference

### 🔴 CRITICAL: LOCAL vs CLOUD Configuration

**There are TWO separate configurations for password reset redirect URLs:**

#### 1. LOCAL Configuration (Development Only)

**File**: `supabase/config.toml`  
**Purpose**: Controls password reset redirects when running `supabase start` locally  
**Scope**: LOCAL development ONLY (not used in production)

**Current local config** (supports both dev server ports):

```toml
[auth]
site_url = "http://localhost:8080"
additional_redirect_urls = [
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173"
]
```

> **Note**: Port 8080 is the current dev server port. Port 5173 is the standard Vite default.  
> Both are included for flexibility during local development.

**⚠️ This config does NOT affect production!** Production uses Supabase Cloud settings.

---

#### 2. PRODUCTION Configuration (Supabase Cloud)

**Where**: Supabase Studio (cloud dashboard)  
**Purpose**: Controls password reset redirects for PRODUCTION environment  
**Scope**: Production/staging deployments

**Required redirect URL patterns for production**:

```
http://localhost:5173/**
http://localhost:8080/**
http://127.0.0.1:5173/**
http://127.0.0.1:8080/**
https://kitloop.cz/**
https://*.netlify.app/**
```

**Configuration steps**:

1. Visit <https://supabase.com/dashboard>
2. Select your project: **kitloop** (bkyokcjpelqwtndienos)
3. Navigate to: **Authentication** → **URL Configuration**
4. Locate section: **Redirect URLs**
5. Add ALL patterns above (including localhost variants for local testing with cloud project)
6. Click **Save**
7. Wait ~1 minute for config to propagate

### Environment Variables

**Frontend (.env / .env.local)**:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public anon key

**Netlify Environment Variables**:

- Set in Netlify dashboard → Site Settings → Environment Variables
- Same keys as above
- Must match production Supabase project

---

## Pass/Fail Criteria

### PR1 PASSES IF

- [ ] Test 1: Pending provider blocked from all core routes (inventory, reservations, settings)
- [ ] Test 1: Deep links (manual URL typing) redirect to dashboard
- [ ] Test 1: No redirect loops observed
- [ ] Test 1: Czech copy displays correctly on pending screen
- [ ] Test 2: Approved provider gains full access immediately
- [ ] Test 3: Password reset works on LOCAL environment
- [ ] **Test 4: Password reset works on PRODUCTION** 🔴 **BLOCKER**
- [ ] Test 5: RLS isolation verified (optional but recommended)
- [ ] No console errors during any auth flow

### PR1 FAILS IF

- ❌ Pending provider can access `/provider/inventory` via deep link
- ❌ Pending provider can access `/provider/reservations` via deep link
- ❌ Approved provider remains blocked after SQL approval
- ❌ Password reset email link redirects to wrong domain
- ❌ Password reset fails on production
- ❌ RLS allows Provider A to see Provider B's data
- ❌ Redirect loops trap user on pending screen
- ❌ English copy displays instead of Czech

---

## Evidence to Capture

**For PR Review**:

1. Screenshot: Pending screen with Czech copy
2. Screenshot: Pending screen email client with pre-filled Czech message
3. Screenshot: Dashboard with overlay visible
4. Screenshot: Password reset email (local) showing `localhost:5173` redirect
5. Screenshot: Password reset email (production) showing `kitloop.cz` redirect
6. Console logs: No errors during pending gate flow
7. SQL query result: Provider approval status change

**For Deployment Checklist**:

- [ ] Supabase redirect URLs configured (screenshot)
- [ ] Production password reset tested successfully (confirmation email)
- [ ] Netlify env vars match Supabase project (checklist)

---

**End of auth_smoke_test.md**
