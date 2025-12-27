-- CRM Logic (RPCs)

-- 1. Upsert Customer (Deduplication Logic)
CREATE OR REPLACE FUNCTION public.upsert_crm_customer(
    p_full_name TEXT,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_account_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_provider_id UUID;
    v_customer_id UUID;
BEGIN
    -- Get provider_id
    SELECT id INTO v_provider_id FROM providers WHERE user_id = auth.uid();
    IF v_provider_id IS NULL THEN
        RAISE EXCEPTION 'User is not a provider';
    END IF;

    -- Normalize inputs
    IF p_email = '' THEN p_email := NULL; END IF;
    IF p_phone = '' THEN p_phone := NULL; END IF;

    -- 1. Try to find by Email
    IF p_email IS NOT NULL THEN
        SELECT id INTO v_customer_id FROM customers 
        WHERE provider_id = v_provider_id AND lower(email) = lower(p_email) LIMIT 1;
    END IF;

    -- 2. Try to find by Phone (if not found yet)
    IF v_customer_id IS NULL AND p_phone IS NOT NULL THEN
        SELECT id INTO v_customer_id FROM customers 
        WHERE provider_id = v_provider_id AND phone = p_phone LIMIT 1;
    END IF;

    IF v_customer_id IS NOT NULL THEN
        -- UPDATE existing
        UPDATE customers SET
            full_name = p_full_name,
            email = COALESCE(p_email, email),
            phone = COALESCE(p_phone, phone),
            notes = COALESCE(p_notes, notes), -- Only update if new note provided? Or overwrite? 
            -- Logic: If p_notes is provided, append/overwrite. Let's allow overwrite for MVP editor.
            tags = CASE WHEN p_tags IS NOT NULL THEN p_tags ELSE tags END,
            account_id = COALESCE(p_account_id, account_id),
            updated_at = now()
        WHERE id = v_customer_id;
    ELSE
        -- INSERT new
        INSERT INTO customers (provider_id, full_name, email, phone, notes, tags, account_id)
        VALUES (v_provider_id, p_full_name, p_email, p_phone, p_notes, COALESCE(p_tags, '{}'), p_account_id)
        RETURNING id INTO v_customer_id;
        
        -- Log creation event
        INSERT INTO customer_events (provider_id, customer_id, type, title, created_by)
        VALUES (v_provider_id, v_customer_id, 'system', 'Customer Profile Created', auth.uid());
    END IF;

    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Get Customer 360 View
CREATE OR REPLACE FUNCTION public.get_customer_360(p_customer_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_customer JSONB;
    v_account JSONB;
    v_active_reservation_count INTEGER;
    v_total_spend INTEGER; -- In cents
BEGIN
    -- Check permissions
    PERFORM 1 FROM customers WHERE id = p_customer_id AND provider_id = (SELECT id FROM providers WHERE user_id = auth.uid());
    IF NOT FOUND THEN RAISE EXCEPTION 'Access denied or customer not found'; END IF;

    -- Get Customer Data
    SELECT row_to_json(c)::jsonb INTO v_customer FROM customers c WHERE id = p_customer_id;

    -- Get Account Data (if any)
    IF (v_customer->>'account_id') IS NOT NULL THEN
         SELECT row_to_json(a)::jsonb INTO v_account FROM accounts a WHERE id = (v_customer->>'account_id')::uuid;
    END IF;

    -- Mock/Simple Stats (To be expanded with Reservation logic)
    -- For now, just return 0 to prevent complex joins if reservations table isn't migrated to link customer_id yet.
    v_active_reservation_count := 0; 
    v_total_spend := 0;

    RETURN jsonb_build_object(
        'profile', v_customer,
        'account', v_account,
        'stats', jsonb_build_object(
            'active_reservations', v_active_reservation_count,
            'total_spend_cents', v_total_spend,
            'risk_score', 0
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
