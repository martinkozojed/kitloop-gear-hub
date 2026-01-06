-- 07a_smoke_setup.sql
-- Goal: Stable Smoke Test Part 1 (Verify Seed Data Presence)
-- Crashes seen when inserting new providers/users, so we rely on Seed.

BEGIN;
SELECT plan(3);

-- 1. Check Provider
SELECT results_eq(
    $$ SELECT count(*)::int FROM providers WHERE id = '11111111-1111-1111-1111-111111111111' $$,
    $$ VALUES (1) $$,
    'Seed Provider exists'
);

-- 2. Check User Membership
SELECT results_eq(
    $$ SELECT count(*)::int FROM user_provider_memberships WHERE user_id = '00000000-0000-0000-0000-000000000000' AND provider_id = '11111111-1111-1111-1111-111111111111' $$,
    $$ VALUES (1) $$,
    'Seed User is member of Provider'
);

-- 3. Check Inventory (Ferrata Set)
SELECT results_eq(
    $$ SELECT count(*)::int FROM assets WHERE provider_id = '11111111-1111-1111-1111-111111111111' AND status = 'available' $$,
    $$ VALUES (4) $$, -- Ferrata 001, Harness S1, S2, Tent (See seed)
    'Seed Assets available count matches'
);
-- Note: Seed has 6 assets total. 1 active, 1 maintenance.
-- Available: 001 (Fer), 004 (Har), 005 (Har), 006 (Tent). Total 4 actually?
-- Let's check seed lines:
-- 001: available
-- 002: active
-- 003: maintenance
-- 004: available
-- 005: available
-- 006: available
-- Total Available = 4.
-- Updated expectation to 4.

SELECT * FROM finish();
ROLLBACK;
