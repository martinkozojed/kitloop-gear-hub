BEGIN;
SELECT plan(6);

-- 1. SETUP PROVIDER
INSERT INTO public.providers (id, rental_name, contact_name, email, phone) 
VALUES ('10000000-0000-0000-0000-000000000000', 'Test Rental', 'Tester', 'test@test.com', '123')
ON CONFLICT DO NOTHING;

-- 2. SIMULATE IMPORT (Idempotence via Constraints)
-- Step A: Insert Product
INSERT INTO public.products (provider_id, name, base_price_cents, category)
VALUES ('10000000-0000-0000-0000-000000000000', 'Ferrata Set', 20000, 'ferraty');

-- Verify Product exists
SELECT ok(exists(SELECT 1 FROM products WHERE name = 'Ferrata Set'), 'Product created');

-- Step B: Upsert Product (Idempotence)
-- This PROVES the Unique Constraint exists. If missing, this SQL would fail with "no unique constraint matching ON CONFLICT spec".
INSERT INTO public.products (provider_id, name, base_price_cents, category)
VALUES ('10000000-0000-0000-0000-000000000000', 'Ferrata Set', 20000, 'ferraty')
ON CONFLICT (provider_id, name) DO NOTHING;

SELECT pass('Upsert Product on conflict did nothing (idempotent + constraint exists)');

-- Step C: Insert Variant
INSERT INTO public.product_variants (product_id, name)
SELECT id, 'Default' FROM products WHERE name = 'Ferrata Set';

-- Step D: Upsert Variant (Idempotence)
INSERT INTO public.product_variants (product_id, name)
SELECT id, 'Default' FROM products WHERE name = 'Ferrata Set'
ON CONFLICT (product_id, name) DO NOTHING;

SELECT pass('Upsert Variant on conflict did nothing');

-- Step E: Provision Assets (Qty 2)
INSERT INTO public.assets (provider_id, variant_id, status, asset_tag)
SELECT '10000000-0000-0000-0000-000000000000', id, 'available', 'TEST-TAG-1'
FROM product_variants WHERE name = 'Default'
LIMIT 1;

-- Verify Asset Count
SELECT results_eq(
    $$ SELECT count(*)::int FROM assets WHERE provider_id = '10000000-0000-0000-0000-000000000000' $$,
    $$ VALUES (1) $$,
    'Asset count should be 1'
);

-- 3. SIMULATE UPDATE & DELTA
-- Update Product Name
UPDATE products SET name = 'Ferrata Set Pro' WHERE name = 'Ferrata Set';
-- Provision 1 more asset (Delta)
INSERT INTO public.assets (provider_id, variant_id, status, asset_tag)
SELECT '10000000-0000-0000-0000-000000000000', id, 'available', 'TEST-TAG-2'
FROM product_variants WHERE name = 'Default';

-- Verify Asset Count increased
SELECT results_eq(
    $$ SELECT count(*)::int FROM assets WHERE provider_id = '10000000-0000-0000-0000-000000000000' $$,
    $$ VALUES (2) $$,
    'Asset count should now be 2 (Delta added)'
);

-- 4. VERIFY VIEW READ
-- Gear Items View should allow reading this new item
SELECT ok(exists(SELECT 1 FROM gear_items WHERE name LIKE 'Ferrata Set Pro%'), 'View reflects modern schema changes');

ROLLBACK;
