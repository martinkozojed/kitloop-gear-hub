# PR3-A: Schema & Storage Readiness

**Why**: Prepares the database and storage for secure Provider Inventory CRUD.

**What**:

- [Schema] Added `deleted_at` (soft delete) to `gear_items` and `gear_images`.
- [Schema] Added `provider_id` to `gear_images` + backfill from parent items.
- [Schema] Added missing Foreign Keys and Indexes (`provider_id`, `deleted_at`).
- [RLS] Enabled RLS on `gear_items` and `gear_images`.
  - **Select/Insert/Update**: Restricted to **Approved & Verified** Provider Owners only.
  - **Delete**: Disabled for authenticated users (enforcing soft delete).
- [Storage] Configured policies for `gear-images` bucket:
  - Allowed operations (Select, Insert, Delete) for authenticated users ONLY if:
    - Path matches `providers/<provider_id>/*`
    - User owns the provider (`providers.user_id = auth.uid()`)
    - Provider is `approved` AND `verified`.

**Verify**:

1. Run the migration `supabase/migrations/20260216223000_pr3_a_schema_storage.sql` locally or in Supabase.
2. Run `docs/pr3a_verification.sql` (as superuser/simulated role) to confirm:
   - [ ] Unapproved/Unverified providers cannot insert items (RLS error).
   - [ ] Approved owners can insert/update items.
   - [ ] Hard delete is blocked for authenticated users.
   - [ ] Storage uploads to `providers/<own_id>/...` succeed.
   - [ ] Storage uploads to `providers/<other_id>/...` fail (403).

**Important**:

- This PR **does not** contain UI changes (moved to PR3-B).
- **After Merge**: You must apply the migration to the Supabase cloud project (`supabase db push` or copy-paste SQL).
