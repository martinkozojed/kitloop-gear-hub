BEGIN;

-- 0. DEFINE CONSTANTS
-- Provider: 99999999-9999-9999-9999-999999999999
-- User: 88888888-8888-8888-8888-888888888888
-- Product: 77777777-7777-7777-7777-777777777777
-- Variant: 66666666-6666-6666-6666-666666666666
-- Asset: A-001 (ID auto or lookup)

-- 1. Setup Data
-- Create Provider
INSERT INTO public.providers (id, rental_name, contact_name, email, phone, name) 
VALUES ('99999999-9999-9999-9999-999999999999', 'Test Provider Rental 2', 'Test Contact 2', 'test2@provider.com', '+123456789', 'Test Provider 2')
ON CONFLICT (id) DO NOTHING;

-- Create User (Owner)
INSERT INTO auth.users (id, email) VALUES ('88888888-8888-8888-8888-888888888888', 'owner2@test.com')
ON CONFLICT (id) DO NOTHING;

-- Trigger handle_new_user auto-creates profile. Update it to be 'provider'.
UPDATE public.profiles SET role = 'provider' WHERE user_id = '88888888-8888-8888-8888-888888888888';

INSERT INTO public.user_provider_memberships (user_id, provider_id, role) 
VALUES ('88888888-8888-8888-8888-888888888888', '99999999-9999-9999-9999-999999999999', 'owner')
ON CONFLICT (user_id, provider_id) DO NOTHING;

-- Create Product + Variant + Asset
INSERT INTO public.products (id, provider_id, name, category, base_price_cents) 
VALUES ('77777777-7777-7777-7777-777777777777', '99999999-9999-9999-9999-999999999999', 'Test Ski', 'winter', 1000)
ON CONFLICT (id) DO NOTHING;

-- Legacy Sync (Required for reservations FK)
INSERT INTO public.gear_items_legacy (id, provider_id, name, active)
VALUES ('77777777-7777-7777-7777-777777777777', '99999999-9999-9999-9999-999999999999', 'Test Ski Legacy', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_variants (id, product_id, name, sku) 
VALUES ('66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', '180cm', 'SKI-180')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.assets (provider_id, variant_id, asset_tag, status) 
VALUES ('99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', 'A-001', 'available')
ON CONFLICT (provider_id, asset_tag) DO UPDATE SET status = 'available'; -- Reset status if exists

-- 2. Test: Unpaid Issue Fails
-- Create Unpaid Reservation
INSERT INTO public.reservations (
    id, gear_id, provider_id, customer_id, start_date, end_date, product_variant_id, 
    status, payment_status, quantity, customer_name, customer_email
)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '77777777-7777-7777-7777-777777777777', -- legacy ID ref placeholder
    '99999999-9999-9999-9999-999999999999', 
    '88888888-8888-8888-8888-888888888888', 
    now(), 
    now() + interval '1 day', 
    '66666666-6666-6666-6666-666666666666', 
    'confirmed', 
    'unpaid', 
    1,
    'Auto Test User',
    'user@test.com'
)
ON CONFLICT (id) DO UPDATE SET payment_status = 'unpaid', status = 'confirmed'; -- ensure raw state

-- Mock Auth Context (Simulate authenticated user)
SET LOCAL "request.jwt.claim.sub" = '88888888-8888-8888-8888-888888888888';

-- START TESTS
SELECT plan(10);

SELECT throws_ok(
    $$ SELECT public.issue_reservation(
        p_reservation_id := '55555555-5555-5555-5555-555555555555'::uuid, 
        p_provider_id := '99999999-9999-9999-9999-999999999999'::uuid, 
        p_user_id := '88888888-8888-8888-8888-888888888888'::uuid,
        p_override := false,
        p_override_reason := NULL::text
       ) $$,
    'P0003' -- PAYMENT_REQUIRED
);

-- 3. Test: Override Succeeds + Audit
SELECT lives_ok(
    $$ SELECT public.issue_reservation(
        p_reservation_id := '55555555-5555-5555-5555-555555555555'::uuid, 
        p_provider_id := '99999999-9999-9999-9999-999999999999'::uuid, 
        p_user_id := '88888888-8888-8888-8888-888888888888'::uuid, 
        p_override := true, 
        p_override_reason := 'VIP Customer'
       ) $$,
    'Override should succeed with reason'
);

