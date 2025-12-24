CREATE OR REPLACE FUNCTION public.process_return(
    p_reservation_id UUID,
    p_has_damage BOOLEAN DEFAULT false,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_asset_status TEXT;
    v_affected_assets INT;
    v_reservation_status TEXT;
BEGIN
    -- 1. Determine new asset status
    IF p_has_damage THEN
        v_new_asset_status := 'maintenance';
        v_reservation_status := 'returned'; -- Could be 'needs_review' etc.
    ELSE
        v_new_asset_status := 'available';
        v_reservation_status := 'returned'; -- or 'completed'
    END IF;

    -- 2. Update Assignments (Mark as returned)
    UPDATE public.reservation_assignments
    SET returned_at = NOW()
    WHERE reservation_id = p_reservation_id
    AND returned_at IS NULL;

    -- 3. Update Assets Status
    -- We join assignments to find which assets to update
    WITH returned_assets AS (
        SELECT asset_id FROM public.reservation_assignments
        WHERE reservation_id = p_reservation_id
    )
    UPDATE public.assets
    SET status = v_new_asset_status::asset_status, -- Casting to enum if strictly typed
        location = 'Warehouse A' -- Default return location logic
    WHERE id IN (SELECT asset_id FROM returned_assets);

    GET DIAGNOSTICS v_affected_assets = ROW_COUNT;

    -- 4. Update Reservation Status
    UPDATE public.reservations
    SET status = v_reservation_status,
        updated_at = NOW()
    WHERE id = p_reservation_id;

    -- 5. Audit Log (Optional but good practice)
    -- Insert into admin_audit_logs via trigger or manually here if needed. 
    -- For now relying on table triggers.

    RETURN jsonb_build_object(
        'success', true,
        'assets_returned', v_affected_assets,
        'new_status', v_reservation_status
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
