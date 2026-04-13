-- Migration: Add RPC to convert a reservation request
-- Purpose: Safely lock and mark a reservation_request as converted, linking the new reservation ID
-- Author: Kitloop Team
-- Date: 2026-03-01
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.convert_reservation_request(
    p_request_id uuid,
    p_reservation_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_provider_id uuid;
    v_has_access boolean;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get the provider_id for the request
    SELECT provider_id INTO v_provider_id
    FROM public.reservation_requests
    WHERE id = p_request_id;

    IF v_provider_id IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;

    -- Verify user has access to this provider
    SELECT EXISTS (
        SELECT 1 FROM public.providers WHERE id = v_provider_id AND user_id = v_user_id
        UNION
        SELECT 1 FROM public.provider_members WHERE provider_id = v_provider_id AND user_id = v_user_id
        UNION
        SELECT 1 FROM public.user_provider_memberships WHERE provider_id = v_provider_id AND user_id = v_user_id
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Update the request to converted
    UPDATE public.reservation_requests
    SET 
        status = 'converted',
        reservation_id = p_reservation_id,
        handled_by = v_user_id,
        handled_at = now()
    WHERE id = p_request_id 
      AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request could not be converted (perhaps already handled?)';
    END IF;

END;
$$;

COMMIT;
