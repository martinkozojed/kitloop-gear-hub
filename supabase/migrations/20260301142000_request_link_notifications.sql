-- Add notification enqueueing to submit_request_public
-- Integrates the Request Link feature with the new Notification Infrastructure
CREATE OR REPLACE FUNCTION public.submit_request_public(
        p_ip_hash text,
        p_token_hash text,
        p_customer_name text,
        p_customer_email text,
        p_customer_phone text,
        p_requested_start_date date,
        p_requested_end_date date,
        p_product_variant_id uuid DEFAULT NULL,
        p_requested_gear_text text DEFAULT NULL,
        p_notes text DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_ip_key text;
v_token_key text;
v_window_end timestamptz;
v_count int;
v_limit_ip int := 5;
v_limit_token int := 10;
v_window_min interval := interval '15 min';
v_ttl interval := interval '1 hour';
v_provider_id uuid;
v_request_id uuid;
v_retry_sec int;
BEGIN -- bucket_key: type:identifier (unique, stable). Full 64-char hex for ip and token. No plaintext IP stored.
v_ip_key := 'ip:' || left(COALESCE(trim(p_ip_hash), ''), 64);
v_token_key := 'token:' || left(p_token_hash, 64);
DELETE FROM public.request_submit_rate_buckets
WHERE window_end < now() - v_ttl;
INSERT INTO public.request_submit_rate_buckets (bucket_key, window_end, count)
VALUES (v_ip_key, now() + v_window_min, 1) ON CONFLICT (bucket_key) DO
UPDATE
SET window_end = CASE
        WHEN request_submit_rate_buckets.window_end <= now() THEN now() + v_window_min
        ELSE request_submit_rate_buckets.window_end
    END,
    count = CASE
        WHEN request_submit_rate_buckets.window_end <= now() THEN 1
        ELSE request_submit_rate_buckets.count + 1
    END
RETURNING count,
    window_end INTO v_count,
    v_window_end;
IF v_count > v_limit_ip THEN v_retry_sec := greatest(
    1,
    (
        extract(
            epoch
            from (v_window_end - now())
        )
    )::int
);
RETURN jsonb_build_object(
    'rate_limited',
    true,
    'retry_after_seconds',
    v_retry_sec
);
END IF;
INSERT INTO public.request_submit_rate_buckets (bucket_key, window_end, count)
VALUES (v_token_key, now() + v_window_min, 1) ON CONFLICT (bucket_key) DO
UPDATE
SET window_end = CASE
        WHEN request_submit_rate_buckets.window_end <= now() THEN now() + v_window_min
        ELSE request_submit_rate_buckets.window_end
    END,
    count = CASE
        WHEN request_submit_rate_buckets.window_end <= now() THEN 1
        ELSE request_submit_rate_buckets.count + 1
    END
RETURNING count,
    window_end INTO v_count,
    v_window_end;
IF v_count > v_limit_token THEN v_retry_sec := greatest(
    1,
    (
        extract(
            epoch
            from (v_window_end - now())
        )
    )::int
);
RETURN jsonb_build_object(
    'rate_limited',
    true,
    'retry_after_seconds',
    v_retry_sec
);
END IF;
SELECT id INTO v_provider_id
FROM public.providers
WHERE request_link_token_hash = p_token_hash;
IF v_provider_id IS NULL THEN RETURN jsonb_build_object('error', 'invalid_token');
END IF;
IF p_product_variant_id IS NOT NULL THEN IF NOT EXISTS (
    SELECT 1
    FROM public.product_variants pv
        JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = p_product_variant_id
        AND p.provider_id = v_provider_id
) THEN RETURN jsonb_build_object('error', 'invalid_payload');
END IF;
END IF;
INSERT INTO public.reservation_requests (
        provider_id,
        request_link_token_hash,
        customer_name,
        customer_email,
        customer_phone,
        requested_start_date,
        requested_end_date,
        product_variant_id,
        requested_gear_text,
        notes,
        status
    )
VALUES (
        v_provider_id,
        p_token_hash,
        trim(p_customer_name),
        nullif(trim(p_customer_email), ''),
        nullif(trim(p_customer_phone), ''),
        p_requested_start_date,
        p_requested_end_date,
        p_product_variant_id,
        nullif(trim(p_requested_gear_text), ''),
        nullif(trim(p_notes), ''),
        'pending'
    )
RETURNING id INTO v_request_id;
-- ENQUEUE NOTIFICATIONS for the new request
INSERT INTO public.notification_outbox (
        provider_id,
        user_id,
        kind,
        channel,
        priority,
        idempotency_key,
        payload
    )
SELECT v_provider_id,
    u.user_id,
    'ops.booking_request.new',
    'inapp',
    1,
    'booking_request:new:' || v_request_id || ':' || u.user_id,
    jsonb_build_object(
        'request_id',
        v_request_id,
        'customer_name',
        trim(p_customer_name),
        'requested_start_date',
        p_requested_start_date,
        'requested_end_date',
        p_requested_end_date
    )
FROM (
        SELECT user_id
        FROM public.providers
        WHERE id = v_provider_id
        UNION
        SELECT user_id
        FROM public.user_provider_memberships
        WHERE provider_id = v_provider_id
    ) u;
RETURN jsonb_build_object('request_id', v_request_id);
END;
$$;