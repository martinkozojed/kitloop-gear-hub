-- DB Smoke Test Script
-- Purpose: Validate database schema integrity and RLS configuration
-- Usage: Copy-paste into Supabase SQL Editor and verify all queries return expected results
-- Expected Runtime: < 5 seconds
-- Last Updated: 2026-02-16
-- ==============================================================================
-- SECTION 1: TABLE EXISTENCE CHECKS
-- ==============================================================================
-- Expected: Each query should return 1 row with exists=true
-- Core Tables
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'profiles'
    ) AS "profiles_exists";
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'providers'
    ) AS "providers_exists";
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'user_provider_memberships'
    ) AS "memberships_exists";
-- Inventory Tables (Post-Split Architecture)
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'products'
    ) AS "products_exists";
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'product_variants'
    ) AS "product_variants_exists";
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'assets'
    ) AS "assets_exists";
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'maintenance_log'
    ) AS "maintenance_log_exists";
-- Reservation Tables
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'reservations'
    ) AS "reservations_exists";
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'reservation_lines'
    ) AS "reservation_lines_exists";
-- Audit Tables
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'audit_logs'
    ) AS "audit_logs_exists";
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'asset_events'
    ) AS "asset_events_exists";
-- ==============================================================================
-- SECTION 2: RLS STATUS CHECKS
-- ==============================================================================
-- Expected: Each query should return 1 row with rls_enabled=true
-- Check RLS on critical tables
SELECT schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'providers',
        'profiles',
        'products',
        'assets',
        'reservations',
        'reservation_lines'
    )
ORDER BY tablename;
-- Expected output:
-- | schemaname | tablename          | rls_enabled |
-- |------------|--------------------|-------------|
-- | public     | assets             | true        |
-- | public     | products           | true        |
-- | public     | profiles           | true        |
-- | public     | providers          | true        |
-- | public     | reservation_lines  | true        |
-- | public     | reservations       | true        |
-- ==============================================================================
-- SECTION 3: RLS POLICY COUNT CHECKS
-- ==============================================================================
-- Expected: Each critical table should have at least 1 policy
SELECT schemaname,
    tablename,
    COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'providers',
        'assets',
        'reservations',
        'products'
    )
GROUP BY schemaname,
    tablename
ORDER BY tablename;
-- Expected: Each table should have policy_count >= 1
-- ==============================================================================
-- SECTION 4: CONSTRAINT CHECKS
-- ==============================================================================
-- Expected: Key constraints should exist
-- Check provider_id foreign keys exist on critical tables
SELECT tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('assets', 'products', 'reservations')
    AND ccu.table_name = 'providers'
ORDER BY tc.table_name,
    kcu.column_name;
-- Expected: Should return rows showing provider_id -> providers(id) relationships
-- ==============================================================================
-- SECTION 5: ENUM TYPE CHECKS
-- ==============================================================================
-- Expected: Critical enums should exist
SELECT t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN (
        'asset_status_type',
        'maintenance_type',
        'reservation_status_type'
    )
ORDER BY t.typname,
    e.enumsortorder;
-- Expected: Should return rows for each enum type and its values
-- ==============================================================================
-- ASSERTION SUMMARY
-- ==============================================================================
-- ✅ PASS CRITERIA:
-- 1. All "exists" queries return TRUE
-- 2. All critical tables have rls_enabled = TRUE
-- 3. Each critical table has at least 1 RLS policy
-- 4. Foreign key relationships to providers exist
-- 5. Required enum types are defined
--
-- ❌ FAIL CRITERIA:
-- - Any query returns FALSE, 0 rows, or NULL
-- - RLS disabled on critical tables
-- - Missing foreign key constraints
-- - Missing enum types
--
-- NEXT STEPS ON FAILURE:
-- 1. Review migration order in supabase/migrations/
-- 2. Check for skipped or failed migrations
-- 3. Verify Supabase project deployment status
-- 4. Re-run migrations: `npx supabase db reset`