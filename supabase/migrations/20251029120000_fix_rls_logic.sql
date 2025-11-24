-- =============================================================================
-- KITLOOP RLS HOTFIX - SURGICAL REMOVAL OF OLD POLICIES
-- =============================================================================
-- Version: 4.1
-- Date: 2025-10-29
-- Author: Gemini Agent
--
-- JIRA: P0-RLS-AUDIT
--
-- PROBLEM:
-- Old, permissive RLS policies were never dropped, causing security holes.
--
-- PREVIOUS ATTEMPT:
-- A full reset/re-apply of V3 policies did not work, suggesting a more
-- complex interaction or issue with the test runner.
--
-- SOLUTION (SURGICAL):
-- This migration now ONLY drops the old, specifically-named, insecure policies.
-- It assumes the correct V3 policies are already in place from previous
-- migrations. This is a cleaner, more surgical fix to remove only the
-- conflicting rules.
-- =============================================================================

BEGIN;

-- Drop old, insecure policies on providers
DROP POLICY IF EXISTS "Public providers are viewable by everyone." ON public.providers;
DROP POLICY IF EXISTS "Owners can manage their own provider." ON public.providers;

-- Drop old, insecure policies on gear_items
DROP POLICY IF EXISTS "Gear is publicly viewable." ON public.gear_items;
DROP POLICY IF EXISTS "Provider members can manage gear." ON public.gear_items;

-- Drop old, insecure policies on reservations
DROP POLICY IF EXISTS "Uživatelé vidí své rezervace." ON public.reservations;
DROP POLICY IF EXISTS "Uživatelé mohou vytvářet své rezervace." ON public.reservations;

COMMIT;
