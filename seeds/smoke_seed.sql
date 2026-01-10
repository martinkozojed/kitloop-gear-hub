-- 1. Get User ID for provider@test.cz and Provider ID
DO $$
DECLARE
    v_user_id uuid;
    v_provider_id uuid;
    v_product_id uuid;
    v_variant_id uuid;
    v_asset_id uuid;
    v_customer_id uuid;
    v_reservation_id uuid;
BEGIN
    -- Get User
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'provider@test.cz';
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User provider@test.cz not found';
    END IF;

    -- Get Provider (assuming single membership for test)
    SELECT provider_id INTO v_provider_id 
    FROM public.user_provider_memberships 
    WHERE user_id = v_user_id 
    LIMIT 1;

    IF v_provider_id IS NULL THEN
        RAISE NOTICE 'Provider not found for user, creating one...';
        -- Create a provider if missing (should exist from seed, but just in case)
        INSERT INTO public.providers (name, status, email, contact_name, phone)
        VALUES ('Test Provider', 'approved', 'provider@test.cz', 'Tester', '+420123456789')
        RETURNING id INTO v_provider_id;

        INSERT INTO public.user_provider_memberships (user_id, provider_id, role)
        VALUES (v_user_id, v_provider_id, 'owner');
    END IF;

    RAISE NOTICE 'User ID: %, Provider ID: %', v_user_id, v_provider_id;

    -- Create Product
    INSERT INTO public.products (provider_id, name, category, base_price_cents)
    VALUES (v_provider_id, 'Smoke Test Item', 'harness', 1000)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_product_id;
    
    -- Handle ON CONFLICT for RETURNING
    IF v_product_id IS NULL THEN
        SELECT id INTO v_product_id FROM public.products WHERE provider_id = v_provider_id AND name = 'Smoke Test Item';
    END IF;

    -- Create Variant
    INSERT INTO public.product_variants (product_id, name)
    VALUES (v_product_id, 'Standard')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_variant_id;

    IF v_variant_id IS NULL THEN
        SELECT id INTO v_variant_id FROM public.product_variants WHERE product_id = v_product_id AND name = 'Standard';
    END IF;

    -- Create Asset
    INSERT INTO public.assets (provider_id, variant_id, asset_tag, status)
    VALUES (v_provider_id, v_variant_id, 'SMOKE-001', 'active')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_asset_id;

    IF v_asset_id IS NULL THEN
        SELECT id INTO v_asset_id FROM public.assets WHERE provider_id = v_provider_id AND asset_tag = 'SMOKE-001';
    END IF;

    -- Create Customer
    INSERT INTO public.customers (provider_id, full_name, email, status)
    VALUES (v_provider_id, 'Smoke Customer', 'smoke@customer.com', 'active')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_customer_id;

    IF v_customer_id IS NULL THEN
        SELECT id INTO v_customer_id FROM public.customers WHERE provider_id = v_provider_id AND email = 'smoke@customer.com';
    END IF;

    -- Create Active Reservation (Started yesterday, ends tomorrow) - status 'active'
    INSERT INTO public.reservations (
        provider_id, product_variant_id, customer_name, customer_email, 
        start_date, end_date, status, payment_status, total_price, deposit_paid, 
        amount_total_cents, currency
    )
    VALUES (
        v_provider_id, v_variant_id, 'Smoke Customer', 'smoke@customer.com',
        now() - interval '1 day', now() + interval '1 day',
        'active', 'paid', 1000, true, 100000, 'CZK'
    )
    RETURNING id INTO v_reservation_id;

    -- Assign Asset
    INSERT INTO public.reservation_assignments (reservation_id, asset_id)
    VALUES (v_reservation_id, v_asset_id);

    RAISE NOTICE 'Created Active Reservation: % for Provider: %', v_reservation_id, v_provider_id;

END $$;
