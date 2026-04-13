# Admin Onboarding Runbook

Internal 10-step checklist for approving and supporting a new rental partner during pilot onboarding.

---

## Checklist

### 1. Confirm the partner has signed up
- Check Supabase Dashboard → **Table Editor** → `providers`.
- Filter: `status = 'pending'`.
- Or use the app: **Admin** → **Provider Approvals** (lists all pending providers).

### 2. Verify provider record looks complete
- `rental_name`, `email`, `phone`, `location` are filled in.
- `user_id` is set (linked to an auth user).
- `verified = false`, `status = 'pending'` — expected at this stage.

### 3. Approve the provider
- In the app: **Admin** → **Provider Approvals** → click **Approve** next to the provider.
- This calls the `admin_action` Edge Function (`supabase/functions/admin_action/index.ts`, line 218), which invokes the RPC `public.admin_approve_provider` defined in `supabase/migrations/20260110120001_admin_action_hardening_fixed.sql` (line 187).
- What the RPC sets atomically (single transaction):
  - `providers.status = 'approved'`
  - `providers.verified = true`
  - `providers.approved_at = now()`
  - Inserts a row into `admin_audit_logs`.
- Requires `profiles.role = 'admin'` for the acting user (enforced inside the RPC at line 202–208 of the migration).
- Rate limit: 20 admin actions / 60 s (DB-enforced via `admin_rate_limits` table).

### 4. RLS sanity check
- In Supabase SQL Editor, run as the provider's `user_id` (or use the anon key with their JWT):
  ```sql
  -- Should return exactly their own provider row
  SELECT id, rental_name, status FROM providers WHERE user_id = '<their-user-id>';
  ```
- Should return 1 row with `status = 'approved'`.
- Should NOT return other providers' rows.

### 5. Confirm provider is visible in the app
- Log in as the provider (or ask them to refresh).
- They should land on `/provider/dashboard`, not a "pending approval" screen.
- The onboarding checklist widget should be visible.

### 6. Confirm they can add inventory
- Provider navigates to **Inventory** → **Add Product**.
- Creates a product + variant + at least one asset.
- Asset appears with `status = 'available'` in `assets` table.

### 7. Confirm they can create a reservation
- Provider navigates to **Reservations** → **New Reservation**.
- Selects their product/variant, picks dates, enters customer info.
- Reservation is created with `status = 'confirmed'` (or `'pending'`).

### 8. Confirm issue and return work
- Issue: reservation detail → **Issue to Customer** → status becomes `active`.
- Return: reservation detail → **Accept Return** → status becomes `completed`, asset back to `available`.

### 9. Notify the partner
- Send a confirmation email that their account is approved and they can log in.
- Include the support email: **support@kitloop.cz**.

### 10. Log the onboarding
- Note the provider ID, approval date, and any issues encountered.
- File under your internal onboarding log or ticket.

---

## Troubleshooting Top 5 Issues

### 1. Login redirect loop / stuck on login page
- **Check**: Supabase Auth → confirm the user's email is confirmed (`confirmed_at` is set).
- **Check**: `providers.user_id` matches `auth.users.id` for their account.
- **Fix**: If email not confirmed, resend confirmation from Supabase Auth dashboard.
- **Fix**: If `user_id` is null, update manually: `UPDATE providers SET user_id = '<auth-uid>' WHERE email = '<email>';`

### 2. Provider missing from Provider Approvals list
- **Check**: `providers` table — does a row exist for their email?
- **Check**: `status` value — if already `'approved'` or `'rejected'`, it won't appear in the pending list.
- **Fix**: If no row exists, the setup wizard was not completed. Ask the partner to log in and complete `/provider/setup`.

### 3. Provider stuck on "pending approval" screen after approval
- **Check**: `providers.status` — confirm it is `'approved'` and `verified = true`.
- **Check**: Supabase Edge Function logs for `admin_action` — look for errors.
- **Fix**: If the RPC failed, approve manually:
  ```sql
  UPDATE providers SET status = 'approved', verified = true, approved_at = now()
  WHERE id = '<provider-id>';
  ```
  Then insert an audit log entry manually if needed.

### 4. No availability / can't create reservation
- **Check**: At least one asset exists for the variant with `status = 'available'`.
- **Check**: No overlapping `active` reservations consuming all assets for the requested dates.
- **Fix**: In `assets` table, verify `provider_id` matches the provider and `status = 'available'`.
- **Fix**: Check `reservations` for stuck `active` records that were never returned.

### 5. CSV export or print not working
- **CSV**: Check browser console for network errors. The export is client-side; confirm the provider has at least one completed reservation.
- **Print**: Uses browser print dialog. Ask the provider to try Chrome. Confirm the reservation detail page loads fully before printing.
- **Fix**: If data is missing from export, check RLS — the provider's JWT must match `provider_id` on reservations.
