BEGIN;
SELECT plan(3);

-- 0. CONSTANTS
-- Provider: 1111...
-- Product: 2222...
-- Variant: 3333...
-- Assets: A-1, A-2

-- 1. SETUP
INSERT INTO public.providers (id, rental_name, contact_name, email, phone, name) 
VALUES ('10000000-0000-0000-0000-000000000001', 'MultiCap Rental', 'Contact', 'multi@test.com', '123', 'MultiCap')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, email) VALUES ('20000000-0000-0000-0000-000000000001', 'multi_owner@test.com')
ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles SET role = 'provider' WHERE user_id = '20000000-0000-0000-0000-000000000001';
INSERT INTO public.user_provider_memberships (user_id, provider_id, role) 
VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner')
ON CONFLICT DO NOTHING;

INSERT INTO public.products (id, provider_id, name, category, base_price_cents) 
VALUES ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Multi Ski', 'winter', 1000)
ON CONFLICT DO NOTHING;

-- Legacy Sync
INSERT INTO public.gear_items_legacy (id, provider_id, name, active)
VALUES ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Multi Ski Legacy', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.product_variants (id, product_id, name, sku) 
VALUES ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Standard', 'MULTI-001')
ON CONFLICT DO NOTHING;

-- CREATE 2 ASSETS
INSERT INTO public.assets (provider_id, variant_id, asset_tag, status) 
VALUES ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'ASSET-1', 'available')
ON CONFLICT (provider_id, asset_tag) DO UPDATE SET status='available';

INSERT INTO public.assets (provider_id, variant_id, asset_tag, status) 
VALUES ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'ASSET-2', 'available')
ON CONFLICT (provider_id, asset_tag) DO UPDATE SET status='available';

-- 2. TEST: Overbooking Logic
-- Target Date: 2026-07-01 to 2026-07-05
-- We have 2 assets.

-- Reservation 1: Should Succeed
INSERT INTO public.reservations (id, gear_id, provider_id, customer_id, start_date, end_date, product_variant_id, status, quantity, customer_name)
VALUES ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '2026-07-01', '2026-07-05', '40000000-0000-0000-0000-000000000001', 'confirmed', 1, 'Cust 1');
SELECT pass('Reservation 1 created (1/2 capacity)');

-- Reservation 2: Should Succeed (Overlapping)
INSERT INTO public.reservations (id, gear_id, provider_id, customer_id, start_date, end_date, product_variant_id, status, quantity, customer_name)
VALUES ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '2026-07-02', '2026-07-06', '40000000-0000-0000-0000-000000000001', 'confirmed', 1, 'Cust 2');
SELECT pass('Reservation 2 created (2/2 capacity)');

-- Reservation 3: Should Fail (Overlapping)
SELECT throws_ok(
    $$
    INSERT INTO public.reservations (gear_id, provider_id, customer_id, start_date, end_date, product_variant_id, status, quantity, customer_name)
    VALUES ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
            '2026-07-02', '2026-07-04', '40000000-0000-0000-0000-000000000001', 'confirmed', 1, 'Cust 3')
    $$,
    'P0001'
);

SELECT * FROM finish();
ROLLBACK;
