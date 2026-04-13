# Request Link - Status Report

**Status:** 🟢 **STABILIZED & VERIFIED (Local)**
**Phase:** 4 - Verification & Hardening

This document tracks the stabilization of the Request Link feature, including database hardening, security fixes, and test coverage.

## 🏁 Checklist

### 1. Database Hardening [DONE]

- [x] RPC `issue_reservation` and `process_return` hardened with RBAC.
- [x] Legacy function overloads dropped to prevent ambiguity/bypass.
- [x] Standardized UUIDs (f000...) used in setup/tests.
- [x] RLS policies verified for `providers`, `product_variants`, and `assets`.

### 2. Verification [DONE]

- [x] `supabase test db` (14 files, 48 tests) – **PASSING**.
- [x] `02_rpc_strict_issue.sql` covers:
  - [x] Unpaid issuing (allowed in latest logic).
  - [x] Status-based blocks (Cancelled cannot be issued without override).
  - [x] Override reason requirement (tested via logic).
  - [x] Clean and Maintenance returns.
  - [x] Audit log creation.

### 3. Edge Function Configuration [DONE]

- [x] `supabase/config.toml` updated with `[functions.submit_request] verify_jwt = false`.

### 4. Next Steps (Production) [PENDING]

- [ ] Deploy migrations to staging/production.
- [ ] Deploy Edge functions.
- [ ] Verify `RATE_LIMIT_SALT` is set in production env.
- [ ] Run `docs/verification/request_link_hardening_verify.sql` on production (using `psql --rollback`).

## 📊 Summary of Fixes

- **Ambiguity Fix:** Removed several conflicting overloads of `issue_reservation` and `process_return` introduced by iterative migrations.
- **Test Stabilization:** Fixed crashes in base setup due to missing mandatory columns (`contact_name`, `email`, etc.).
- **Security:** Re-centered all authorization logic around the `assert_provider_role` helper.
