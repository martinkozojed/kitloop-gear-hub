-- STOP-THE-BLEED: restore provider issue/return runtime and hold expiry column compatibility

BEGIN;

-- A) Missing authz helper used by issue_reservation/process_return
CREATE OR REPLACE FUNCTION public.assert_provider_role(p_provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = '42501';
  END IF;

  -- Admin helpers already present in this repo.
  IF COALESCE(public.is_admin_trusted(), false) OR COALESCE(public.is_admin(), false) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.providers p
    WHERE p.id = p_provider_id
      AND p.user_id = v_actor
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.provider_members pm
    WHERE pm.provider_id = p_provider_id
      AND pm.user_id = v_actor
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_provider_memberships upm
    WHERE upm.provider_id = p_provider_id
      AND upm.user_id = v_actor
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'forbidden: user % is not allowed for provider %', v_actor, p_provider_id
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.assert_provider_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_provider_role(uuid) TO authenticated, service_role;

-- B) Remove stale 4-arg overload that wrote into admin_audit_logs.provider_id.
-- Callers passing 4 args will still resolve to the 5-arg function via default p_override_reason.
DROP FUNCTION IF EXISTS public.issue_reservation(uuid, uuid, uuid, boolean);

-- C) Fix stale column name in hold TTL cleanup.
CREATE OR REPLACE FUNCTION public.expire_stale_holds(retention_minutes integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count int;
  v_deleted_ids uuid[];
  v_is_service boolean := current_setting('request.jwt.claim.role', true) = 'service_role';
BEGIN
  IF NOT v_is_service THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  WITH expired_rows AS (
    SELECT id
    FROM public.reservations
    WHERE status = 'hold'
      AND updated_at < (now() - (retention_minutes || ' minutes')::interval)
    FOR UPDATE SKIP LOCKED
  ),
  updated_rows AS (
    UPDATE public.reservations
    SET status = 'cancelled',
        cancel_reason = 'ttl_expired',
        updated_at = now()
    WHERE id IN (SELECT id FROM expired_rows)
    RETURNING id
  )
  SELECT count(*), array_agg(id)
  INTO v_expired_count, v_deleted_ids
  FROM updated_rows;

  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'expired_ids', v_deleted_ids
  );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_holds(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_holds(integer) TO service_role;

COMMIT;
