# Security Advisor Triage & Exceptions

This document tracks decisions made regarding Supabase Security Advisor warnings.

## P0: Critical Fixes (Implemented)

- **`function_search_path_mutable`**: Fixed via migration `20260110000000_security_hardening.sql`. All listed public functions now enforce `search_path = public, auth, extensions` to prevent search path hijacking.
- **`rls_disabled_in_public` (notification_logs)**: Fixed via migration `20260110000000_security_hardening.sql`. RLS enabled (default deny) and direct grants revoked from `anon` and `authenticated`.

## P1: Accepted Exceptions (No Action Taken)

- **`rls_disabled_in_public` (spatial_ref_sys)**:
  - **Reason**: This is a standard PostGIS metadata table. Enabling RLS or moving it can break PostGIS functionality.
  - **Decision**: Accepted risk. Read-only public metadata.

- **`extension_in_public` (postgis, pg_trgm, btree_gist)**:
  - **Reason**: Moving extensions requires a careful migration window and extensive regression testing as it changes type/function paths.
  - **Decision**: Deferred to Backlog. Current setup is standard for many Supabase starters. Requires test window + regression tests.

- **`rls_enabled_no_policy` (asset_events, maintenance_log)**:
  - **Reason**: These tables are intended to be write-only (via functions) or read-only (via admin views).
  - **Decision**: "Default Deny" behavior (enabled RLS with no policies) is the intended security model. Policies will be added only if direct frontend access is required in the future.

## P1: Manual Configuration Required

- **`auth_leaked_password_protection`**:
  - **Status**: Disabled.
  - **Action**: Must be enabled in Supabase Dashboard > Authentication > Security before public launch.
