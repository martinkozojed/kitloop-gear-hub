-- Harden SECURITY DEFINER functions (grants, search_path, auth guards)
BEGIN;
-- Core helpers use CREATE OR REPLACE to avoid dropping RLS policies that depend on them.
-- If signatures change, specific drops should be added here.
-- 1) issue_reservation: add search_path, trusted authZ, derive actor from auth.uid() unless service_role
DROP FUNCTION IF EXISTS public.issue_reservation(UUID, UUID, UUID, BOOLEAN, TEXT);
CREATE OR REPLACE FUNCTION public.issue_reservation(
        p_reservation_id UUID,
        p_provider_id UUID,
        p_user_id UUID,
        p_override BOOLEAN DEFAULT false,
        p_override_reason TEXT DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    auth,
    extensions AS $$
DECLARE v_reservation RECORD;
v_asset_id UUID;
v_quantity INT;
v_assigned_count INT;
v_needed_count INT;
v_updated_count INT := 0;
v_actor uuid;
v_is_service boolean := current_setting('request.jwt.claim.role', true) = 'service_role';
BEGIN IF auth.uid() IS NULL
AND NOT v_is_service THEN RAISE EXCEPTION 'Not authenticated';
END IF;
v_actor := COALESCE(auth.uid(), p_user_id);
IF NOT (
    v_is_service
    OR public.is_admin_trusted()
    OR EXISTS (
        SELECT 1
        FROM public.provider_members pm
        WHERE pm.provider_id = p_provider_id
            AND pm.user_id = v_actor
    )
    OR EXISTS (
        SELECT 1
        FROM public.providers p
        WHERE p.id = p_provider_id
            AND p.user_id = v_actor
    )
) THEN RAISE EXCEPTION 'Access Denied: You are not a member/owner/admin of this provider.';
END IF;
-- 1. Lock and Get Reservation
SELECT * INTO v_reservation
FROM public.reservations
WHERE id = p_reservation_id
    AND provider_id = p_provider_id FOR
UPDATE;
IF v_reservation IS NULL THEN RAISE EXCEPTION 'Reservation not found or access denied (provider_id mismatch) %',
p_reservation_id;
END IF;
-- 2. Validate Status
IF v_reservation.status = 'active' THEN RETURN jsonb_build_object(
    'success',
    true,
    'message',
    'Already active',
    'status',
    'active'
);
END IF;
IF v_reservation.status != 'confirmed' THEN RAISE EXCEPTION 'Reservation must be confirmed to be issued. Current status: %',
v_reservation.status USING ERRCODE = 'P0002';
END IF;
-- 3. Validate Payment
IF NOT (
    v_reservation.payment_status = 'paid'
    OR v_reservation.deposit_paid = true
    OR p_override = true
) THEN RAISE EXCEPTION 'Payment Required: Reservation is not paid and no override provided.' USING ERRCODE = 'P0003';
END IF;
-- 4. Audit Log for Override
IF p_override THEN IF p_override_reason IS NULL
OR length(trim(p_override_reason)) < 3 THEN RAISE EXCEPTION 'Override Reason is required when bypassing payment checks.' USING ERRCODE = 'P0004';
END IF;
INSERT INTO public.audit_logs (
        provider_id,
        user_id,
        action,
        resource_id,
        metadata
    )
VALUES (
        p_provider_id,
        v_actor,
        'issue_override',
        p_reservation_id::text,
        jsonb_build_object(
            'reason',
            p_override_reason,
            'payment_status',
            v_reservation.payment_status
        )
    );
END IF;
-- 5. Auto-Assign Assets if needed
v_quantity := v_reservation.quantity;
SELECT count(*) INTO v_assigned_count
FROM public.reservation_assignments
WHERE reservation_id = p_reservation_id;
v_needed_count := v_quantity - v_assigned_count;
IF v_needed_count > 0 THEN FOR v_asset_id IN
SELECT id
FROM public.assets
WHERE variant_id = v_reservation.product_variant_id
    AND status = 'available'
    AND provider_id = p_provider_id
LIMIT v_needed_count FOR
UPDATE SKIP LOCKED LOOP
UPDATE public.reservation_assignments
SET returned_at = NULL
WHERE reservation_id = p_reservation_id
    AND asset_id = v_asset_id;
UPDATE public.assets
SET status = 'active',
    location = 'Customer'
WHERE id = v_asset_id;
INSERT INTO public.reservation_assignments (
        reservation_id,
        asset_id,
        assigned_at,
        checked_out_by
    )
VALUES (
        p_reservation_id,
        v_asset_id,
        now(),
        v_actor
    ) ON CONFLICT DO NOTHING;
v_updated_count := v_updated_count + 1;
END LOOP;
END IF;
-- 6. Update Reservation Status
UPDATE public.reservations
SET status = 'active',
    updated_at = NOW()
WHERE id = p_reservation_id;
RETURN jsonb_build_object(
    'success',
    true,
    'status',
    'active',
    'assets_issued',
    v_updated_count
);
END;
$$;
REVOKE ALL ON FUNCTION public.issue_reservation(UUID, UUID, UUID, BOOLEAN, TEXT)
FROM PUBLIC,
    anon,
    authenticated;
GRANT EXECUTE ON FUNCTION public.issue_reservation(UUID, UUID, UUID, BOOLEAN, TEXT) TO service_role;
-- 2) process_return: add search_path, trusted authZ, derive actor
DROP FUNCTION IF EXISTS public.process_return(UUID, UUID, UUID, JSONB);
CREATE OR REPLACE FUNCTION public.process_return(
        p_reservation_id UUID,
        p_provider_id UUID,
        p_user_id UUID,
        p_damage_reports JSONB DEFAULT '[]'::jsonb
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    auth,
    extensions AS $$
DECLARE v_assign RECORD;
v_actor uuid;
v_is_service boolean := current_setting('request.jwt.claim.role', true) = 'service_role';
BEGIN IF auth.uid() IS NULL
AND NOT v_is_service THEN RAISE EXCEPTION 'Not authenticated';
END IF;
v_actor := COALESCE(auth.uid(), p_user_id);
IF NOT (
    v_is_service
    OR public.is_admin_trusted()
    OR EXISTS (
        SELECT 1
        FROM public.provider_members pm
        WHERE pm.provider_id = p_provider_id
            AND pm.user_id = v_actor
    )
    OR EXISTS (
        SELECT 1
        FROM public.providers p
        WHERE p.id = p_provider_id
            AND p.user_id = v_actor
    )
) THEN RAISE EXCEPTION 'Access Denied: You are not a member/owner/admin of this provider.';
END IF;
PERFORM 1
FROM public.reservations
WHERE id = p_reservation_id
    AND provider_id = p_provider_id
    AND status = 'active' FOR
UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Active reservation not found';
END IF;
FOR v_assign IN
SELECT asset_id,
    id
FROM public.reservation_assignments
WHERE reservation_id = p_reservation_id LOOP
UPDATE public.assets
SET status = 'available',
    location = 'Warehouse',
    updated_at = now()
WHERE id = v_assign.asset_id;
UPDATE public.reservation_assignments
SET returned_at = now(),
    checked_in_by = v_actor
WHERE id = v_assign.id;
END LOOP;
UPDATE public.reservations
SET status = 'completed',
    updated_at = now()
WHERE id = p_reservation_id;
RETURN jsonb_build_object('success', true, 'status', 'completed');
END;
$$;
REVOKE ALL ON FUNCTION public.process_return(UUID, UUID, UUID, JSONB)
FROM PUBLIC,
    anon,
    authenticated;
GRANT EXECUTE ON FUNCTION public.process_return(UUID, UUID, UUID, JSONB) TO service_role;
-- 3) expire_stale_holds: service-only, search_path
DROP FUNCTION IF EXISTS public.expire_stale_holds(int);
CREATE OR REPLACE FUNCTION public.expire_stale_holds(retention_minutes int DEFAULT 30) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    auth,
    extensions AS $$
