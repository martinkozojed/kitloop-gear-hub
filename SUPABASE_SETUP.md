# Supabase Authentication Setup Guide

This guide will help you set up real Supabase authentication for the Kitloop Gear Hub application.

## Prerequisites

1. A Supabase project (create one at https://supabase.com if you haven't)
2. Your database tables should already exist:
   - `auth.users` (built-in Supabase)
   - `public.profiles`
   - `public.providers`
   - `public.gear_items`
   - `public.reservations`

## Step 1: Configure Environment Variables

1. Copy `.env.example` to `.env` if you haven't already:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials in `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   Find these values in:
   - Supabase Dashboard → Project Settings → API
   - URL: "Project URL"
   - Anon Key: "Project API keys" → "anon" → "public"

## Step 2: Run Database Migrations

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Open the file `supabase_migrations.sql` from this repository
4. Copy and paste the entire content into the SQL Editor
5. Click "Run" to execute all migrations

The migration script will:
- ✅ Create a trigger to automatically create profiles on user signup
- ✅ Set up Row Level Security (RLS) policies for all tables
- ✅ Configure proper access control for customers and providers

## Step 3: Install Dependencies

Make sure you have the Supabase client installed:

```bash
npm install @supabase/supabase-js
```

## Step 4: Test the Authentication System

### Test Signup (Customer)
1. Navigate to `/signup`
2. Select "Customer" as account type
3. Enter email and password
4. Submit the form
5. Check Supabase Dashboard → Authentication → Users
6. Verify a new user was created
7. Check Database → profiles table
8. Verify a profile with `role='customer'` was created

### Test Signup (Provider)
1. Navigate to `/signup`
2. Select "Provider" as account type
3. Enter email and password
4. Submit the form
5. Should redirect to `/provider/setup` (provider onboarding flow)

### Test Login
1. Navigate to `/login`
2. Enter your credentials
3. Should redirect to homepage on success
4. Try wrong password → should show error message
5. Try non-existent email → should show error message

### Test Logout
1. Click logout button
2. Should redirect to homepage
3. Should not be able to access protected routes

### Test RLS (Row Level Security)
1. Sign in as a provider
2. Create some gear items
3. Sign out and sign in as different provider
4. Verify you cannot see or edit other provider's gear
5. Verify customers can view active gear but not edit

## Features Implemented

✅ **Real Supabase Authentication**
- Email/password signup and login
- Automatic profile creation
- Role-based access (customer, provider, admin)

✅ **Enhanced Login**
- Proper error handling for wrong credentials
- Toast notifications for user feedback
- No localStorage (Supabase manages sessions)

✅ **Enhanced Signup**
- Role selection (Customer vs Provider)
- Password validation (min 6 characters)
- Password confirmation
- Redirect based on role after signup

✅ **Protected Routes**
- `ProviderRoute` checks for provider role and verification
- Redirects non-providers to homepage
- Redirects unverified providers to verification page

✅ **Row Level Security**
- Users can only view/edit their own data
- Providers can only manage their own gear
- Customers can only view their own reservations
- Verified providers visible to all (marketplace)

## Troubleshooting

### "Missing Supabase environment variables" error
- Check that `.env` file exists and contains correct values
- Restart dev server after updating `.env`

### Profile not created after signup
- Check SQL Editor for errors when running migrations
- Verify the trigger `on_auth_user_created` exists
- Check Supabase Dashboard → Database → Triggers

### RLS blocking legitimate access
- Check the policies in Supabase Dashboard → Authentication → Policies
- Make sure you're logged in as the correct user
- Check browser console for specific RLS error messages

### Email confirmation required
- In Supabase Dashboard → Authentication → Settings
- Disable "Enable email confirmations" for development
- Enable it for production

### Provider onboarding hangs on "Finishing..." (Step 4)

**Symptoms:**
- Click "Complete Setup" button
- Button shows "Finishing..." loading state forever
- No error message shown
- Console log shows "Inserting provider data" but nothing after

**Debug Steps:**

1. **Check browser console for detailed error:**
   - Look for: `📦 Supabase INSERT response:`
   - Check `errorCode`, `errorMessage`, `errorDetails`

2. **Common error codes:**
   - `42501` - RLS permission denied
     - **Fix:** Verify RLS policies exist (see migrations above)
   - `23505` - Duplicate key (provider already exists)
     - **Fix:** Delete existing provider record or use new user
   - `23502` - NOT NULL violation
     - **Fix:** Check all required fields are filled
   - `42703` - Column does not exist
     - **Fix:** Verify all columns exist in providers table

3. **Verify columns exist:**
   - Run `verify_providers_columns.sql` in Supabase SQL Editor
   - Compare with required columns in ProviderSetup.tsx

4. **Test RLS policies:**
   ```sql
   -- In Supabase SQL Editor, test as authenticated user
   SELECT * FROM public.providers WHERE user_id = auth.uid();
   ```

5. **Check Supabase logs:**
   - Dashboard → Logs → Postgres Logs
   - Look for INSERT errors with timestamps

### Provider onboarding succeeds but dashboard redirects back

**Symptoms:**
- Provider record created successfully
- Redirects to `/provider/dashboard`
- Immediately redirects back to `/provider/setup` or `/provider/verify`

**Fix:**
- Check `verified` column in provider record (should be `false` initially)
- ProviderRoute expects `verified = false` → redirects to `/provider/verify`
- This is **expected behavior** - providers need admin verification

**Temporary bypass for testing:**
- Manually set `verified = true` in Supabase:
  ```sql
  UPDATE public.providers
  SET verified = true
  WHERE user_id = 'your-user-id';
  ```

## Next Steps

1. **Provider Onboarding Flow**: Create `/provider/setup` page for new providers
2. **Email Verification**: Configure email templates in Supabase
3. **Password Reset**: Implement forgot password functionality
4. **Social Auth**: Add Google/GitHub/Apple login (optional)
5. **Admin Panel**: Create admin routes for user management

## Security Notes

- ⚠️ Never commit `.env` file to git
- ⚠️ Use environment-specific keys (dev vs production)
- ⚠️ Enable email confirmation in production
- ⚠️ Set up rate limiting for authentication endpoints
- ⚠️ Monitor authentication logs in Supabase Dashboard

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs
2. Check browser console for errors
3. Verify all migrations ran successfully
4. Check that RLS policies are enabled

---

**Implementation completed!** 🎉

All authentication logic has been moved from mock/localStorage to real Supabase Auth with proper database integration and security policies.
