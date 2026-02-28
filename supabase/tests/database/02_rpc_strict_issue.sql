BEGIN;
-- 1. CLEANUP (Standard data cleaning)
DELETE FROM public.audit_logs
WHERE provider_id = 'f0000000-0000-0000-0000-000000000010';
DELETE FROM public.reservation_assignments
WHERE reservation_id IN (
        SELECT id
        FROM public.reservations
        WHERE provider_id = 'f0000000-0000-0000-0000-000000000010'
    );
DELETE FROM public.reservations
WHERE provider_id = 'f0000000-0000-0000-0000-000000000010';
DELETE FROM public.provider_members
WHERE provider_id = 'f0000000-0000-0000-0000-000000000010';
DELETE FROM public.user_provider_memberships
WHERE provider_id = 'f0000000-0000-0000-0000-000000000010';
DELETE FROM public.assets
WHERE provider_id = 'f0000000-0000-0000-0000-000000000010';
DELETE FROM public.product_variants
WHERE product_id IN (
        SELECT id
        FROM public.products
        WHERE provider_id = 'f0000000-0000-0000-0000-000000000010'
    );
DELETE FROM public.products
WHERE provider_id = 'f0000000-0000-0000-0000-000000000010';
DELETE FROM public.gear_items_legacy
WHERE provider_id = 'f0000000-0000-0000-0000-000000000010';
DELETE FROM public.providers
WHERE id = 'f0000000-0000-0000-0000-000000000010';
DELETE FROM public.profiles
WHERE user_id = 'f0000000-0000-0000-0000-000000000011';
DELETE FROM auth.users
WHERE id = 'f0000000-0000-0000-0000-000000000011';
SELECT plan(11);
-- 2. SETUP DATA
INSERT INTO auth.users (id, email)
VALUES (
        'f0000000-0000-0000-0000-000000000011',
        'owner2@test.com'
    );
UPDATE public.profiles
SET role = 'provider'
WHERE user_id = 'f0000000-0000-0000-0000-000000000011';
INSERT INTO public.providers (
        id,
        user_id,
        rental_name,
        contact_name,
        email,
        phone,
        name
    )
VALUES (
        'f0000000-0000-0000-0000-000000000010',
        'f0000000-0000-0000-0000-000000000011',
        'Test Rental',
        'Contact',
        'test@test.com',
        '123',
        'Test'
    );
INSERT INTO public.provider_members (user_id, provider_id, role)
VALUES (
        'f0000000-0000-0000-0000-000000000011',
        'f0000000-0000-0000-0000-000000000010',
        'owner'
    );
INSERT INTO public.products (id, provider_id, name, category)
VALUES (
        'f0000000-0000-0000-0000-000000000012',
        'f0000000-0000-0000-0000-000000000010',
        'Ski',
        'winter'
    );
INSERT INTO public.gear_items_legacy (id, provider_id, name, active)
VALUES (
        'f0000000-0000-0000-0000-000000000012',
        'f0000000-0000-0000-0000-000000000010',
        'Ski Legacy',
        true
    );
INSERT INTO public.product_variants (id, product_id, name)
VALUES (
        'f0000000-0000-0000-0000-000000000013',
        'f0000000-0000-0000-0000-000000000012',
        '180cm'
    );
INSERT INTO public.assets (id, provider_id, variant_id, asset_tag, status)
VALUES (
        'f0000000-0000-0000-0000-000000000014',
        'f0000000-0000-0000-0000-000000000010',
        'f0000000-0000-0000-0000-000000000013',
        'TAG1',
        'available'
    );
INSERT INTO public.reservations (
        id,
        gear_id,
        provider_id,
        start_date,
        end_date,
        product_variant_id,
        status,
        payment_status,
        quantity,
        customer_name
    )
VALUES (
        'f0000000-0000-0000-0000-000000000015',
        'f0000000-0000-0000-0000-000000000012',
        'f0000000-0000-0000-0000-000000000010',
        '2030-01-01',
        '2030-01-05',
        'f0000000-0000-0000-0000-000000000013',
        'confirmed',
        'unpaid',
        1,
        'Tester'
    );
INSERT INTO public.reservation_assignments (reservation_id, asset_id, assigned_at)
VALUES (
        'f0000000-0000-0000-0000-000000000015',
        'f0000000-0000-0000-0000-000000000014',
        now()
    );
