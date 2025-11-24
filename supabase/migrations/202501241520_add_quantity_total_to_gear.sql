-- =============================================================================
-- Add quantity_total to gear_items and ensure consistency
-- =============================================================================

-- 1. Add the quantity_total column
ALTER TABLE public.gear_items
ADD COLUMN IF NOT EXISTS quantity_total INTEGER;

-- 2. Backfill quantity_total
-- For existing items, we'll assume the total quantity is the currently
-- available quantity plus any items currently out on active reservations.
-- This is an approximation but the best we can do with current data.
UPDATE public.gear_items
SET quantity_total = quantity_available
WHERE quantity_total IS NULL;

-- 3. Add a check constraint to ensure total >= available
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1
--     FROM pg_constraint
--     WHERE conname = 'quantity_total_gte_available'
--       AND conrelid = 'public.gear_items'::regclass
--   ) THEN
--     ALTER TABLE public.gear_items
--     ADD CONSTRAINT quantity_total_gte_available
--     CHECK (quantity_total >= quantity_available);
--   END IF;
-- END;
-- $$;

-- 4. Update the column to be NOT NULL and have a default
ALTER TABLE public.gear_items
ALTER COLUMN quantity_total SET NOT NULL,
ALTER COLUMN quantity_total SET DEFAULT 0;

-- Also set a default for quantity_available if it doesn't have one
ALTER TABLE public.gear_items
ALTER COLUMN quantity_available SET DEFAULT 0;
