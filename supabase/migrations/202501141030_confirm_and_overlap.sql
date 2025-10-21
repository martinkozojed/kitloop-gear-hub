-- =============================================================================
-- KITLOOP - RESERVATION CONFIRMATION & OVERLAP ENFORCEMENT
-- =============================================================================
-- Context:
--   * 202501140900_reservation_holds_and_logos.sql introduced idempotency_key
--     and hold support (public.reservations) [ref].
--   * This migration refines idempotency scope, adds range-based exclusion
--     constraints, and prepares confirmation metadata.
-- =============================================================================

-- =============================================================================
-- 1. IDEMPOTENCY KEYS SCOPED PER PROVIDER
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_idempotency_key_key'
  ) THEN
    ALTER TABLE public.reservations
      DROP CONSTRAINT reservations_idempotency_key_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_provider_id_idempotency_key_key'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_provider_id_idempotency_key_key
      UNIQUE (provider_id, idempotency_key);
  END IF;
END $$;

-- =============================================================================
-- 2. RESERVATION PERIOD + PAYMENT METADATA
-- =============================================================================

-- Ensure gist helpers are available for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Reservation period (half-open range) for overlap enforcement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reservations'
      AND column_name = 'period'
  ) THEN
    ALTER TABLE public.reservations
      ADD COLUMN period tstzrange
        GENERATED ALWAYS AS (tstzrange(start_date, end_date, '[)')) STORED;
  END IF;
END $$;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- =============================================================================
-- 3. EXCLUSION CONSTRAINT FOR OVERLAPS
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_no_overlap'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_no_overlap
      EXCLUDE USING gist (
        gear_id WITH =,
        period  WITH &&
      )
      WHERE (status IN ('hold','confirmed','active'));
  END IF;
END $$;

-- NOTE: The partial index created in 202501140900_reservation_holds_and_logos.sql
--       (idx_reservations_active_hold) remains for query performance, while the
--       EXCLUDE constraint is now the primary guarantee of consistency.

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
