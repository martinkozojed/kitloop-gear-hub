CREATE OR REPLACE FUNCTION public.issue_reservation(
        p_reservation_id UUID,
        p_provider_id UUID,
        p_user_id UUID,
        p_override BOOLEAN DEFAULT false,
        p_override_reason TEXT DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_reservation RECORD;
v_assignment RECORD;
v_affected_assets INT := 0;
BEGIN -- Debug log to confirm inputs
RAISE LOG 'issue_reservation called with provider=% user=%',
p_provider_id,
p_user_id;
-- 0. Security Check: Explicit Membership Validation
-- SECURITY DEFINER bypasses RLS, so we MUST check permissions manually.
IF NOT EXISTS (
    SELECT 1
    FROM public.providers
    WHERE id = p_provider_id
        AND user_id = p_user_id
    UNION
    SELECT 1
    FROM public.provider_members
    WHERE provider_id = p_provider_id
        AND user_id = p_user_id
) THEN RAISE EXCEPTION 'Access denied: User is not authorized for this provider';
END IF;
-- 1. Lock and Get Reservation
SELECT * INTO v_reservation
FROM public.reservations
WHERE id = p_reservation_id
    AND provider_id = p_provider_id FOR
UPDATE;
IF v_reservation IS NULL THEN RAISE EXCEPTION 'Reservation not found';
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
IF v_reservation.status NOT IN ('confirmed', 'pending')
AND NOT p_override THEN RAISE EXCEPTION 'Reservation must be confirmed to be issued. Current status: %',
v_reservation.status;
END IF;
-- 3. Payment Validations (Skipped/Override logic handled by caller intent)
-- 4. Get Assignments and Lock Assets
FOR v_assignment IN
SELECT asset_id
FROM public.reservation_assignments
WHERE reservation_id = p_reservation_id
    AND returned_at IS NULL LOOP -- Lock Asset
    PERFORM 1
FROM public.assets
WHERE id = v_assignment.asset_id FOR
UPDATE;
-- Update Asset Status
UPDATE public.assets
SET status = 'active'::asset_status_type,
    location = 'Customer'
WHERE id = v_assignment.asset_id;
v_affected_assets := v_affected_assets + 1;
END LOOP;
IF v_affected_assets = 0
AND NOT p_override THEN RAISE EXCEPTION 'No assets assigned. Cannot issue empty reservation.';
END IF;
-- 5. Update Reservation Status
UPDATE public.reservations
SET status = 'active',
    updated_at = NOW()
WHERE id = p_reservation_id;
-- 6. Audit Log (Corrected to use audit_logs, NOT admin_audit_logs)
INSERT INTO public.audit_logs (
        provider_id,
        user_id,
        action,
        resource_id,
        metadata
    )
VALUES (
        p_provider_id,
        p_user_id,
        'reservation.issue',
        p_reservation_id::text,
        jsonb_build_object(
            'override',
            p_override,
            'override_reason',
            p_override_reason,
            'assets_issued',
            v_affected_assets,
            'previous_status',
            v_reservation.status
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
-- Grant permissions (Crucial!)
GRANT EXECUTE ON FUNCTION public.issue_reservation(uuid, uuid, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_reservation(uuid, uuid, uuid, boolean, text) TO service_role;