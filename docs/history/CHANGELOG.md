# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-20

### P1: Deterministic E2E & Stability

- **Deterministic E2E re-enabled**: Fixed flakiness by introducing `seed_preflight.sh` and proper cleanup.
- **Harness Security**: `e2e_harness` is now restricted to `HARNESS_ENV=staging` and requires `x-e2e-token`.
- **Cron Observability**: Added `cron_runs` table and `cron.job` for internal logging of scheduled tasks.
- **Security Regression**: Added `test_security_regression.sh` workflow to catch RLS leaks.
- **CI Hardening**:
  - Enforced `no-console` across the codebase using `verify_console_guard.sh`.
  - Fixed React Compiler and TypeScript errors.
  - Adjusted Deno lockfile strategy to allow cross-platform CI builds (removed `--frozen`).
