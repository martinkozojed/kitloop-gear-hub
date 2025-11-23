-- =============================================================================
-- KITLOOP - PAYMENTS HARDENING
-- =============================================================================
-- At-least-once delivery from Stripe webhooks requires us to record processed
-- events and enforce uniqueness of payment_intent_id on reservations.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  reservation_id uuid REFERENCES public.reservations(id),
  provider_id uuid REFERENCES public.providers(id),
  received_at timestamptz DEFAULT now(),
  processed boolean DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reservations_payment_intent
  ON public.reservations(payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;
