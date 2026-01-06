-- Migration: Overbooking Guard
-- Date: 2026-01-05
-- Goal: Prevent creating or updating a reservation to 'confirmed'/'active' state if it exceeds available capacity.
-- Strategy: Trigger on reservations table that locks the Variant row to serialize checks.

CREATE OR REPLACE FUNCTION public.check_overbooking_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_buffer_minutes INT;
  v_total_assets INT;
  v_reserved_count INT;
  v_variant_id UUID;
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only check if status is 'confirmed' or 'active' (blocking inventory)
  -- If status is 'pending', 'draft', 'cancelled', 'completed', we usually don't block or we have different rules.
  -- Pilot Rule: Only CONFIRMED/ACTIVE blocks inventory.
  
  IF NEW.status NOT IN ('confirmed', 'active') THEN
    RETURN NEW;
  END IF;

  v_variant_id := NEW.product_variant_id;
  v_start_date := NEW.start_date;
  v_end_date := NEW.end_date;

  -- 1. SERIALIZE ACCESS
  -- Lock the variant row to prevent concurrent bookings from racing past the check.
  PERFORM 1 FROM public.product_variants WHERE id = v_variant_id FOR SHARE; 
  -- Note: FOR SHARE allows others to read properties, but we might want FOR UPDATE to serialize strictly if we are writing reservation counts?
  -- Actually, to prevent "Write Skew" where two transactions read avail=1 and both book, we need to enforce order.
  -- Simple way: Lock the Parent Variant.
  PERFORM 1 FROM public.product_variants WHERE id = v_variant_id FOR UPDATE;

  -- 2. GET TOTAL CAPACITY
  -- Count assets that are NOT retired/lost
  SELECT COUNT(*) INTO v_total_assets
  FROM public.assets
  WHERE variant_id = v_variant_id
  AND status NOT IN ('retired', 'lost');

  -- 3. GET BUFFER (if any)
  SELECT COALESCE(attributes->>'buffer_minutes', '0')::int INTO v_buffer_minutes
  FROM public.product_variants
  WHERE id = v_variant_id;
  
  -- If null, default to 0
  v_buffer_minutes := COALESCE(v_buffer_minutes, 0);

  -- 4. COUNT OVERLAPPING RESERVATIONS
  -- Overlap logic: (StartA < EndB) and (EndA > StartB)
  -- We exclude the current reservation (NEW.id) to allow updates
  SELECT COUNT(*) INTO v_reserved_count
  FROM public.reservations r
  WHERE r.product_variant_id = v_variant_id
  AND r.status IN ('confirmed', 'active')
  AND r.id != NEW.id -- Exclude self
  AND r.start_date < v_end_date
  AND (r.end_date + (v_buffer_minutes || ' minutes')::interval) > v_start_date;

  -- 5. CHECK CAPACITY
  IF (v_reserved_count + 1) > v_total_assets THEN -- +1 for the current reservation
    RAISE EXCEPTION 'Availability Exceeded: Variant % has % assets, but % are already booked/overlapping.', v_variant_id, v_total_assets, v_reserved_count
      USING ERRCODE = 'P0001'; -- Custom code, or use standard '23000' integrity check
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_overbooking_guard ON public.reservations;

CREATE TRIGGER trg_overbooking_guard
  BEFORE INSERT OR UPDATE
  ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_overbooking_guard();
