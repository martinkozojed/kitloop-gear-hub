-- ============================================================================
-- RESERVATION SYSTEM ENHANCEMENT - MVP
-- ============================================================================
--
-- Purpose: Add missing columns and constraints to reservation table
-- Date: 2025-01-12
--
-- Changes:
-- 1. Add provider_id, customer fields, pricing, timestamps
-- 2. Ensure timezone-aware timestamps
-- 3. Add validation constraints
-- 4. Create indexes for performance
-- 5. Update RLS policies
--
-- ============================================================================

-- 1. ADD MISSING COLUMNS
-- ============================================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id),
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_pickup_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_return_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. ENSURE TIMESTAMPS ARE TIMEZONE-AWARE
-- ============================================================================

-- Convert existing timestamp columns to timestamptz if they aren't already
DO $$
BEGIN
  -- Check and convert start_date
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations'
    AND column_name = 'start_date'
    AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE public.reservations
      ALTER COLUMN start_date TYPE timestamptz USING start_date AT TIME ZONE 'UTC';
  END IF;

  -- Check and convert end_date
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations'
    AND column_name = 'end_date'
    AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE public.reservations
      ALTER COLUMN end_date TYPE timestamptz USING end_date AT TIME ZONE 'UTC';
  END IF;
END $$;

-- 3. BACKFILL PROVIDER_ID FROM GEAR_ITEMS
-- ============================================================================

-- Safely backfill provider_id from related gear_items
UPDATE public.reservations r
SET provider_id = gi.provider_id
FROM public.gear_items gi
WHERE r.gear_id = gi.id
  AND r.provider_id IS NULL
  AND EXISTS (SELECT 1 FROM public.gear_items WHERE id = r.gear_id);

-- Set default customer_name for existing records
UPDATE public.reservations
SET customer_name = COALESCE(customer_name, 'Zákazník')
WHERE customer_name IS NULL OR customer_name = '';

-- 4. ADD CONSTRAINTS
-- ============================================================================

-- Make provider_id and customer_name NOT NULL (after backfill)
ALTER TABLE public.reservations
  ALTER COLUMN provider_id SET NOT NULL,
  ALTER COLUMN customer_name SET NOT NULL,
  ALTER COLUMN customer_name SET DEFAULT '';

-- Add status constraint (only valid values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_reservation_status'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT check_reservation_status
      CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled'));
  END IF;
END $$;

-- Set default status
ALTER TABLE public.reservations
  ALTER COLUMN status SET DEFAULT 'pending';

-- Add date validation (end must be after start)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_date_range'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT check_date_range
      CHECK (end_date > start_date);
  END IF;
END $$;

-- Add price validation (non-negative)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_total_price'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT check_total_price
      CHECK (total_price >= 0);
  END IF;
END $$;

-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reservation_provider ON public.reservations(provider_id);
CREATE INDEX IF NOT EXISTS idx_reservation_gear ON public.reservations(gear_id);
CREATE INDEX IF NOT EXISTS idx_reservation_dates ON public.reservations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reservation_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservation_customer ON public.reservations(customer_name);
CREATE INDEX IF NOT EXISTS idx_reservation_created ON public.reservations(created_at);

-- Composite index for availability queries (critical for performance)
CREATE INDEX IF NOT EXISTS idx_reservation_availability
  ON public.reservations(gear_id, status, start_date, end_date)
  WHERE status IN ('confirmed', 'active');

-- 6. UPDATE RLS POLICIES
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Providers can manage own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can view active reservations" ON public.reservations;

-- Allow providers to manage their own reservations
CREATE POLICY "Providers can manage own reservations"
  ON public.reservations FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

-- Optional: Public read for marketplace (only confirmed/active)
-- Uncomment if you want reservations visible to public
-- CREATE POLICY "Public can view active reservations"
--   ON reservation FOR SELECT
--   TO public
--   USING (status IN ('confirmed', 'active'));

-- 7. CREATE UPDATE TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reservation_updated_at ON public.reservations;

CREATE TRIGGER update_reservation_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- After running this migration, verify with:
--
-- 1. Check columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'reservation'
-- ORDER BY ordinal_position;
--
-- 2. Check constraints:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'reservation'::regclass;
--
-- 3. Check indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'reservation';
--
-- 4. Check RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'reservation';
--
-- ============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Reservation table enhanced successfully';
  RAISE NOTICE '📋 Columns added: provider_id, customer fields, pricing, timestamps';
  RAISE NOTICE '🔒 Constraints added: status, date range, price validation';
  RAISE NOTICE '⚡ Indexes created for performance';
  RAISE NOTICE '🛡️ RLS policies updated';
END $$;
