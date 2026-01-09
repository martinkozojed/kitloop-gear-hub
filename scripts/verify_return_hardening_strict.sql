-- Strict Verification Script: Return Flow Hardening (Fix v2)
-- Usage: supabase db execute --file scripts/verify_return_hardening_strict.sql

BEGIN;

DO $$
DECLARE
    -- IDs
    v_user_a UUID := gen_random_uuid();
    v_user_b UUID := gen_random_uuid();
    v_provider_a UUID := gen_random_uuid();
    v_provider_b UUID := gen_random_uuid();
    v_asset_a UUID;
    v_product_a UUID;
    v_variant_a UUID;
    v_legacy_item_a UUID;
    v_reservation_a UUID;
    v_report_id UUID;
    v_report_res JSONB;
    v_attach_res JSONB;
    
    -- Evidence
    v_valid_evidence JSONB;
    v_invalid_provider_evidence JSONB;
    v_invalid_res_evidence JSONB;
    v_invalid_report_evidence JSONB;
    v_path_traversal_evidence JSONB;

BEGIN
    RAISE NOTICE '🚀 STARTING STRICT VERIFICATION...';

    ---------------------------------------------------------------------------
    -- 1. SETUP DATA
    ---------------------------------------------------------------------------
    -- Create Users
    INSERT INTO auth.users (id, email) VALUES (v_user_a, 'usera@example.com');
    INSERT INTO auth.users (id, email) VALUES (v_user_b, 'userb@example.com');
    -- Profiles are auto-created by trigger on auth.users insert
    -- Just update roles
    UPDATE public.profiles SET role = 'customer' WHERE user_id = v_user_a;
    UPDATE public.profiles SET role = 'customer' WHERE user_id = v_user_b;

    -- Create Providers (Owner is User A, User B respectively)
    -- NOTE: Using user_id as verified in schema
    INSERT INTO public.providers (id, user_id, name, rental_name, contact_name, email, phone, verified, approved_at) 
    VALUES (v_provider_a, v_user_a, 'Provider A', 'Rental A', 'Contact A', 'a@example.com', '123', true, now());
    
    INSERT INTO public.providers (id, user_id, name, rental_name, contact_name, email, phone, verified, approved_at) 
    VALUES (v_provider_b, v_user_b, 'Provider B', 'Rental B', 'Contact B', 'b@example.com', '123', true, now());

    -- Asset for A
    INSERT INTO public.gear_items_legacy (id, provider_id, name, quantity_total, quantity_available, active)
    VALUES (gen_random_uuid(), v_provider_a, 'Legacy Item A', 10, 10, true) RETURNING id INTO v_legacy_item_a;

    -- Create Product/Variant for Asset consistency
    INSERT INTO public.products (provider_id, name, category) VALUES (v_provider_a, 'Product A', 'Other') RETURNING id INTO v_product_a;
    INSERT INTO public.product_variants (product_id, name) VALUES (v_product_a, 'Variant A') RETURNING id INTO v_variant_a;

    -- Use generated asset ID
    v_asset_a := gen_random_uuid();
    INSERT INTO public.assets (id, provider_id, variant_id, status, asset_tag) 
    VALUES (v_asset_a, v_provider_a, v_variant_a, 'active', 'TAG-A'); -- Sync gear/asset IDs simplification

    -- Active Reservation for A by User B (Customer)
    INSERT INTO public.reservations (provider_id, user_id, gear_id, product_variant_id, start_date, end_date, status, quantity)
    VALUES (v_provider_a, v_user_b, v_legacy_item_a, v_variant_a, now(), now() + interval '1 day', 'active', 1)
    RETURNING id INTO v_reservation_a;
    
    INSERT INTO public.reservation_assignments (reservation_id, asset_id)
    VALUES (v_reservation_a, v_asset_a);

    RAISE NOTICE '✅ Setup Complete (Provider A, Asset A, Reservation A active).';

    ---------------------------------------------------------------------------
    -- 2. CREATE REPORT (Positive Case)
    ---------------------------------------------------------------------------
    -- Mock Auth as Provider A (Owner)
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);

    v_report_res := public.create_return_report(
        p_reservation_id := v_reservation_a,
        p_provider_id := v_provider_a,
        p_damage_reports := ('[{"asset_id": "' || v_asset_a || '", "damaged": true, "note": "Scratched"}]')::jsonb
    );

    v_report_id := (v_report_res->>'report_id')::uuid;

    IF v_report_id IS NULL THEN
        RAISE EXCEPTION '❌ Failed to create report';
    END IF;
    
    RAISE NOTICE '✅ create_return_report succeeded. Report ID: %', v_report_id;

    ---------------------------------------------------------------------------
    -- 3. IDEMPOTENCE (Negative Case)
    ---------------------------------------------------------------------------
    BEGIN
        PERFORM public.create_return_report(
            p_reservation_id := v_reservation_a,
            p_provider_id := v_provider_a
        );
        RAISE EXCEPTION '❌ Idempotence check FAILED. Should have raised P0003.';
    EXCEPTION WHEN SQLSTATE 'P0003' THEN
        RAISE NOTICE '✅ Idempotence confirmed (caught P0003).';
    END;

    ---------------------------------------------------------------------------
    -- 4. ATTACH PHOTOS (Path Validation Negative Cases)
    ---------------------------------------------------------------------------
    
    -- Format: {provider_id}/{reservation_id}/{report_id}/{file}
    
    -- A) Invalid Provider Prefix
    v_invalid_provider_evidence := json_build_array(json_build_object(
        'asset_id', v_asset_a,
        'path', v_provider_b || '/' || v_reservation_a || '/' || v_report_id || '/img.jpg'
    ));

    BEGIN
        PERFORM public.attach_return_photos(v_report_id, v_invalid_provider_evidence);
        RAISE EXCEPTION '❌ Validation FAILED: Allowed invalid provider prefix.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Path provider mismatch%' THEN
             RAISE NOTICE '✅ Caught invalid provider prefix.';
        ELSE
             RAISE EXCEPTION '❌ Wrong error for provider mismatch: %', SQLERRM;
        END IF;
    END;

    -- B) Invalid Reservation Prefix
    v_invalid_res_evidence := json_build_array(json_build_object(
        'asset_id', v_asset_a,
        'path', v_provider_a || '/' || gen_random_uuid() || '/' || v_report_id || '/img.jpg'
    ));

    BEGIN
        PERFORM public.attach_return_photos(v_report_id, v_invalid_res_evidence);
        RAISE EXCEPTION '❌ Validation FAILED: Allowed invalid reservation segment.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Path reservation mismatch%' THEN
             RAISE NOTICE '✅ Caught invalid reservation segment.';
        ELSE
             RAISE EXCEPTION '❌ Wrong error for reservation mismatch: %', SQLERRM;
        END IF;
    END;

   -- C) Invalid Report Prefix
    v_invalid_report_evidence := json_build_array(json_build_object(
        'asset_id', v_asset_a,
        'path', v_provider_a || '/' || v_reservation_a || '/' || gen_random_uuid() || '/img.jpg'
    ));

    BEGIN
        PERFORM public.attach_return_photos(v_report_id, v_invalid_report_evidence);
        RAISE EXCEPTION '❌ Validation FAILED: Allowed invalid report segment.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Path report mismatch%' THEN
             RAISE NOTICE '✅ Caught invalid report segment.';
        ELSE
             RAISE EXCEPTION '❌ Wrong error for report mismatch: %', SQLERRM;
        END IF;
    END;

   -- D) Path Traversal
    v_path_traversal_evidence := json_build_array(json_build_object(
        'asset_id', v_asset_a,
        'path', v_provider_a || '/' || v_reservation_a || '/' || v_report_id || '/../secret.jpg'
    ));

    BEGIN
        PERFORM public.attach_return_photos(v_report_id, v_path_traversal_evidence);
        RAISE EXCEPTION '❌ Validation FAILED: Allowed path traversal.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Invalid path traversal%' THEN
             RAISE NOTICE '✅ Caught path traversal.';
        ELSE
             RAISE EXCEPTION '❌ Wrong error for traversal: %', SQLERRM;
        END IF;
    END;

    ---------------------------------------------------------------------------
    -- 5. ATTACH PHOTOS (Positive Case)
    ---------------------------------------------------------------------------
    v_valid_evidence := json_build_array(json_build_object(
        'asset_id', v_asset_a,
        'path', v_provider_a || '/' || v_reservation_a || '/' || v_report_id || '/valid_evidence.jpg'
    ));

    v_attach_res := public.attach_return_photos(v_report_id, v_valid_evidence);
    
    RAISE NOTICE '✅ attach_return_photos succeeded.';

    ---------------------------------------------------------------------------
    -- 6. VERIFY FINAL STATE
    ---------------------------------------------------------------------------
    -- Check return_reports
    PERFORM 1 FROM public.return_reports 
    WHERE id = v_report_id 
    AND (photo_evidence->0->>'path') = (v_valid_evidence->0->>'path');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '❌ Database verification failed. Photo evidence not found.';
    END IF;
    RAISE NOTICE '✅ DB State: Photo evidence persisted correctly.';
    
    -- Check Asset Status (Maintenance)
    PERFORM 1 FROM public.assets WHERE id = v_asset_a AND status = 'maintenance';
    IF NOT FOUND THEN
        RAISE EXCEPTION '❌ Asset status verification failed. Should be maintenance.';
    END IF;
    RAISE NOTICE '✅ DB State: Asset status updated to maintenance.';

    -- Check Reservation Status (Completed)
    PERFORM 1 FROM public.reservations WHERE id = v_reservation_a AND status = 'completed';
    IF NOT FOUND THEN
        RAISE EXCEPTION '❌ Reservation status verification failed. Should be completed.';
    END IF;
    RAISE NOTICE '✅ DB State: Reservation completed.';

    RAISE NOTICE '🎉 ALL STRICT VERIFICATIONS PASSED!';
END $$;

ROLLBACK; -- Always rollback after test
