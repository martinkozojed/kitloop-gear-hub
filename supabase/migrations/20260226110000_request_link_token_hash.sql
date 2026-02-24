-- Request Link: store token as hash only (never plaintext). Emergency regenerate in v1.
-- Requires pgcrypto for gen_random_bytes and digest.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. providers: replace request_link_token with request_link_token_hash
-- =============================================================================
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS request_link_token_hash text,
  ADD COLUMN IF NOT EXISTS request_link_created_at timestamptz;

-- Migrate existing plaintext to hash so existing links keep working until next regenerate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'providers' AND column_name = 'request_link_token'
  ) THEN
    UPDATE public.providers
    SET request_link_token_hash = encode(digest(request_link_token, 'sha256'), 'hex'),
        request_link_created_at = COALESCE(request_link_created_at, updated_at)
    WHERE request_link_token IS NOT NULL AND request_link_token != '';
    ALTER TABLE public.providers DROP COLUMN IF EXISTS request_link_token;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_request_link_token_hash
  ON public.providers (request_link_token_hash)
  WHERE request_link_token_hash IS NOT NULL;

COMMENT ON COLUMN public.providers.request_link_token_hash IS 'SHA256 hex (64 chars) of the request link token. Token never stored.';
COMMENT ON COLUMN public.providers.request_link_created_at IS 'When the current request link was created (for UI: link active since).';

-- =============================================================================
-- 2. reservation_requests: store token_hash for audit, not plaintext
-- =============================================================================
ALTER TABLE public.reservation_requests
  ADD COLUMN IF NOT EXISTS request_link_token_hash text;

-- Migrate existing: hash the old token if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservation_requests' AND column_name = 'request_link_token'
  ) THEN
    UPDATE public.reservation_requests
    SET request_link_token_hash = encode(digest(request_link_token, 'sha256'), 'hex')
    WHERE request_link_token IS NOT NULL AND request_link_token != '';
    ALTER TABLE public.reservation_requests DROP COLUMN IF EXISTS request_link_token;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservation_requests_token_hash
  ON public.reservation_requests (request_link_token_hash)
  WHERE request_link_token_hash IS NOT NULL;

COMMENT ON COLUMN public.reservation_requests.request_link_token_hash IS 'Snapshot of token hash when request was submitted (audit).';

-- =============================================================================
-- 3. generate_or_regenerate_request_link_token: returns token once, stores only hash
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_or_regenerate_request_link_token(p_provider_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_token_hash text;
  v_is_member boolean;
BEGIN
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

  -- Token: base64url(32 bytes) without padding (no +, /, or = so URL-safe)
  v_token := replace(replace(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+', '-'), '/', '_');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  UPDATE public.providers
  SET request_link_token_hash = v_token_hash,
      request_link_created_at = now(),
      updated_at = now()
  WHERE id = p_provider_id;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_or_regenerate_request_link_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_or_regenerate_request_link_token(uuid) TO service_role;

COMMENT ON FUNCTION public.generate_or_regenerate_request_link_token IS 'Returns token once; stores only SHA256 hex. Old link stops working.';

-- Keep legacy name as wrapper so existing callers still work
CREATE OR REPLACE FUNCTION public.generate_provider_request_token(p_provider_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.generate_or_regenerate_request_link_token(p_provider_id);
$$;
GRANT EXECUTE ON FUNCTION public.generate_provider_request_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_provider_request_token(uuid) TO service_role;
