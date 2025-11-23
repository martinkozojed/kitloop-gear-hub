-- ============================================================================
-- HOTFIX: Production Issues - Profile Timeout + Reservations 400 + Performance
-- ============================================================================
-- Date: 2025-01-12
-- Issues Fixed:
--   1. Profile query timeout (>10s)
--   2. Reservations 400 error (RLS policy mismatch)
--   3. Missing indexes for performance
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on profiles.user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
ON public.profiles(user_id);
-- Index on providers.user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_providers_user_id
ON public.providers(user_id);
-- Index on reservations.provider_id for fast provider queries
CREATE INDEX IF NOT EXISTS idx_reservations_provider_id
ON public.reservations(provider_id);
-- Index on reservations.gear_id for JOIN performance
CREATE INDEX IF NOT EXISTS idx_reservations_gear_id
ON public.reservations(gear_id);
-- Composite index for reservation queries with status filter
CREATE INDEX IF NOT EXISTS idx_reservations_provider_status_dates
ON public.reservations(provider_id, status, start_date DESC);
-- ============================================================================
-- 2. FIX RESERVATIONS RLS POLICY
-- ============================================================================
-- Problem: Old policy used gear_id IN (SELECT...) which was slow and didn't match
--          how ProviderReservations.tsx queries (by provider_id directly)
-- Solution: Add direct policy for provider_id column

-- Drop old complex policy
DROP POLICY IF EXISTS "Providers can view their gear reservations" ON public.reservations;
-- New simplified policy using provider_id directly
CREATE POLICY "Providers can view own reservations by provider_id"
  ON public.reservations FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  );
-- Keep user reservation policy for customers
-- (already exists, no change needed)

-- ============================================================================
-- 3. ADD POLICY FOR PROVIDERS TO INSERT RESERVATIONS
-- ============================================================================
-- Providers need to be able to create reservations for customers

DROP POLICY IF EXISTS "Providers can create reservations" ON public.reservations;
CREATE POLICY "Providers can create reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  );
-- ============================================================================
-- 4. ADD POLICY FOR PROVIDERS TO UPDATE RESERVATIONS
-- ============================================================================
-- Providers need to update reservation status, notes, etc.

DROP POLICY IF EXISTS "Providers can update own reservations" ON public.reservations;
CREATE POLICY "Providers can update own reservations"
  ON public.reservations FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  );
-- ============================================================================
-- 5. OPTIMIZE PROFILES RLS POLICY (Already optimal, but verify)
-- ============================================================================
-- Current policy is already simple: auth.uid() = user_id
-- No changes needed, but let's ensure it's using the index

-- Verify policy exists (recreate if needed)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);
-- ============================================================================
-- 6. VERIFY ALL INDEXES ARE APPLIED
-- ============================================================================
-- Run ANALYZE to update query planner statistics

ANALYZE public.profiles;
ANALYZE public.providers;
ANALYZE public.reservations;
ANALYZE public.gear_items;
-- ============================================================================
-- 7. DIAGNOSTIC QUERIES (Run these in SQL Editor to verify)
-- ============================================================================

/*
-- Check all indexes on profiles:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'profiles';

-- Check all RLS policies on reservations:
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'reservations';

-- Test query performance (should be <100ms):
EXPLAIN ANALYZE
SELECT * FROM profiles WHERE user_id = auth.uid();

-- Test reservations query (should be <500ms):
EXPLAIN ANALYZE
SELECT r.*, gi.name, gi.category
FROM reservations r
LEFT JOIN gear_items gi ON r.gear_id = gi.id
WHERE r.provider_id IN (
  SELECT id FROM providers WHERE user_id = auth.uid()
)
ORDER BY r.start_date DESC;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Expected improvements:
--   - Profile queries: 10s → <1s ✅
--   - Reservations queries: 400 error → 200 OK ✅
--   - Reservations load time: N/A → <500ms ✅
-- ============================================================================;
