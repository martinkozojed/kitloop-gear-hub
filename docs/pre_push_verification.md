# Pre-Push Verification Report

**Date**: 2026-01-04
**Deployment Target**: Staging/Prod
**Status**: **GO** (with Caution on Data)

## A) Target Confirmation

- **Project Ref**: `bkyokcjpelqwtndienos` (Source: `supabase/config.toml`)
- **Git State**: Branch `main` (Commit `2234e04`)

## B) Migration Safety

**Migrations to apply** (Newest first):

1. `20260105050000_return_flow.sql` (Tables, Policies, RPCs)
2. `20260105040000_inventory_hardening.sql` (Unique Constraints)
3. `20260105030000_rpc_updates.sql` (RPC Refresh)
4. `20260105020000_legacy_view_switch.sql` (View Updates) 
5. `20260105010000_overbooking_guard.sql` (Triggers)
6. `20260105000000_strict_schema.sql` (Schema Fixes)

**Safety Analysis**:

- **RPCs**: All use `CREATE OR REPLACE FUNCTION` (Safe / Idempotent).
- **Policies**: Most use `DROP IF EXISTS` or rely on fresh tables.
- **Constraints (`inventory_hardening`)**: Adds `UNIQUE` constraints to `products` and `variants`.
  - **CAUTION**: If Staging/Prod database already contains duplicate product/variant names for the same provider, THIS MIGRATION WILL FAIL.
  - **Recommendation**: Ensure Staging data is clean or empty before push.

## C) RLS/Storage (Local Verification as Proxy)

*Verified via `supabase test db` output*

- **Bucket**: `damage-photos` (Private).
- **Policies**: Active for `return_reports`, `assets`, `storage.objects`.
- **RPC Security**: `issue_reservation` and `process_return` are `SECURITY DEFINER` with explicit membership checks.

## D) Client Secret Guard

- **Scan Result**: **PASS**
  - `grep "service_role" src/`: Clean.
  - `grep "SUPABASE_SERVICE" .`: Clean.
- **Env**: Frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## E) Post-Push Smoke Plan

(To be executed manually by User after push)

1. **Login**: Verify Admin login.
2. **Issue**: Attempt Unpaid Issue -> Expect Error `P0003`.
3. **Return**: Return asset with damage -> Verify `return_reports` entry created.

---
**GO/NO-GO**: **GO**
*Proceed with `supabase db push`. Monitor output for constraint violations in `inventory_hardening`.*
