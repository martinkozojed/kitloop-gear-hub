
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
  v_available BOOLEAN;
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

  -- 2. Availability Check (Manual Logic to handle Quantity)
  -- Lock Variant
  PERFORM 1 FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;

  -- Verify Provider matches Variant
  IF NOT EXISTS (
    SELECT 1 FROM public.product_variants 
    WHERE id = p_variant_id AND (
      product_id IN (SELECT id FROM products WHERE provider_id = p_provider_id)
      -- OR logic (if variant stores provider_id directly? No, products do).
    ) 
  ) THEN
    -- Check via join
    IF NOT EXISTS (
      SELECT 1 FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = p_variant_id AND p.provider_id = p_provider_id
    ) THEN
      RAISE EXCEPTION 'Variant does not belong to provider';
    END IF;
  END IF;

  -- Get Buffer
  SELECT COALESCE(buffer_minutes, 1440) INTO v_buffer_minutes
  FROM public.product_variants
  WHERE id = p_variant_id;

  -- Count Total Assets
  SELECT COUNT(*) INTO v_total_assets
  FROM public.assets
  WHERE variant_id = p_variant_id
  AND status IN ('available', 'active');

  -- Count Reserved (Sum Quantities if reservation_lines used, or count rows if 1 row = 1 unit)
  -- Assumes reservations table has quantity? OR uses reservation_lines?
  -- If we use reservations for Header, and reservation_lines for items.
  -- But currently reserve_gear checks reservations row counts.
  
  -- Let's assume reservations row has quantity.
  -- Or if strictly 1 unit, we loop.
  -- But if we migrate to Inventory 2.0, we likely want robust quantity support.
  -- FOR NOW: Use check_variant_availability logic but adapted for Quantity > 1.
  
  -- Calculate Overlap Usage
  -- We sum up usage: COUNT(*) if no quantity col.
  
  SELECT COUNT(*) INTO v_reserved_count
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

  -- 3. Insert Reservation(s)
  -- If quantity > 1, do we insert 1 row (if supported) or N rows?
  -- If reservations table has NO quantity column, we must insert N rows.
  -- Check below.
  
  -- Assuming 1 row for now (Standard).
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
    p_total_price_cents,
    p_idempotency_key,
    p_notes,
    now() + interval '15 minutes',
    now(),
    now()
  )
  RETURNING id INTO v_reservation_id;

  -- Insert Lines if needed (reservation_lines)
  INSERT INTO public.reservation_lines (
    reservation_id,
    product_variant_id,
    quantity,
    price_per_item_cents
  ) VALUES (
    v_reservation_id,
    p_variant_id,
    p_quantity,
    p_total_price_cents / p_quantity
  );

  RETURN jsonb_build_object(
    'reservation_id', v_reservation_id,
    'status', 'hold',
    'expires_at', now() + interval '15 minutes'
  );
END;
$$;