DECLARE v_expired_count int;
v_deleted_ids uuid [];
v_is_service boolean := current_setting('request.jwt.claim.role', true) = 'service_role';
BEGIN IF NOT v_is_service THEN RAISE EXCEPTION 'Service role required';
END IF;
WITH expired_rows AS (
    SELECT id
    FROM public.reservations
    WHERE status = 'hold'
        AND updated_at < (
            now() - (retention_minutes || ' minutes')::interval
        ) FOR
    UPDATE SKIP LOCKED
),
updated_rows AS (
    UPDATE public.reservations
    SET status = 'cancelled',
        cancellation_reason = 'ttl_expired',
        updated_at = now()
    WHERE id IN (
            SELECT id
            FROM expired_rows
        )
    RETURNING id
)
SELECT count(*),
    array_agg(id) INTO v_expired_count,
    v_deleted_ids
FROM updated_rows;
RETURN jsonb_build_object(
    'success',
    true,
    'expired_count',
    v_expired_count,
    'expired_ids',
    v_deleted_ids
);
END;
$$;
REVOKE ALL ON FUNCTION public.expire_stale_holds(int)
FROM PUBLIC,
    anon,
    authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_holds(int) TO service_role;
-- 4) approve_provider: trusted admin only, search_path
DROP FUNCTION IF EXISTS public.approve_provider(uuid);
CREATE OR REPLACE FUNCTION public.approve_provider(target_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,
    auth,
    extensions AS $$ BEGIN IF NOT public.is_admin_trusted() THEN RAISE EXCEPTION 'Access Denied: Only trusted admins can approve providers.';
END IF;
UPDATE public.profiles
SET is_verified = true,
    updated_at = now()
WHERE user_id = target_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_provider(uuid)
FROM PUBLIC,
    anon,
    authenticated;
GRANT EXECUTE ON FUNCTION public.approve_provider(uuid) TO service_role;
-- 5) Helper functions used in RLS: ensure safe search_path
CREATE OR REPLACE FUNCTION public.check_is_member_safe(p_provider_id uuid, p_user_id uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path = public,
    auth,
    extensions STABLE AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.user_provider_memberships
        WHERE provider_id = p_provider_id
            AND user_id = p_user_id
    );
$$;
CREATE OR REPLACE FUNCTION public.check_is_owner_safe(p_provider_id uuid, p_user_id uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path = public,
    auth,
    extensions STABLE AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.providers
        WHERE id = p_provider_id
            AND user_id = p_user_id
    );
$$;
COMMIT;