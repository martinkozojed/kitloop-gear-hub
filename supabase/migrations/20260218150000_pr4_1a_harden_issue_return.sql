-- PR4-1A: Harden provider-only RPCs (issue_reservation + process_return)

CREATE OR REPLACE FUNCTION public.issue_reservation(
    p_reservation_id UUID,
    p_provider_id UUID,
    p_user_id UUID,
    p_override BOOLEAN DEFAULT false,
    p_override_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reservation RECORD;
    v_affected_assets INT := 0;
BEGIN
    -- Derive provider from reservation and lock reservation row.
    SELECT r.*
    INTO v_reservation
    FROM public.reservations r
    WHERE r.id = p_reservation_id
    FOR UPDATE;

    IF v_reservation IS NULL THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    -- Never trust incoming provider_id; authorize derived provider only.
    PERFORM public.assert_provider_role(v_reservation.provider_id);

    IF v_reservation.status = 'active' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'active',
            'assets_issued', 0,
            'message', 'Already active'
        );
    END IF;

    IF v_reservation.status NOT IN ('confirmed', 'pending') AND NOT p_override THEN
        RAISE EXCEPTION 'Reservation must be confirmed to be issued. Current status: %', v_reservation.status;
    END IF;

    WITH locked_assets AS (
        SELECT a.id
        FROM public.reservation_assignments ra
        JOIN public.assets a ON a.id = ra.asset_id
        WHERE ra.reservation_id = p_reservation_id
          AND ra.returned_at IS NULL
          AND a.deleted_at IS NULL
          AND a.status = 'available'
        FOR UPDATE OF a SKIP LOCKED
    )
    UPDATE public.assets a
    SET status = 'active'::asset_status_type,
        location = 'Customer'
    WHERE a.id IN (SELECT id FROM locked_assets);

    GET DIAGNOSTICS v_affected_assets = ROW_COUNT;

    IF v_affected_assets = 0 AND NOT p_override THEN
        RAISE EXCEPTION 'No available non-deleted assets assigned. Cannot issue reservation.';
    END IF;

    UPDATE public.reservations
    SET status = 'active',
        updated_at = NOW()
    WHERE id = p_reservation_id
      AND status <> 'active';

    INSERT INTO public.audit_logs (
        provider_id,
        user_id,
        action,
        resource_id,
        metadata
    )
    VALUES (
        v_reservation.provider_id,
        COALESCE(auth.uid(), p_user_id),
        'reservation.issue',
        p_reservation_id::text,
        jsonb_build_object(
            'assets_issued', v_affected_assets,
            'derived_provider_id', v_reservation.provider_id,
            'ignored_provider_input', p_provider_id,
            'override', p_override,
            'override_reason', p_override_reason
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'active',
        'assets_issued', v_affected_assets
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_return(
    p_reservation_id UUID,
    p_has_damage BOOLEAN DEFAULT false,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reservation RECORD;
    v_new_asset_status TEXT;
    v_assets_updated INT := 0;
    v_reservation_updated INT := 0;
BEGIN
    -- Derive provider from reservation and lock reservation row.
    SELECT r.*
    INTO v_reservation
    FROM public.reservations r
    WHERE r.id = p_reservation_id
    FOR UPDATE;

    IF v_reservation IS NULL THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    PERFORM public.assert_provider_role(v_reservation.provider_id);

    v_new_asset_status := CASE WHEN p_has_damage THEN 'maintenance' ELSE 'available' END;

    WITH assignment_lock AS (
        SELECT ra.asset_id
        FROM public.reservation_assignments ra
        WHERE ra.reservation_id = p_reservation_id
          AND ra.returned_at IS NULL
        FOR UPDATE SKIP LOCKED
    ),
    closed_assignments AS (
        UPDATE public.reservation_assignments ra
        SET returned_at = NOW()
        WHERE ra.reservation_id = p_reservation_id
          AND ra.returned_at IS NULL
          AND ra.asset_id IN (SELECT asset_id FROM assignment_lock)
        RETURNING ra.asset_id
    )
    UPDATE public.assets a
    SET status = v_new_asset_status::asset_status_type,
        location = 'Warehouse A'
    WHERE a.id IN (SELECT asset_id FROM closed_assignments)
      AND a.deleted_at IS NULL;

    GET DIAGNOSTICS v_assets_updated = ROW_COUNT;

    UPDATE public.reservations
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_reservation_id
      AND status <> 'completed';

    GET DIAGNOSTICS v_reservation_updated = ROW_COUNT;

    INSERT INTO public.audit_logs (
        provider_id,
        user_id,
        action,
        resource_id,
        metadata
    )
    VALUES (
        v_reservation.provider_id,
        auth.uid(),
        'reservation.return',
        p_reservation_id::text,
        jsonb_build_object(
            'has_damage', p_has_damage,
            'notes', p_notes,
            'assets_returned', v_assets_updated,
            'idempotent_noop', (v_assets_updated = 0 AND v_reservation_updated = 0)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'completed',
        'assets_returned', v_assets_updated,
        'idempotent_noop', (v_assets_updated = 0 AND v_reservation_updated = 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_reservation(uuid, uuid, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_return(uuid, boolean, text) TO authenticated;
