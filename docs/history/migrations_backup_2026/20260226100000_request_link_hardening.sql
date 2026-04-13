-- Request Link hardening: atomic convert + token hash only
-- Do not edit old migrations. This adds new columns, RPCs, and migrates token to hash-only.

-- =============================================================================
-- 1. reservation_requests: add converted_at for audit; ensure single conversion
-- =============================================================================
ALTER TABLE public.reservation_requests
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

COMMENT ON COLUMN public.reservation_requests.converted_at IS 'Set when request was converted to a reservation (same transaction).';

-- Unique so one request maps to at most one reservation (idempotent convert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservation_requests_converted_reservation_id
  ON public.reservation_requests (converted_reservation_id)
  WHERE converted_reservation_id IS NOT NULL;

-- =============================================================================
-- 2. convert_request_to_reservation: atomic create + mark converted, idempotent
-- =============================================================================
CREATE OR REPLACE FUNCTION public.convert_request_to_reservation(
  p_request_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_total_price_cents integer,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.reservation_requests%ROWTYPE;
  v_is_member boolean;
  v_reservation_id uuid;
  v_idempotency_key text;
  v_rpc_result jsonb;
BEGIN
  v_idempotency_key := COALESCE(NULLIF(trim(p_idempotency_key), ''), 'convert-' || p_request_id::text);

  -- 1. Lock request row and load it
  SELECT * INTO v_req
  FROM public.reservation_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. Idempotence: already converted -> return existing reservation_id
  IF v_req.status = 'converted' THEN
    RETURN v_req.converted_reservation_id;
  END IF;

  IF v_req.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending (status: %)', v_req.status
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Ownership: caller must be provider member
  SELECT EXISTS (
    SELECT 1 FROM public.user_provider_memberships upm
    WHERE upm.provider_id = v_req.provider_id AND upm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = v_req.provider_id AND p.user_id = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Access denied: not a member of this provider'
      USING ERRCODE = '42501';
  END IF;

  -- 4. Create reservation (reuse existing validation path)
  SELECT public.create_reservation(
    v_req.provider_id,
    auth.uid(),
    p_variant_id,
    p_quantity,
    p_start_date,
    p_end_date,
    v_req.customer_name,
    v_req.customer_email,
    v_req.customer_phone,
    p_total_price_cents,
    v_idempotency_key,
    COALESCE(NULLIF(trim(p_notes), ''), v_req.notes)
  ) INTO v_rpc_result;

  v_reservation_id := (v_rpc_result->>'reservation_id')::uuid;

  -- 5. Mark request converted in same transaction
  UPDATE public.reservation_requests
  SET status = 'converted',
      converted_reservation_id = v_reservation_id,
      converted_at = now(),
      updated_at = now()
  WHERE id = p_request_id AND status = 'pending';

  RETURN v_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_request_to_reservation(uuid, uuid, integer, timestamptz, timestamptz, integer, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_request_to_reservation(uuid, uuid, integer, timestamptz, timestamptz, integer, text, text)
  TO service_role;

COMMENT ON FUNCTION public.convert_request_to_reservation IS 'Atomic: lock request, validate pending + ownership, create_reservation, mark converted. Idempotent: second call returns existing reservation_id.';
