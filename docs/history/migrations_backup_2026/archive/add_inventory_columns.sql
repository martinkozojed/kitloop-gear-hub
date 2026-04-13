-- ============================================================================
-- KITLOOP INVENTORY MANAGEMENT - DATABASE MIGRATIONS
-- ============================================================================
-- This migration adds inventory management columns to gear_items and creates
-- the gear_images table for multi-image support
-- ============================================================================

-- ============================================================================
-- 1. ADD QUANTITY TRACKING TO GEAR_ITEMS
-- ============================================================================

ALTER TABLE public.gear_items
  ADD COLUMN IF NOT EXISTS quantity_total INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quantity_available INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS item_state TEXT DEFAULT 'available'
    CHECK (item_state IN ('available', 'reserved', 'maintenance', 'retired')),
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- ============================================================================
-- 2. ADD METADATA TO GEAR_ITEMS
-- ============================================================================

ALTER TABLE public.gear_items
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'good'
    CHECK (condition IN ('new', 'good', 'fair', 'poor')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_serviced DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================================
-- 3. UPDATE EXISTING ROWS WITH DEFAULT VALUES
-- ============================================================================

UPDATE public.gear_items
SET
  quantity_total = COALESCE(quantity_total, 1),
  quantity_available = COALESCE(quantity_available, 1),
  active = COALESCE(active, true),
  item_state = COALESCE(item_state, 'available'),
  condition = COALESCE(condition, 'good')
WHERE quantity_total IS NULL OR quantity_available IS NULL OR active IS NULL;

-- ============================================================================
-- 4. CREATE GEAR_IMAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gear_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id UUID REFERENCES gear_items(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gear_images_gear_id ON public.gear_images(gear_id);

-- ============================================================================
-- 5. ENABLE RLS ON GEAR_IMAGES
-- ============================================================================

ALTER TABLE public.gear_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Providers can manage own gear images" ON public.gear_images;
DROP POLICY IF EXISTS "Anyone can view gear images" ON public.gear_images;

-- Providers can manage their own gear images
CREATE POLICY "Providers can manage own gear images"
  ON public.gear_images FOR ALL
  USING (
    gear_id IN (
      SELECT gi.id FROM public.gear_items gi
      JOIN public.providers p ON gi.provider_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Anyone can view gear images (for marketplace)
CREATE POLICY "Anyone can view gear images"
  ON public.gear_images FOR SELECT
  USING (true);

-- ============================================================================
-- 6. CREATE UPDATED_AT TRIGGER FOR GEAR_ITEMS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_gear_items_updated_at ON public.gear_items;

-- Create trigger
CREATE TRIGGER update_gear_items_updated_at
  BEFORE UPDATE ON public.gear_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- New columns added to gear_items:
-- - quantity_total, quantity_available, item_state, active
-- - sku, condition, notes, last_serviced, updated_at
--
-- New table created:
-- - gear_images (with RLS policies)
--
-- ============================================================================