-- Verify Audit
SELECT ok( EXISTS (
    SELECT 1 FROM public.audit_logs 
    WHERE action = 'issue_override' AND resource_id = '55555555-5555-5555-5555-555555555555'
), 'Audit log entry created for override' );

-- Verify Status
SELECT is( status, 'active', 'Reservation is active' ) FROM public.reservations WHERE id = '55555555-5555-5555-5555-555555555555';
-- Check asset
SELECT is( status, 'active', 'Asset is active' ) FROM public.assets WHERE asset_tag = 'A-001';

-- 4. Test: Return Restores Availability
SELECT lives_ok(
    $$ SELECT public.process_return(
        p_reservation_id := '55555555-5555-5555-5555-555555555555'::uuid, 
        p_provider_id := '99999999-9999-9999-9999-999999999999'::uuid, 
        p_user_id := '88888888-8888-8888-8888-888888888888'::uuid
       ) $$,
    'Return should succeed'
);
SELECT is( status, 'completed', 'Reservation completed' ) FROM public.reservations WHERE id = '55555555-5555-5555-5555-555555555555';
SELECT is( status, 'available', 'Asset returned to available' ) FROM public.assets WHERE asset_tag = 'A-001';

-- 5. Test: Maintenance Blocks Issue
-- Set asset to maintenance
UPDATE public.assets SET status = 'maintenance' WHERE asset_tag = 'A-001';

-- Create another reservation
INSERT INTO public.reservations (
    id, gear_id, provider_id, customer_id, start_date, end_date, product_variant_id, 
    status, payment_status, quantity, deposit_paid, customer_name
)
VALUES (
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777', 
    '99999999-9999-9999-9999-999999999999', 
    '88888888-8888-8888-8888-888888888888', 
    now(), 
    now() + interval '1 day', 
    '66666666-6666-6666-6666-666666666666', 
    'confirmed', 
    'paid', 
    1, 
    true,
    'Maint Test User'
)
ON CONFLICT (id) DO UPDATE SET status = 'confirmed'; -- Reset

SELECT throws_ok(
    $$ SELECT public.issue_reservation(
        p_reservation_id := '66666666-6666-6666-6666-666666666666'::uuid, 
        p_provider_id := '99999999-9999-9999-9999-999999999999'::uuid, 
        p_user_id := '88888888-8888-8888-8888-888888888888'::uuid,
        p_override := false,
        p_override_reason := NULL::text
       ) $$,
    'P0005' -- NO_ASSETS
);

-- Reset asset
UPDATE public.assets SET status = 'available' WHERE asset_tag = 'A-001';

-- 6. Test: Overbooking Guard (DB Level)
-- Capacity = 1. We have 1 active res (completed actually, so slots free).
-- Wait, we just completed res '555...'. So usage is 0.
-- Let's create Res A (Confirmed) overlapping Res B (Confirmed)
-- Res A
INSERT INTO public.reservations (
    gear_id, provider_id, customer_id, start_date, end_date, product_variant_id, 
    status, quantity, customer_name
)
VALUES (
    '77777777-7777-7777-7777-777777777777', 
    '99999999-9999-9999-9999-999999999999', 
    '88888888-8888-8888-8888-888888888888', 
    '2026-06-01', 
    '2026-06-05', 
    '66666666-6666-6666-6666-666666666666', 
    'confirmed', 
    1,
    'Overbook A'
)
ON CONFLICT (id) DO NOTHING;

-- Res B (Overlapping) -> Should Fail Trigger
SELECT throws_ok(
    $$ INSERT INTO public.reservations (
        gear_id, provider_id, customer_id, start_date, end_date, product_variant_id, status, quantity,
        customer_name
       )
       VALUES (
        '77777777-7777-7777-7777-777777777777', 
        '99999999-9999-9999-9999-999999999999', 
        '88888888-8888-8888-8888-888888888888', 
        '2026-06-02', 
        '2026-06-06', 
        '66666666-6666-6666-6666-666666666666', 
        'confirmed', 
        1,
        'Overbook B'
       ) $$,
    'P0001'
);

SELECT * FROM finish();
ROLLBACK;
