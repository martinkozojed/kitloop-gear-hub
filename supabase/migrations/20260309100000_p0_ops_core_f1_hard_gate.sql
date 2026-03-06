-- PR 2: F1 Hard Gate & Override Audit for issue_reservation
-- Adds completeness check against reservation quantity before allowing issue.
DROP FUNCTION IF EXISTS public.issue_reservation(uuid, uuid, uuid, boolean, text);
CREATE OR REPLACE FUNCTION public.issue_reservation(
        p_reservation_id UUID,
        p_provider_id UUID,
        p_user_id UUID,
        p_override BOOLEAN DEFAULT false,
        p_override_reason TEXT DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_reservation RECORD;
v_affected_assets INT := 0;
BEGIN -- Derive provider from reservation and lock reservation row.
SELECT r.* INTO v_reservation
FROM public.reservations r
WHERE r.id = p_reservation_id FOR
UPDATE;
IF v_reservation IS NULL THEN RAISE EXCEPTION 'Reservation not found';
END IF;
-- Never trust incoming provider_id; authorize derived provider only.
PERFORM public.assert_provider_role(v_reservation.provider_id);
IF v_reservation.status = 'active' THEN RETURN jsonb_build_object(
    'success',
    true,
    'status',
    'active',
    'assets_issued',
    0,
    'message',
    'Already active'
);
END IF;
IF v_reservation.status NOT IN ('confirmed', 'pending')
AND NOT p_override THEN RAISE EXCEPTION 'HARD_GATE_FAILED_STATUS: Reservation must be confirmed to be issued. Current status: %',
v_reservation.status;
END IF;
WITH locked_assets AS (
    SELECT a.id
    FROM public.reservation_assignments ra
        JOIN public.assets a ON a.id = ra.asset_id
    WHERE ra.reservation_id = p_reservation_id
        AND ra.returned_at IS NULL
        AND a.deleted_at IS NULL
        AND a.status = 'available' FOR
    UPDATE OF a SKIP LOCKED
)
UPDATE public.assets a
SET status = 'active'::asset_status_type,
    location = 'Customer'
WHERE a.id IN (
        SELECT id
        FROM locked_assets
    );
GET DIAGNOSTICS v_affected_assets = ROW_COUNT;
-- HARD GATE COMPLETENESS CHECK
IF v_affected_assets < COALESCE(v_reservation.quantity, 1)
AND NOT p_override THEN RAISE EXCEPTION 'HARD_GATE_FAILED_COMPLETENESS: Not all required assets are assigned and available. Expected %, found %.',
COALESCE(v_reservation.quantity, 1),
v_affected_assets;
END IF;
-- OVERRIDE AUDIT TRAIL: explicitly require a reason if overriding an incomplete allocation
IF p_override
AND v_affected_assets < COALESCE(v_reservation.quantity, 1)
AND (
    p_override_reason IS NULL
    OR trim(p_override_reason) = ''
) THEN RAISE EXCEPTION 'HARD_GATE_MISSING_REASON: An explicit override reason is required when bypassing the completeness gate.';
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
            'assets_issued',
            v_affected_assets,
            'derived_provider_id',
            v_reservation.provider_id,
            'ignored_provider_input',
            p_provider_id,
            'override',
            p_override,
            'override_reason',
            p_override_reason,
            'expected_quantity',
            COALESCE(v_reservation.quantity, 1)
        )
    );
RETURN jsonb_build_object(
    'success',
    true,
    'status',
    'active',
    'assets_issued',
    v_affected_assets
);
END;
$$;
GRANT EXECUTE ON FUNCTION public.issue_reservation(uuid, uuid, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_reservation(uuid, uuid, uuid, boolean, text) TO service_role;