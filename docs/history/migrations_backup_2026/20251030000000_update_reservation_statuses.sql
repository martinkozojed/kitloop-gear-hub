-- ============================================================================
-- UPDATE RESERVATION STATUSES FOR GRANULAR PROVIDER WORKFLOW
-- ============================================================================
-- Adds support for:
-- 'checked_out': Item handed over to customer
-- 'returned': Item received back by provider
-- 'inspected_closed': Final close after inspection
-- ============================================================================

DO $$
BEGIN
  -- 1. Drop the existing constraint if it exists
  -- We check for both likely names 'check_reservation_status' and 'reservations_status_check'
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_reservation_status') THEN
    ALTER TABLE public.reservations DROP CONSTRAINT check_reservation_status;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_status_check') THEN
    ALTER TABLE public.reservations DROP CONSTRAINT reservations_status_check;
  END IF;

  -- 2. Add the new constraint with expanded statuses
  ALTER TABLE public.reservations
    ADD CONSTRAINT check_reservation_status
    CHECK (
      status IN (
        'hold',              -- System: Temporary lock during booking
        'pending',           -- User: Request submitted
        'confirmed',         -- Provider: Booking accepted
        'checked_out',       -- Provider: Item picked up (Active)
        'returned',          -- Provider: Item returned (Pending Inspection)
        'inspected_closed',  -- Provider: Closed (Completed)
        'active',            -- Legacy: equivalent to checked_out
        'completed',         -- Legacy: equivalent to inspected_closed
        'cancelled',         -- System/User: Voided
        'no_show'            -- Provider: Customer didn't pick up
      )
    );
END $$;