-- 3. AUTH MOCK
SELECT set_config(
        'request.jwt.claim.sub',
        'f0000000-0000-0000-0000-000000000011',
        true
    );
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
-- 4. TESTS
SELECT is(
        auth.uid(),
        'f0000000-0000-0000-0000-000000000011'::uuid,
        'Auth mock ok'
    );
-- Test 1: Issue works even if unpaid (Current logic behavior)
SELECT lives_ok(
        $$
        SELECT public.issue_reservation(
                'f0000000-0000-0000-0000-000000000015',
                'f0000000-0000-0000-0000-000000000010',
                'f0000000-0000-0000-0000-000000000011'
            ) $$,
            'Issue should succeed regardless of payment (current logic)'
    );
SELECT is(status, 'active', 'Res active')
FROM public.reservations
WHERE id = 'f0000000-0000-0000-0000-000000000015';
SELECT is(status, 'active', 'Asset active')
FROM public.assets
WHERE id = 'f0000000-0000-0000-0000-000000000014';
-- Test 2: Status check failure (Cancelled cannot be issued without override)
UPDATE public.reservations
SET status = 'cancelled'
WHERE id = 'f0000000-0000-0000-0000-000000000015';
SELECT throws_ok(
        $$
        SELECT public.issue_reservation(
                'f0000000-0000-0000-0000-000000000015',
                'f0000000-0000-0000-0000-000000000010',
                'f0000000-0000-0000-0000-000000000011'
            ) $$,
            'P0001',
            NULL,
            -- ANY message starting with error code
            'Cancelled fails'
    );
-- Test 3: Override works for cancelled
SELECT lives_ok(
        $$
        SELECT public.issue_reservation(
                'f0000000-0000-0000-0000-000000000015',
                'f0000000-0000-0000-0000-000000000010',
                'f0000000-0000-0000-0000-000000000011',
                true,
                'Late pickup'
            ) $$,
            'Issue override ok'
    );
-- Test 4: Return
SELECT lives_ok(
        $$
        SELECT public.process_return(
                'f0000000-0000-0000-0000-000000000015',
                false,
                'Clean return'
            ) $$,
            'Return ok'
    );
SELECT is(status, 'completed', 'Res completed')
FROM public.reservations
WHERE id = 'f0000000-0000-0000-0000-000000000015';
SELECT is(status, 'available', 'Asset available')
FROM public.assets
WHERE id = 'f0000000-0000-0000-0000-000000000014';
-- Test 5: Maintenance return
INSERT INTO public.reservations (
        id,
        gear_id,
        provider_id,
        start_date,
        end_date,
        product_variant_id,
        status,
        payment_status,
        quantity,
        customer_name
    )
VALUES (
        'f0000000-0000-0000-0000-000000000016',
        'f0000000-0000-0000-0000-000000000012',
        'f0000000-0000-0000-0000-000000000010',
        '2030-02-01',
        '2030-02-05',
        'f0000000-0000-0000-0000-000000000013',
        'confirmed',
        'paid',
        1,
        'Maint'
    );
INSERT INTO public.reservation_assignments (reservation_id, asset_id, assigned_at)
VALUES (
        'f0000000-0000-0000-0000-000000000016',
        'f0000000-0000-0000-0000-000000000014',
        now()
    );
-- Issue it using SELECT instead of PERFORM in SQL script
SELECT public.issue_reservation(
        'f0000000-0000-0000-0000-000000000016',
        'f0000000-0000-0000-0000-000000000010',
        'f0000000-0000-0000-0000-000000000011'
    );
-- Return with damage
SELECT public.process_return(
        'f0000000-0000-0000-0000-000000000016',
        true,
        'Broken'
    );
SELECT is(status, 'maintenance', 'Asset in maintenance')
FROM public.assets
WHERE id = 'f0000000-0000-0000-0000-000000000014';
-- Final Check
SELECT ok(
        EXISTS (
            SELECT 1
            FROM public.audit_logs
            WHERE action = 'reservation.issue'
                AND resource_id = 'f0000000-0000-0000-0000-000000000016'
        ),
        'Audit log exists (issue)'
    );
SELECT *
FROM finish();
ROLLBACK;