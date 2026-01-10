-- P0 SECURITY HOTFIX: Remove anon/authenticated access to admin tables
-- =============================================================================
-- Date: 2026-01-10
-- Issue: anon and authenticated roles have SELECT privilege on admin tables
-- Fix: REVOKE privileges + FORCE Row Level Security
-- Tables: admin_audit_logs, admin_rate_limits
-- =============================================================================

BEGIN;

-- Remove all privileges from public roles
-- These tables should only be accessible via service role (SECURITY DEFINER functions)
REVOKE ALL ON TABLE public.admin_audit_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_rate_limits FROM anon, authenticated;

-- Enable Row Level Security (if not already enabled)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_rate_limits ENABLE ROW LEVEL SECURITY;

-- FORCE Row Level Security (applies even to table owner)
-- This ensures no bypass even for postgres role
ALTER TABLE public.admin_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_rate_limits FORCE ROW LEVEL SECURITY;

-- Note: Existing RLS policies remain unchanged
-- admin_audit_logs has policy: "admin_audit_logs_select_admin" (admins only)
-- admin_rate_limits has NO policies (access only via SECURITY DEFINER RPCs)

COMMIT;
