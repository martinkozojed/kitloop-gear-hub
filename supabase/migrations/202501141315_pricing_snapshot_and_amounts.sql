-- =============================================================================
-- KITLOOP - RESERVATION PRICING SNAPSHOT & AMOUNTS
-- =============================================================================
-- Adds pricing fields that will be populated by Edge payment flows.
-- =============================================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS currency text
    CHECK (char_length(currency) = 3)
    DEFAULT 'CZK',
  ADD COLUMN IF NOT EXISTS amount_total_cents integer
    CHECK (amount_total_cents >= 0)
    DEFAULT 0;

COMMENT ON COLUMN public.reservations.pricing_snapshot IS
  'Stored calculation details (e.g. days, rates, taxes) captured at the time of payment intent creation.';

COMMENT ON COLUMN public.reservations.currency IS
  'ISO 4217 currency code for totals (defaults to CZK).';

COMMENT ON COLUMN public.reservations.amount_total_cents IS
  'Total amount in minor units (cents). Edge functions are responsible for keeping it in sync with pricing_snapshot.';

-- Future work: add trigger to validate consistency between pricing_snapshot and amount_total_cents.
