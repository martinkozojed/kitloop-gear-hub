## Security regression suite

### What it does
- Builds two synthetic tenants (A/B) and users in a transaction (rolled back).
- Verifies cross-tenant reads/writes are blocked, privileged RPCs can’t be called by authenticated users, RLS is enabled on key tables, and broad INSERT grants aren’t present.
- Fails fast on any regression.

### How to run locally
```bash
SUPABASE_DB_URL="postgresql://postgres:...@db.host:5432/postgres" ./scripts/test_security_regression.sh
```
(Requires service-role connection; leaves no data thanks to a final ROLLBACK.)

### Expected output
- `SECURITY REGRESSION: PASS (rolled back)` followed by `security_regression: PASS`.
- No duplicate or cross-tenant inserts/reads succeed.

### CI workflow
- `.github/workflows/security-regression.yml` runs on PRs with the `SECURITY_DB_URL` secret, on `workflow_dispatch`, and nightly if the secret exists.
- If the secret is absent (e.g., fork PR), the job is skipped with a clear message.

### Interpreting failures
- “Cross-tenant read/write” → RLS gap; inspect policies on assets/products/providers/memberships.
- “add_provider_member callable” → RPC grant regression (should be service-only).
- “cleanup_reservation_holds_sql callable” → SECURITY DEFINER function exposed; check grants.
- “RLS disabled” → ensure relrowsecurity is enabled and migrations applied.
- “Broad INSERT grants” → revoke INSERT for anon/authenticated/public on protected tables.
