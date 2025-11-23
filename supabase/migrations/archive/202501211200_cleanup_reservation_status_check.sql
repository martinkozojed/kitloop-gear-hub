-- ============================================================================
-- CLEAN UP LEGACY RESERVATION STATUS CONSTRAINT
-- ============================================================================
-- Odstraňuje starý constraint `reservations_status_check`, který neobsahoval
-- status `hold`, a zajišťuje, že aktuální constraint povoluje nové hodnoty.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reservations_status_check'
  ) THEN
    ALTER TABLE public.reservations
      DROP CONSTRAINT reservations_status_check;
  END IF;
END $$;
-- Pro jistotu znovu vytvoříme constraint se správnými hodnotami.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_reservation_status'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT check_reservation_status
      CHECK (
        status IN (
          'hold',
          'pending',
          'confirmed',
          'active',
          'completed',
          'cancelled'
        )
      );
  END IF;
END $$;
