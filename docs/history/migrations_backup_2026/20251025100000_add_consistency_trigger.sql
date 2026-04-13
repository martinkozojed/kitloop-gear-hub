-- =============================================================================
-- MIGRATION: Add trigger to enforce pricing consistency in reservations
-- =============================================================================
-- This migration creates a trigger that ensures the `amount_total_cents`
-- column in the `reservations` table always matches the `total_cents`
-- value within the `pricing_snapshot` JSONB field.
-- =============================================================================

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.check_reservation_pricing_consistency()
RETURNS TRIGGER AS $$
DECLARE
  snapshot_total_cents integer;
BEGIN
  -- If pricing_snapshot is NULL, there's nothing to check.
  IF NEW.pricing_snapshot IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extract total_cents from the pricing_snapshot JSONB
  snapshot_total_cents := (NEW.pricing_snapshot->>'total_cents')::integer;

  -- If total_cents is present in the snapshot, it must match amount_total_cents.
  -- We use IS DISTINCT FROM to correctly handle NULLs, although our logic
  -- for snapshot_total_cents should prevent it from being NULL if the key exists.
  IF snapshot_total_cents IS NOT NULL AND NEW.amount_total_cents IS DISTINCT FROM snapshot_total_cents THEN
    RAISE EXCEPTION 'Cena nesouhlasí se snapshotem.' USING ERRCODE = 'P0001';
  END IF;

  -- If the values are consistent, or if there's no total_cents in the snapshot, allow the operation.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger on the reservations table
CREATE TRIGGER enforce_pricing_consistency
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.check_reservation_pricing_consistency();

COMMENT ON TRIGGER enforce_pricing_consistency ON public.reservations IS
'Ensures that amount_total_cents is consistent with the pricing_snapshot before any insert or update.';
