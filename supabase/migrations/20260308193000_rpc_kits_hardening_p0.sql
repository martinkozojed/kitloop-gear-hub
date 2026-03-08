-- P0 Hardening for Kit Bundles Batch RPCs: Permissions & Deadlock Prevention
-- 1. Explicitly REVOKE EXECUTE from PUBLIC to prevent unauthorized access
REVOKE ALL ON FUNCTION public.create_kit_reservation(
    uuid,
    uuid,
    uuid,
    timestamp with time zone,
    timestamp with time zone,
    text,
    text,
    text,
    text,
    text
)
FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_reservations_batch(uuid [], uuid, uuid, boolean, text)
FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_returns_batch(uuid [], boolean, text)
FROM PUBLIC;
-- Standardize expected grants (already existed, but good practice to explicitly define after revoke)
GRANT EXECUTE ON FUNCTION public.create_kit_reservation(
        uuid,
        uuid,
        uuid,
        timestamp with time zone,
        timestamp with time zone,
        text,
        text,
        text,
        text,
        text
    ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_kit_reservation(
        uuid,
        uuid,
        uuid,
        timestamp with time zone,
        timestamp with time zone,
        text,
        text,
        text,
        text,
        text
    ) TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_reservations_batch(uuid [], uuid, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_reservations_batch(uuid [], uuid, uuid, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_returns_batch(uuid [], boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_returns_batch(uuid [], boolean, text) TO service_role;
-- 2. Deadlock Hardening: Add deterministic Lock Ordering to Batch Operations
CREATE OR REPLACE FUNCTION public.issue_reservations_batch(
        p_reservation_ids uuid [],
        p_provider_id uuid,
        p_user_id uuid,
        p_override boolean DEFAULT false,
        p_override_reason text DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_res_id uuid;
v_result jsonb;
v_total_issued int := 0;
BEGIN -- LOCK ORDERING: Pre-lock reservations in predictable (UUID) order 
-- to prevent deadlocks when concurrent transactions operate on overlapping kits.
PERFORM 1
FROM public.reservations
WHERE id = ANY(p_reservation_ids)
ORDER BY id FOR
UPDATE;
-- ITERATE in deterministic order
FOR v_res_id IN
SELECT unnest(p_reservation_ids) AS id
ORDER BY id LOOP v_result := public.issue_reservation(
        v_res_id,
        p_provider_id,
        p_user_id,
        p_override,
        p_override_reason
    );
IF COALESCE((v_result->>'success')::boolean, false) = false
AND v_result ? 'success' THEN RAISE EXCEPTION 'Issue failed for reservation %: %',
v_res_id,
COALESCE(v_result->>'message', 'Unknown RPC reason');
END IF;
v_total_issued := v_total_issued + COALESCE((v_result->>'assets_issued')::int, 0);
END LOOP;
RETURN jsonb_build_object(
    'success',
    true,
    'assets_issued',
    v_total_issued
);
END;
$$;
CREATE OR REPLACE FUNCTION public.process_returns_batch(
        p_reservation_ids uuid [],
        p_has_damage boolean DEFAULT false,
        p_notes text DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_res_id uuid;
v_result jsonb;
v_total_returned int := 0;
BEGIN -- LOCK ORDERING: Pre-lock in a strictly deterministic order
PERFORM 1
FROM public.reservations
WHERE id = ANY(p_reservation_ids)
ORDER BY id FOR
UPDATE;
-- ITERATE deterministically
FOR v_res_id IN
SELECT unnest(p_reservation_ids) AS id
ORDER BY id LOOP v_result := public.process_return(
        v_res_id,
        p_has_damage,
        p_notes
    );
IF COALESCE((v_result->>'success')::boolean, false) = false
AND v_result ? 'success' THEN RAISE EXCEPTION 'Return failed for reservation %: %',
v_res_id,
COALESCE(v_result->>'message', 'Unknown RPC reason');
END IF;
v_total_returned := v_total_returned + COALESCE((v_result->>'assets_returned')::int, 0);
END LOOP;
RETURN jsonb_build_object(
    'success',
    true,
    'assets_returned',
    v_total_returned
);
END;
$$;