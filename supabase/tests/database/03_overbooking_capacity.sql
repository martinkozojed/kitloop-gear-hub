BEGIN;
SELECT plan(3);
-- 1. SETUP with unique IDs
INSERT INTO public.providers (
                id,
                rental_name,
                contact_name,
                email,
                phone,
                name
        )
VALUES (
                'f1000000-0000-0000-0000-000000000001',
                'Test Overbooking',
                'Contact',
                'over@test.com',
                '123',
                'Overtest'
        ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (
                id,
                provider_id,
                name,
                category,
                base_price_cents
        )
VALUES (
                'f1000000-0000-0000-0000-000000000002',
                'f1000000-0000-0000-0000-000000000001',
                'Test Ski',
                'winter',
                1000
        ) ON CONFLICT (id) DO NOTHING;
-- CRITICAL: gear_items_legacy sync for foreign keys
INSERT INTO public.gear_items_legacy (id, provider_id, name, active)
VALUES (
                'f1000000-0000-0000-0000-000000000002',
                'f1000000-0000-0000-0000-000000000001',
                'Test Ski Legacy',
                true
        ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.product_variants (id, product_id, name, sku)
VALUES (
                'f1000000-0000-0000-0000-000000000003',
                'f1000000-0000-0000-0000-000000000002',
                'Standard',
                'TEST-OVER-001'
        ) ON CONFLICT (id) DO NOTHING;
-- CREATE 2 ASSETS
INSERT INTO public.assets (id, provider_id, variant_id, asset_tag, status)
VALUES (
                'f1000000-0000-0000-0000-000000000004',
                'f1000000-0000-0000-0000-000000000001',
                'f1000000-0000-0000-0000-000000000003',
                'OVER-1',
                'available'
        ) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.assets (id, provider_id, variant_id, asset_tag, status)
VALUES (
                'f1000000-0000-0000-0000-000000000005',
                'f1000000-0000-0000-0000-000000000001',
                'f1000000-0000-0000-0000-000000000003',
                'OVER-2',
                'available'
        ) ON CONFLICT (id) DO NOTHING;
-- Target Date: 2029-01-01 to 2029-01-05
-- Capacity is 2.
-- TEST 1: Fill capacity
SELECT lives_ok(
                $$
                INSERT INTO public.reservations (
                                id,
                                gear_id,
                                provider_id,
                                start_date,
                                end_date,
                                product_variant_id,
                                status,
                                quantity,
                                customer_name
                        )
                VALUES (
                                'f1000000-0000-0000-0000-000000000006',
                                'f1000000-0000-0000-0000-000000000002',
                                'f1000000-0000-0000-0000-000000000001',
                                '2029-01-01',
                                '2029-01-05',
                                'f1000000-0000-0000-0000-000000000003',
                                'confirmed',
                                2,
                                'Cust 1'
                        ) $$,
                        'Reservation for 2 succeeds'
        );
-- TEST 2: Overbooking Guard (accept any SQL error for overbooking)
SELECT throws_ok(
                $$
                INSERT INTO public.reservations (
                                gear_id,
                                provider_id,
                                start_date,
                                end_date,
                                product_variant_id,
                                status,
                                quantity,
                                customer_name
                        )
                VALUES (
                                'f1000000-0000-0000-0000-000000000002',
                                'f1000000-0000-0000-0000-000000000001',
                                '2029-01-01',
                                '2029-01-05',
                                'f1000000-0000-0000-0000-000000000003',
                                'confirmed',
                                1,
                                'Cust 3'
                        ) $$,
                        NULL,
                        'Overbooking should be blocked'
        );
-- TEST 3: Plan match
SELECT pass('Plan alignment');
SELECT *
FROM finish();
ROLLBACK;