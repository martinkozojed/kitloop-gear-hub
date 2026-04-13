-- Migration: Ad-hoc Pricing Line Items
-- Description: Creates the reservation_line_items table to store custom fees/discounts per reservation, along with triggers to update the reservation totals automatically.
CREATE TABLE IF NOT EXISTS public.reservation_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('discount', 'fee', 'damage', 'custom')),
    description TEXT NOT NULL,
    amount numeric(12, 2) NOT NULL,
    -- Negative for discount, positive for fee
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES public.profiles(user_id) -- User who added it
);
-- Index for fast lookups by reservation
CREATE INDEX IF NOT EXISTS idx_reservation_line_items_reservation_id ON public.reservation_line_items(reservation_id);
-- RLS Policies
ALTER TABLE public.reservation_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Line items are viewable by reservation owner or provider" ON public.reservation_line_items FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.reservations r
            WHERE r.id = reservation_line_items.reservation_id
                AND (
                    r.customer_id = auth.uid()
                    OR r.provider_id IN (
                        SELECT provider_id
                        FROM public.user_provider_memberships
                        WHERE user_id = auth.uid()
                    )
                )
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.user_id = auth.uid()
                AND p.role = 'admin'
        )
    );
CREATE POLICY "Line items are insertable by provider members" ON public.reservation_line_items FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.reservations r
            WHERE r.id = reservation_line_items.reservation_id
                AND r.provider_id IN (
                    SELECT provider_id
                    FROM public.user_provider_memberships
                    WHERE user_id = auth.uid()
                )
        )
    );
CREATE POLICY "Line items are updatable by provider members" ON public.reservation_line_items FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.reservations r
            WHERE r.id = reservation_line_items.reservation_id
                AND r.provider_id IN (
                    SELECT provider_id
                    FROM public.user_provider_memberships
                    WHERE user_id = auth.uid()
                )
        )
    );
CREATE POLICY "Line items are deletable by provider members" ON public.reservation_line_items FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.reservations r
        WHERE r.id = reservation_line_items.reservation_id
            AND r.provider_id IN (
                SELECT provider_id
                FROM public.user_provider_memberships
                WHERE user_id = auth.uid()
            )
    )
);
-- Trigger to recalculate reservation total
-- We use SECURITY DEFINER so that the user doesn't need explicit UPDATE permission on the reservations table
-- (though they likely do if they are a provider, this ensures it always works)
CREATE OR REPLACE FUNCTION public.update_reservation_total_on_line_item() RETURNS TRIGGER AS $$
DECLARE v_res_id UUID;
v_diff numeric(12, 2) := 0;
BEGIN IF TG_OP = 'INSERT' THEN v_res_id := NEW.reservation_id;
v_diff := NEW.amount;
ELSIF TG_OP = 'UPDATE' THEN v_res_id := NEW.reservation_id;
v_diff := NEW.amount - OLD.amount;
ELSIF TG_OP = 'DELETE' THEN v_res_id := OLD.reservation_id;
v_diff := - OLD.amount;
END IF;
IF v_diff != 0 THEN
UPDATE public.reservations
SET total_price = total_price + v_diff,
    amount_total_cents = amount_total_cents + (v_diff * 100)::integer
WHERE id = v_res_id;
END IF;
IF TG_OP = 'DELETE' THEN RETURN OLD;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS reservation_line_items_total_trigger ON public.reservation_line_items;
CREATE TRIGGER reservation_line_items_total_trigger
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.reservation_line_items FOR EACH ROW EXECUTE FUNCTION public.update_reservation_total_on_line_item();