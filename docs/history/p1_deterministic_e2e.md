# P1: Deterministic E2E & CI Stability

**Status**: Completed (Merged into main)
**Commit**: f75ec6b

## Goals

- Eliminate E2E flakiness caused by shared environment collisions.
- Secure the "Harness" used for E2E seeding/cleanup to prevent unauthorized use.
- Stabilize CI pipeline (Lint, Typecheck, Deno Tests) to enable strict "Release Gates".

## Key Changes

### E2E Harness Security

- **Kill Switch**: Harness is only available when `HARNESS_ENV=staging`. In production, it returns 404/403.
- **Token Gate**: All harness operations require `x-e2e-token` header matching `E2E_SEED_TOKEN` env var.
- **Idempotency**: `seed_preflight.sh` and related scripts are designed to run multiple times without error, cleaning up specific test data before seeding.

### Test IDs

- Added distinct `data-testid` attributes to critical UI elements (e.g., `revenue-card`, `utilization-card`) to decouple tests from visual styling changes.

### CI Hardening

- **Console Guard**: `verify_console_guard.sh` strictly enforces no `console.log` in production builds.
- **React Compiler Linting**: Fixed `eslint-plugin-react-compiler` manual memoization violations.
- **Deno Lockfile Strategy**:
  - Removed strict `--frozen` flag from `deno test` and `deno cache` in CI.
  - **Tradeoff**: `deno.lock` hash generation differs between macOS (dev) and Linux (CI) due to `esm.sh` behavior. We allow CI to resolve dependencies dynamically to avoid "Integrity check failed" errors.

## Known Tradeoffs & Workarounds

### Date Granularity

- **Issue**: Reservations use `DATE` type in Postgres, which has day-level granularity.
- **Workaround**: E2E tests (`reservation.spec.ts`) set reservations to be exactly 24 hours (1 day) long to avoid ambiguity.
- **Impact**: Prevents testing hourly rentals or finer-grained scenarios until schema migration to `TIMESTAMPTZ` (P2 Decision).

### Deno Lockfile

- We prioritize CI stability over strict lockfile freezing for Edge Functions until Deno/esm.sh cross-platform hashing is fully consistent.
