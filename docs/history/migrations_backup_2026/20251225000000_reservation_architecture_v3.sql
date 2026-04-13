-- Protocol V3: Deepening Reservation Logic

-- 1. Create Payment Status Enum
CREATE TYPE public.payment_status_type AS ENUM (
    'unpaid', 
    'authorized', 
    'paid', 
    'refunded', 
    'partially_refunded',
    'failed'
);

-- 2. Enhance Reservations Table
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS payment_status public.payment_status_type DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS documents_status JSONB DEFAULT '{"waiver": "pending"}'::jsonb;

-- 3. Create Reservation Lines (Demand)
CREATE TABLE IF NOT EXISTS public.reservation_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    product_variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price_per_item_cents INTEGER, -- Snapshot price at booking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_reservation_lines_reservation_id ON public.reservation_lines(reservation_id);

-- 4. Enhance Product Variants (Attributes & Buffer)
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS attributes JSONB, -- For structured data (size, boot_size, etc.)
ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 1440; -- Default 24h turnaround

-- 5. DB Guardrail: Prevent Double-Booking of Active Assets
-- Ensure that an asset cannot be in two active assignments (returned_at IS NULL) at the same time.
CREATE UNIQUE INDEX idx_unique_active_assignment 
ON public.reservation_assignments (asset_id) 
WHERE returned_at IS NULL;

-- 6. Audit Logging Trigger (Basic) using existing audit_logs
CREATE OR REPLACE FUNCTION public.log_reservation_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.audit_logs (provider_id, user_id, action, resource_id, metadata)
            VALUES (
                NEW.provider_id, 
                coalesce(auth.uid(), NEW.user_id), -- try to get actor, fallback to owner
                'reservation_status_change',
                NEW.id,
                jsonb_build_object('old', OLD.status, 'new', NEW.status)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_reservation_changes ON public.reservations;
CREATE TRIGGER tr_log_reservation_changes
AFTER UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.log_reservation_changes();

-- 7. Backfill Logic (Optional/Safe): If lines empty, create from existing reservations
DO $$
BEGIN
    -- For confirmed/active/hold reservations that don't have lines, create a single line based on product_variant_id
    INSERT INTO public.reservation_lines (reservation_id, product_variant_id, quantity)
    SELECT id, product_variant_id, 1
    FROM public.reservations
    WHERE product_variant_id IS NOT NULL 
    AND id NOT IN (SELECT reservation_id FROM public.reservation_lines);
END $$;
