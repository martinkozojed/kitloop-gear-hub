-- =============================================================================
-- KITLOOP - RESERVATION HOLD SUPPORT & LOGO STORAGE POLICIES
-- =============================================================================
-- Notes:
--   * Adds hold workflow columns + idempotency safeguards to reservations
--   * Extends status constraint to include 'hold'
--   * Ensures supporting index for active/hold lookups
--   * Creates (if missing) a dedicated 'logos' storage bucket with RLS policies
-- =============================================================================

-- =============================================================================
-- 1. RESERVATION HOLD COLUMNS & CONSTRAINTS
-- =============================================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Unique idempotency key (ignores NULL values by default)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_idempotency_key_key'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_idempotency_key_key
      UNIQUE (idempotency_key);
  END IF;
END $$;

-- Refresh status constraint to include HOLD state
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_reservation_status'
  ) THEN
    ALTER TABLE public.reservations
      DROP CONSTRAINT check_reservation_status;
  END IF;

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
END $$;

-- Supporting partial index for availability checks (hold + confirmed + active)
CREATE INDEX IF NOT EXISTS idx_reservations_active_hold
  ON public.reservations (gear_id, start_date, end_date)
  WHERE status IN ('hold', 'confirmed', 'active');

-- =============================================================================
-- 2. LOGO STORAGE BUCKET & RLS
-- =============================================================================

-- Create bucket if it does not exist (public so logos can be displayed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'logos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('logos', 'logos', true);
  END IF;
END $$;

-- Grant providers ability to manage their own logos
-- (Drop policies first to keep migration idempotent)
DROP POLICY IF EXISTS "Providers can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update own logos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete own logos" ON storage.objects;

CREATE POLICY "Providers can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update own logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete own logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.user_id = auth.uid()
  )
);

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
