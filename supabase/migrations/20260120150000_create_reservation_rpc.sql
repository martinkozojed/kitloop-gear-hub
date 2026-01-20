
-- Migration: Create create_reservation RPC
-- Handles Inventory 2.0 checks and atomic insertion.

CREATE OR REPLACE FUNCTION public.create_reservation(
  p_provider_id UUID,
  p_user_id UUID,
  p_variant_id UUID,
  p_quantity INT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_total_price_cents INT,
  p_idempotency_key TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_reservation_id UUID;
  v_existing_id UUID;
  v_existing_status TEXT;
  v_existing_expires TIMESTAMPTZ;
  v_buffer_minutes INT;
  v_total_assets INT;
  v_reserved_count INT;
BEGIN
  -- 1. Idempotency Check
  SELECT id, status, expires_at INTO v_existing_id, v_existing_status, v_existing_expires
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

  -- 2. Availability Check
  -- Lock Variant (Serialize access)
  PERFORM 1 FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;

  -- Verify Provider matches Variant linked via Product
  IF NOT EXISTS (
    SELECT 1 FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = p_variant_id AND p.provider_id = p_provider_id
  ) THEN
    RAISE EXCEPTION 'Variant does not belong to provider';
  END IF;

  -- Get Buffer
  SELECT COALESCE(buffer_minutes, 1440) INTO v_buffer_minutes
  FROM public.product_variants
  WHERE id = p_variant_id;

  -- Count Total Assets (Capacity)
  SELECT COUNT(*) INTO v_total_assets
  FROM public.assets
  WHERE variant_id = p_variant_id
  AND status IN ('available', 'active');

  -- Count Reserved Quantity (Inventory 2.0 strict check)
  -- Sum quantity of all overlapping bookings
  SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_count
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

  -- 3. Insert Reservation
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
    p_provider_id,
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
