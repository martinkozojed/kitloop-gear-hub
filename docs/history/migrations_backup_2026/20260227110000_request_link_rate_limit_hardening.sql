-- Request Link rate limit hardening: fixed-window wording, PII (IP hash only), IP parsing docs,
-- invalid_payload, REVOKE ALL, rejected_at + CHECK.
-- Do not edit old migrations.
-- =============================================================================
-- 1. Rate limit table comment: fixed window (not sliding)
-- =============================================================================
COMMENT ON TABLE public.request_submit_rate_buckets IS 'Fixed-window rate limit buckets (window anchored to first request in period). Cleanup: window_end < now() - 1 hour. bucket_key = type:identifier, 64-char hex (ip:<ip_hash>, token:<token_hash>).';
-- =============================================================================
-- 2. submit_request_public: accept p_ip_hash (no plaintext IP in DB), invalid_payload, REVOKE ALL
-- =============================================================================
DROP FUNCTION IF EXISTS public.submit_request_public(
  text,
  text,
  text,
  text,
  text,
  date,
  date,
  uuid,
  text,
  text
);
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
    )::int
  )
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
    )::int
  )
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
RETURN jsonb_build_object('request_id', v_request_id);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_request_public(
  text,
  text,
  text,
  text,
  text,
  date,
  date,
  uuid,
  text,
  text
)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_request_public(
    text,
    text,
    text,
    text,
    text,
    date,
    date,
    uuid,
    text,
    text
  ) TO service_role;
COMMENT ON FUNCTION public.submit_request_public IS 'Atomic: rate limit (per-IP hash + per-token, fixed window) + provider lookup + insert. No plaintext IP in DB. Returns request_id or rate_limited+retry_after_seconds or error.';
-- =============================================================================
-- 3. reservation_requests: rejected_at + CHECK
-- =============================================================================
ALTER TABLE public.reservation_requests
ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
UPDATE public.reservation_requests
SET rejected_at = updated_at
WHERE status = 'rejected'
  AND rejected_at IS NULL;
ALTER TABLE public.reservation_requests DROP CONSTRAINT IF EXISTS reservation_requests_status_converted_check;
ALTER TABLE public.reservation_requests
ADD CONSTRAINT reservation_requests_status_converted_check CHECK (
    (
      status = 'converted'
      AND converted_reservation_id IS NOT NULL
      AND converted_at IS NOT NULL
    )
    OR (
      status = 'rejected'
      AND rejected_at IS NOT NULL
      AND converted_reservation_id IS NULL
    )
    OR (
      status = 'pending'
      AND converted_reservation_id IS NULL
    )
  );
COMMENT ON COLUMN public.reservation_requests.rejected_at IS 'Set when request was rejected (for audit and CHECK).';
CREATE OR REPLACE FUNCTION public.set_rejected_at_on_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN -- Only on transition to rejected; do not overwrite rejected_at if already set (backfill / manual fixes).
  IF NEW.status = 'rejected'
  AND (
    OLD.status IS NULL
    OR OLD.status IS DISTINCT
    FROM 'rejected'
  )
  AND NEW.rejected_at IS NULL THEN NEW.rejected_at := now();
END IF;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reservation_requests_set_rejected_at ON public.reservation_requests;
CREATE TRIGGER reservation_requests_set_rejected_at BEFORE
UPDATE ON public.reservation_requests FOR EACH ROW EXECUTE FUNCTION public.set_rejected_at_on_reject();
COMMENT ON CONSTRAINT reservation_requests_status_converted_check ON public.reservation_requests IS 'status=converted => converted_* set; rejected => rejected_at set; pending => no conversion.';
-- =============================================================================
-- 4. SECURITY DEFINER: REVOKE ALL FROM PUBLIC on convert and token RPCs
-- =============================================================================
REVOKE ALL ON FUNCTION public.convert_request_to_reservation(
  uuid,
  uuid,
  integer,
  timestamptz,
  timestamptz,
  integer,
  text,
  text
)
FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_or_regenerate_request_link_token(uuid)
FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_provider_request_token(uuid)
FROM PUBLIC;