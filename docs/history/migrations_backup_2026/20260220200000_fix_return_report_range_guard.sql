-- Fix create_return_report: returned_at must be >= assigned_at to satisfy
-- the no_overlapping_assignments EXCLUDE constraint on tstzrange(assigned_at, returned_at).
-- When a reservation is seeded with future start dates (e2e), assigned_at > now(),
-- causing "range lower bound must be less than or equal to range upper bound".
-- Fix: use GREATEST(now(), assigned_at) as returned_at.

CREATE OR REPLACE FUNCTION public.create_return_report(
    p_reservation_id UUID,
    p_provider_id UUID,
    p_damage_reports JSONB DEFAULT '[]'::jsonb,
    p_general_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_assign RECORD;
    v_is_damaged BOOLEAN;
    v_new_status public.asset_status_type;
    v_report_id UUID;
    v_res_provider_id UUID;
    v_res_status TEXT;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.user_provider_memberships
        WHERE user_id = v_user_id AND provider_id = p_provider_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.providers
        WHERE user_id = v_user_id AND id = p_provider_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    SELECT status, provider_id INTO v_res_status, v_res_provider_id
    FROM public.reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    IF v_res_provider_id != p_provider_id THEN
         RAISE EXCEPTION 'Provider mismatch';
    END IF;

    IF v_res_status = 'completed' THEN
        RAISE EXCEPTION 'Reservation already returned' USING ERRCODE = 'P0003';
    END IF;

    IF v_res_status != 'active' THEN
        RAISE EXCEPTION 'Reservation must be active to return';
    END IF;

    INSERT INTO public.return_reports (
        reservation_id, provider_id, created_by, damage_reports, notes
    ) VALUES (
        p_reservation_id, p_provider_id, v_user_id, p_damage_reports, p_general_notes
    ) RETURNING id INTO v_report_id;

    FOR v_assign IN
        SELECT asset_id, id, assigned_at FROM public.reservation_assignments
        WHERE reservation_id = p_reservation_id
    LOOP
        v_is_damaged := false;
        v_new_status := 'available';

        SELECT (item ->> 'damaged')::boolean INTO v_is_damaged
        FROM jsonb_array_elements(p_damage_reports) AS item
        WHERE (item ->> 'asset_id')::uuid = v_assign.asset_id;

        IF v_is_damaged IS TRUE THEN
            v_new_status := 'maintenance';
        END IF;

        UPDATE public.assets
        SET status = v_new_status, location = 'Warehouse', updated_at = now()
        WHERE id = v_assign.asset_id AND provider_id = p_provider_id;

        -- Use GREATEST(now(), assigned_at) so returned_at >= assigned_at,
        -- satisfying the tstzrange lower <= upper constraint on no_overlapping_assignments.
        UPDATE public.reservation_assignments
        SET returned_at = GREATEST(now(), v_assign.assigned_at),
            checked_in_by = v_user_id
        WHERE id = v_assign.id;
    END LOOP;

    UPDATE public.reservations
    SET status = 'completed', updated_at = now()
    WHERE id = p_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'report_id', v_report_id,
        'provider_id', p_provider_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_return_report(uuid, uuid, jsonb, text) TO authenticated;
