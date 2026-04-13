-- PR4-1B1: Harden create_reservation RPC
-- - Derive provider_id from variant→product (ignore client p_provider_id)
-- - Reject soft-deleted products/variants
-- - Filter assets.deleted_at IS NULL in availability count
-- - SECURITY DEFINER + SET search_path = public (needed: bypasses RLS for cross-table joins)

CREATE OR REPLACE FUNCTION public.create_reservation(
  p_provider_id uuid,
  p_user_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_total_price_cents integer,
  p_idempotency_key text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id UUID;
  v_existing_id UUID;
  v_existing_status TEXT;
  v_existing_expires TIMESTAMPTZ;
  v_derived_provider_id UUID;
  v_buffer_minutes INT;
  v_total_assets INT;
  v_reserved_count INT;
BEGIN
  -- 1. Idempotency check (before any locking)
  SELECT id, status, expires_at
    INTO v_existing_id, v_existing_status, v_existing_expires
  FROM public.reservations
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'reservation_id', v_existing_id,
      'status', v_existing_status,
      'expires_at', v_existing_expires,
      'idempotent', true
    );
  END IF;

  -- 2. Lock variant row (serialize concurrent bookings)
  PERFORM 1 FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;

  -- 3. Derive provider from variant→product; reject soft-deleted variant/product
  SELECT p.provider_id
    INTO v_derived_provider_id
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = p_variant_id
    AND pv.deleted_at IS NULL
    AND p.deleted_at IS NULL;

  IF v_derived_provider_id IS NULL THEN
    RAISE EXCEPTION 'Variant not found or deleted'
      USING ERRCODE = 'P0002';
  END IF;

  -- 4. Buffer from variant
  SELECT COALESCE(buffer_minutes, 1440)
    INTO v_buffer_minutes
  FROM public.product_variants
  WHERE id = p_variant_id;

  -- 5. Count available (non-deleted, non-retired/lost) assets
  SELECT COUNT(*)
    INTO v_total_assets
  FROM public.assets
  WHERE variant_id = p_variant_id
    AND deleted_at IS NULL
    AND status IN ('available', 'active');

  -- 6. Count overlapping confirmed/active/hold reservations
  SELECT COALESCE(SUM(quantity), 0)
    INTO v_reserved_count
  FROM public.reservations r
  WHERE r.product_variant_id = p_variant_id
    AND r.status IN ('hold', 'confirmed', 'active')
    AND r.start_date < p_end_date
    AND (r.end_date + (v_buffer_minutes || ' minutes')::interval) > p_start_date;

  IF (v_reserved_count + p_quantity) > v_total_assets THEN
    RAISE EXCEPTION 'Insufficient availability: % requested, % available (Total %, Booked %)',
      p_quantity, (v_total_assets - v_reserved_count), v_total_assets, v_reserved_count
      USING ERRCODE = 'P0001';
  END IF;

  -- 7. Insert reservation using derived provider
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
    created_at,
    updated_at
  )
  VALUES (
    v_derived_provider_id,
    p_user_id,
    p_variant_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_start_date,
    p_end_date,
    'hold',
    p_quantity,
    p_total_price_cents,
    p_idempotency_key,
    p_notes,
    now() + interval '15 minutes',
    now(),
    now()
  )
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'reservation_id', v_reservation_id,
    'status', 'hold',
    'expires_at', now() + interval '15 minutes'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_reservation(
  uuid, uuid, uuid, integer,
  timestamptz, timestamptz,
  text, text, text, integer, text, text
) TO service_role;
