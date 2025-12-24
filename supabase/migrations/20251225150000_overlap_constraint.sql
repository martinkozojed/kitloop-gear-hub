-- Migration: Add Overlap Exclusion Constraint
-- Goal: Prevent double-booking of assets at the database level.

BEGIN;

-- 1. Enable Extension for GiST indexes with scalar types (UUID)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Add Exclusion Constraint
-- Logic: No two rows can have the same asset_id AND overlapping time ranges.
-- We use tstzrange(assigned_at, returned_at, '[)') for the range.
-- COALESCE(returned_at, 'infinity') handles active rentals (not yet returned).
ALTER TABLE public.reservation_assignments
ADD CONSTRAINT no_overlapping_assignments
EXCLUDE USING GIST (
    asset_id WITH =,
    tstzrange(assigned_at, COALESCE(returned_at, 'infinity'::timestamptz), '[)') WITH &&
);

COMMIT;
