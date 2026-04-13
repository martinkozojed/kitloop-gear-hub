-- Enforce non-overlapping reservations on date ranges for active states

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Drop previous constraint if exists
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap_variant;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap_gear;

-- For product_variant_id reservations
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_no_overlap_variant
  EXCLUDE USING gist (
    product_variant_id WITH =,
    daterange(start_date, end_date, '[)') WITH &&
  )
  WHERE (
    status IN ('hold','confirmed','active')
    AND deleted_at IS NULL
    AND product_variant_id IS NOT NULL
  );

-- For legacy gear_id reservations
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_no_overlap_gear
  EXCLUDE USING gist (
    gear_id WITH =,
    daterange(start_date, end_date, '[)') WITH &&
  )
  WHERE (
    status IN ('hold','confirmed','active')
    AND deleted_at IS NULL
    AND product_variant_id IS NULL
    AND gear_id IS NOT NULL
  );

COMMIT;

