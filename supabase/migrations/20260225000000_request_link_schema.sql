-- Request Link: reservation_requests table, providers.request_link_token, RLS, RPCs

-- 1. Add request_link_token to providers (unique, for lookup without auth)
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS request_link_token text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_providers_request_link_token
  ON public.providers (request_link_token)
  WHERE request_link_token IS NOT NULL;

-- 2. reservation_requests table
CREATE TABLE IF NOT EXISTS public.reservation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  request_link_token text NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  requested_start_date date NOT NULL,
  requested_end_date date NOT NULL,
  product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  requested_gear_text text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rejected')),
  converted_reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservation_requests_provider_status
  ON public.reservation_requests (provider_id, status);
CREATE INDEX idx_reservation_requests_request_link_token
  ON public.reservation_requests (request_link_token);
CREATE INDEX idx_reservation_requests_created_at
  ON public.reservation_requests (created_at DESC);

ALTER TABLE public.reservation_requests ENABLE ROW LEVEL SECURITY;

-- RLS: anon cannot read/write; only service role or authenticated provider members can read
CREATE POLICY "Provider members can read own reservation_requests"
  ON public.reservation_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_provider_memberships upm
      WHERE upm.provider_id = reservation_requests.provider_id
        AND upm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = reservation_requests.provider_id AND p.user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE for authenticated directly; Edge uses service_role for INSERT
-- Provider members need UPDATE for "Odmítnout" and for mark_request_converted
CREATE POLICY "Provider members can update own reservation_requests"
  ON public.reservation_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_provider_memberships upm
      WHERE upm.provider_id = reservation_requests.provider_id
        AND upm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = reservation_requests.provider_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (true);

-- 3. RPC: generate_provider_request_token (SECURITY DEFINER, only for provider member)
CREATE OR REPLACE FUNCTION public.generate_provider_request_token(p_provider_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_is_member boolean;
BEGIN
  -- Only provider members (or owner) can generate
  SELECT EXISTS (
    SELECT 1 FROM public.user_provider_memberships upm
    WHERE upm.provider_id = p_provider_id AND upm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = p_provider_id AND p.user_id = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Access denied: not a member of this provider'
      USING ERRCODE = '42501';
  END IF;

  -- High entropy token (no plain UUID in URL): two UUIDs concatenated without dashes = 64 hex chars
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  UPDATE public.providers
  SET request_link_token = v_token,
      updated_at = now()
  WHERE id = p_provider_id;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_provider_request_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_provider_request_token(uuid) TO service_role;

-- 4. RPC: mark_request_converted (called after staff creates reservation from request)
CREATE OR REPLACE FUNCTION public.mark_request_converted(
  p_request_id uuid,
  p_reservation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id uuid;
  v_is_member boolean;
BEGIN
  SELECT provider_id INTO v_provider_id
  FROM public.reservation_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_provider_memberships upm
    WHERE upm.provider_id = v_provider_id AND upm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = v_provider_id AND p.user_id = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Access denied'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.reservation_requests
  SET status = 'converted',
      converted_reservation_id = p_reservation_id,
      updated_at = now()
  WHERE id = p_request_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_request_converted(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_request_converted(uuid, uuid) TO service_role;

-- Trigger updated_at for reservation_requests
CREATE OR REPLACE FUNCTION public.set_updated_at_reservation_requests()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservation_requests_set_updated_at ON public.reservation_requests;
CREATE TRIGGER reservation_requests_set_updated_at
  BEFORE UPDATE ON public.reservation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_reservation_requests();
