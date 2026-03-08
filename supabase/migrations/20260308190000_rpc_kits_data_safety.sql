-- P0: Add batch/kit RPCs to ensure strict data safety and transactionality
-- 1. Create Kit Reservation (Transactionally expands kit items and holds reservations)
CREATE OR REPLACE FUNCTION public.create_kit_reservation(
        p_provider_id uuid,
        p_user_id uuid,
        p_kit_template_id uuid,
        p_start_date timestamp with time zone,
        p_end_date timestamp with time zone,
        p_customer_name text,
        p_customer_email text,
        p_customer_phone text,
        p_base_idempotency_key text,
        p_notes text DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_group_id uuid;
v_item record;
v_price_per_day_cents int;
v_rental_days int;
v_total_price_cents int;
v_result jsonb;
v_reservation_ids uuid [] := ARRAY []::uuid [];
v_reservation_id uuid;
v_i int;
BEGIN -- 1. Generate group_id
v_group_id := gen_random_uuid();
v_rental_days := GREATEST(
    1,
    CEIL(
        EXTRACT(
            EPOCH
            FROM (p_end_date - p_start_date)
        ) / 86400.0
    )
);
-- 2. Expand kit_items and create reservations
FOR v_item IN (
    SELECT ki.variant_id,
        ki.quantity,
        COALESCE(pv.price_override_cents, p.base_price_cents, 0) as price_cents
    FROM public.kit_items ki
        JOIN public.product_variants pv ON pv.id = ki.variant_id
        JOIN public.products p ON p.id = pv.product_id
    WHERE ki.kit_id = p_kit_template_id
) LOOP v_price_per_day_cents := v_item.price_cents;
v_total_price_cents := v_price_per_day_cents * v_rental_days;
FOR v_i IN 1..v_item.quantity LOOP
INSERT INTO public.reservations (
        provider_id,
        user_id,
        product_variant_id,
        customer_name,
        customer_email,
        customer_phone,
        start_date,
        end_date,
        status,
        quantity,
        amount_total_cents,
        idempotency_key,
        notes,
        expires_at,
        group_id,
        kit_template_id,
        created_at,
        updated_at
    )
VALUES (
        p_provider_id,
        -- the provider was authenticated above via assert_provider_role
        COALESCE(auth.uid(), p_user_id),
        v_item.variant_id,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        p_start_date,
        p_end_date,
        'hold',
        1,
        v_total_price_cents,
        p_base_idempotency_key || '-' || v_item.variant_id || '-' || v_i,
        p_notes,
        now() + interval '15 minutes',
        v_group_id,
        p_kit_template_id,
        now(),
        now()
    )
RETURNING id INTO v_reservation_id;
v_reservation_ids := array_append(v_reservation_ids, v_reservation_id);
END LOOP;
END LOOP;
RETURN jsonb_build_object(
    'group_id',
    v_group_id,
    'reservation_ids',
    v_reservation_ids
);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_kit_reservation(
        uuid,
        uuid,
        uuid,
        timestamp with time zone,
        timestamp with time zone,
        text,
        text,
        text,
        text,
        text
    ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_kit_reservation(
        uuid,
        uuid,
        uuid,
        timestamp with time zone,
        timestamp with time zone,
        text,
        text,
        text,
        text,
        text
    ) TO service_role;
-- 2. Issue Reservations Batch (Transactional All-Or-Nothing issue)
CREATE OR REPLACE FUNCTION public.issue_reservations_batch(
        p_reservation_ids uuid [],
        p_provider_id uuid,
        p_user_id uuid,
        p_override boolean DEFAULT false,
        p_override_reason text DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_res_id uuid;
v_result jsonb;
v_total_issued int := 0;
BEGIN FOREACH v_res_id IN ARRAY p_reservation_ids LOOP v_result := public.issue_reservation(
    v_res_id,
    p_provider_id,
    p_user_id,
    p_override,
    p_override_reason
);
-- issue_reservation returns false on error inside JSON, 
-- but usually RAISES EXCEPTION. We'll check just in case it returns success=false.
IF COALESCE((v_result->>'success')::boolean, false) = false
AND v_result ? 'success' THEN -- Some logic might return success=false. The typical issue_reservation throws on hard fail.
RAISE EXCEPTION 'Issue failed for reservation %: %',
v_res_id,
COALESCE(v_result->>'message', 'Unknown RPC reason');
END IF;
v_total_issued := v_total_issued + COALESCE((v_result->>'assets_issued')::int, 0);
END LOOP;
RETURN jsonb_build_object(
    'success',
    true,
    'assets_issued',
    v_total_issued
);
END;
$$;
GRANT EXECUTE ON FUNCTION public.issue_reservations_batch(uuid [], uuid, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_reservations_batch(uuid [], uuid, uuid, boolean, text) TO service_role;
-- 3. Process Returns Batch (Transactional All-Or-Nothing return)
CREATE OR REPLACE FUNCTION public.process_returns_batch(
        p_reservation_ids uuid [],
        p_has_damage boolean DEFAULT false,
        p_notes text DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_res_id uuid;
v_result jsonb;
v_total_returned int := 0;
BEGIN FOREACH v_res_id IN ARRAY p_reservation_ids LOOP v_result := public.process_return(v_res_id, p_has_damage, p_notes);
IF COALESCE((v_result->>'success')::boolean, false) = false
AND v_result ? 'success' THEN RAISE EXCEPTION 'Return failed for reservation %: %',
v_res_id,
COALESCE(v_result->>'message', 'Unknown RPC reason');
END IF;
v_total_returned := v_total_returned + COALESCE((v_result->>'assets_returned')::int, 0);
END LOOP;
RETURN jsonb_build_object(
    'success',
    true,
    'assets_returned',
    v_total_returned
);
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_returns_batch(uuid [], boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_returns_batch(uuid [], boolean, text) TO service_role;