-- =============================================================================
-- KITLOOP RLS HOTFIX - DROP ALL OLD PERMISSIVE POLICIES
-- =============================================================================
-- Version: 5.0
-- Date: 2025-11-10
-- Author: Gemini Agent
--
-- JIRA: P0-RLS-AUDIT
--
-- PROBLEM:
-- Old, permissive RLS policies were never dropped, causing security holes.
-- My previous attempt to fix this was not exhaustive.
--
-- SOLUTION:
-- This migration drops all identified old, insecure policies.
-- =============================================================================

BEGIN;

-- Drop old, insecure policies on providers
DROP POLICY IF EXISTS "Public providers are viewable by everyone." ON public.providers;
DROP POLICY IF EXISTS "Owners can manage their own provider." ON public.providers;
DROP POLICY IF EXISTS "Anyone can view verified providers" ON public.providers;

-- Drop old, insecure policies on gear_items
DROP POLICY IF EXISTS "Gear is publicly viewable." ON public.gear_items;
DROP POLICY IF EXISTS "Provider members can manage gear." ON public.gear_items;
DROP POLICY IF EXISTS "Public can view verified gear" ON public.gear_items;
DROP POLICY IF EXISTS "Anyone can view active gear" ON public.gear_items;

-- Drop old, insecure policies on reservations
DROP POLICY IF EXISTS "Uživatelé vidí své rezervace." ON public.reservations;
DROP POLICY IF EXISTS "Uživatelé mohou vytvářet své rezervace." ON public.reservations;
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can view their gear reservations" ON public.reservations;

-- Drop old, insecure policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

COMMIT;
