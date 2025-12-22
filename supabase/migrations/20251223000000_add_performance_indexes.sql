-- Add index on gear_availability_blocks(gear_id) to optimize joins with gear_items
CREATE INDEX IF NOT EXISTS idx_gear_availability_blocks_gear_id ON public.gear_availability_blocks(gear_id);

-- Add index on payments(provider_id) to optimize joins with providers
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON public.payments(provider_id);

-- Add index on payments(reservation_id) to optimize joins with reservations
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON public.payments(reservation_id);
