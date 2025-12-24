-- Add product_variant_id to reservations table
ALTER TABLE public.reservations 
ADD COLUMN product_variant_id UUID REFERENCES public.product_variants(id);

-- Make gear_id nullable since we might reserve via product_variant_id now (Inventory 2.0)
ALTER TABLE public.reservations 
ALTER COLUMN gear_id DROP NOT NULL;

-- Add index for performance on the new column
CREATE INDEX idx_reservations_product_variant_id ON public.reservations(product_variant_id);
