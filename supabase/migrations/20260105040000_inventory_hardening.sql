-- Migration: Inventory Hardening
-- Date: 2026-01-05
-- Goal: Ensure idempotence via DB Constraints for Products and Variants.

-- 1. Products: Unique Name per Provider
-- Note: This might fail if there are existing duplicates. 
-- In a real prod env, we would need to check/clean duplicates first. 
-- For MVP/Dev, we assume clean slate or we accept failure if dupes exist.
ALTER TABLE public.products
  ADD CONSTRAINT products_provider_name_unique UNIQUE (provider_id, name);

-- 2. Variants: Unique Name per Product
ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_product_name_unique UNIQUE (product_id, name);
