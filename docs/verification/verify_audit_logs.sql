-- docs/verification/verify_audit_logs.sql
-- Goal: Prove that provider_audit_logs are functioning correctly on reservations and gear_items
-- 1. Create a dummy item to trigger INSERT in gear_items
BEGIN;
-- We assume standard setup with at least one active provider
DO $$
DECLARE v_provider_id uuid;
v_user_id uuid;
v_product_id uuid;
v_variant_id uuid;
v_gear_item_id uuid;
v_reservation_id uuid;
BEGIN -- Grab a random provider and an admin from it
SELECT provider_id,
    user_id INTO v_provider_id,
    v_user_id
FROM public.provider_members
LIMIT 1;
IF v_provider_id IS NULL THEN RAISE EXCEPTION 'No provider found for the test';
END IF;
-- Create dummy product/variant
INSERT INTO public.products (provider_id, name, type)
VALUES (v_provider_id, 'Audit Test Product', 'gear')
RETURNING id INTO v_product_id;
INSERT INTO public.variants (product_id, name)
VALUES (v_product_id, 'Audit Test Variant')
RETURNING id INTO v_variant_id;
-- Trigger 1: INSERT on gear_items
INSERT INTO public.gear_items (
        provider_id,
        variant_id,
        external_key,
        condition_state
    )
VALUES (
        v_provider_id,
        v_variant_id,
        'AUDIT_TEST_1',
        'available'
    )
RETURNING id INTO v_gear_item_id;
-- Trigger 2: UPDATE on gear_items
UPDATE public.gear_items
SET condition_state = 'maintenance'
WHERE id = v_gear_item_id;
-- Trigger 3: INSERT on reservations
INSERT INTO public.reservations (
        provider_id,
        customer_name,
        start_time,
        end_time,
        status
    )
VALUES (
        v_provider_id,
        'Audit Test Customer',
        now(),
        now() + interval '1 day',
        'pending'
    )
RETURNING id INTO v_reservation_id;
-- Trigger 4: UPDATE on reservations
UPDATE public.reservations
SET status = 'confirmed'
WHERE id = v_reservation_id;
END $$;
-- 2. Verify Output
SELECT action,
    entity_table,
    old_data->>'condition_state' as old_state,
    new_data->>'condition_state' as new_state,
    old_data->>'status' as old_status,
    new_data->>'status' as new_status
FROM public.provider_audit_logs
WHERE CAST(new_data->>'external_key' AS text) = 'AUDIT_TEST_1'
    OR CAST(new_data->>'customer_name' AS text) = 'Audit Test Customer'
ORDER BY created_at ASC;
ROLLBACK;
-- If the query above returns 4 rows (INSERT gear, UPDATE gear, INSERT res, UPDATE res), the triggers work.