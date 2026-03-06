-- PR 3: F2 Asset Condition DB & Return UI
-- Updates `create_return_report` to extract and save `health_state` from the JSON payload.
CREATE OR REPLACE FUNCTION "public"."create_return_report"(
        "p_reservation_id" "uuid",
        "p_provider_id" "uuid",
        "p_damage_reports" "jsonb" DEFAULT '[]'::"jsonb",
        "p_general_notes" "text" DEFAULT ''::"text"
    ) RETURNS "jsonb" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public',
    'auth',
    'extensions' AS $$
DECLARE v_assign RECORD;
v_is_damaged BOOLEAN;
v_new_status public.asset_status_type;
v_health_state TEXT;
v_report_id UUID;
v_res_provider_id UUID;
v_res_status TEXT;
v_user_id UUID := auth.uid();
BEGIN -- 0. Auth Check
IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated';
END IF;
-- 1. Authorization (Member OR Owner OR Admin)
IF NOT EXISTS (
    SELECT 1
    FROM public.user_provider_memberships
    WHERE user_id = v_user_id
        AND provider_id = p_provider_id
)
AND NOT EXISTS (
    SELECT 1
    FROM public.providers
    WHERE user_id = v_user_id
        AND id = p_provider_id
)
AND NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = v_user_id
        AND role = 'admin'
) THEN RAISE EXCEPTION 'Access Denied';
END IF;
-- 2. Idempotence Check & Lock & Provider Verification
SELECT status,
    provider_id INTO v_res_status,
    v_res_provider_id
FROM public.reservations
WHERE id = p_reservation_id FOR
UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found';
END IF;
-- Verify Provider Match
IF v_res_provider_id != p_provider_id THEN RAISE EXCEPTION 'Provider mismatch';
END IF;
IF v_res_status = 'completed' THEN RAISE EXCEPTION 'Reservation already returned' USING ERRCODE = 'P0003';
END IF;
IF v_res_status != 'active' THEN RAISE EXCEPTION 'Reservation must be active to return';
END IF;
-- 3. Create Report
INSERT INTO public.return_reports (
        reservation_id,
        provider_id,
        created_by,
        damage_reports,
        notes
    )
VALUES (
        p_reservation_id,
        p_provider_id,
        v_user_id,
        p_damage_reports,
        p_general_notes
    )
RETURNING id INTO v_report_id;
-- 4. Update Assets
FOR v_assign IN
SELECT asset_id,
    id
FROM public.reservation_assignments
WHERE reservation_id = p_reservation_id LOOP v_is_damaged := false;
v_new_status := 'available';
v_health_state := 'ok';
-- Check damage and health_state in JSONB
SELECT (item->>'damaged')::boolean,
    COALESCE(item->>'health_state', 'ok') INTO v_is_damaged,
    v_health_state
FROM jsonb_array_elements(p_damage_reports) AS item
WHERE (item->>'asset_id')::uuid = v_assign.asset_id;
IF v_is_damaged IS TRUE THEN v_new_status := 'maintenance';
END IF;
UPDATE public.assets
SET status = v_new_status,
    health_state = v_health_state::public.asset_health_state,
    location = 'Warehouse',
    updated_at = now()
WHERE id = v_assign.asset_id
    AND provider_id = p_provider_id;
UPDATE public.reservation_assignments
SET returned_at = now(),
    checked_in_by = v_user_id
WHERE id = v_assign.id;
END LOOP;
-- 5. Complete Reservation
UPDATE public.reservations
SET status = 'completed',
    updated_at = now()
WHERE id = p_reservation_id;
RETURN jsonb_build_object(
    'success',
    true,
    'status',
    'completed',
    'report_id',
    v_report_id
);
END;
$$;