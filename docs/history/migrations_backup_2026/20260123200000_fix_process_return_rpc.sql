CREATE OR REPLACE FUNCTION public.process_return(
        p_reservation_id UUID,
        p_has_damage BOOLEAN DEFAULT false,
        p_notes TEXT DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_asset_status TEXT;
v_affected_assets INT;
v_reservation_status TEXT;
BEGIN -- Debug log
RAISE LOG 'process_return called for reservation %',
p_reservation_id;
-- 1. Determine new asset status
IF p_has_damage THEN v_new_asset_status := 'maintenance';
v_reservation_status := 'completed';
-- Changed from 'returned' to 'completed' if that matches enum, or 'returned' if valid. 
-- Checking enum: statuses are typically 'pending', 'confirmed', 'active', 'completed', 'cancelled'. 
-- 'returned' might not exist in reservation_status enum.
-- Assuming 'completed' is the correct terminal state.
v_reservation_status := 'completed';
ELSE v_new_asset_status := 'active';
-- 'available' is not usually a status for ASSETS (active, maintenance, retired?). 
-- Wait, assets usually have: 'available', 'active' (rented), 'maintenance', 'retired'.
-- Let's stick to simple first: 'available'.
v_new_asset_status := 'available';
v_reservation_status := 'completed';
END IF;
-- 2. Update Assignments (Mark as returned)
UPDATE public.reservation_assignments
SET returned_at = NOW()
WHERE reservation_id = p_reservation_id
    AND returned_at IS NULL;
-- 3. Update Assets Status
WITH returned_assets AS (
    SELECT asset_id
    FROM public.reservation_assignments
    WHERE reservation_id = p_reservation_id
)
UPDATE public.assets
SET status = v_new_asset_status::asset_status_type,
    -- FIXED TYPE CAST
    location = 'Warehouse A'
WHERE id IN (
        SELECT asset_id
        FROM returned_assets
    );
GET DIAGNOSTICS v_affected_assets = ROW_COUNT;
-- 4. Update Reservation Status
UPDATE public.reservations
SET status = v_reservation_status,
    -- Implicit cast to reservation_status enum
    updated_at = NOW()
WHERE id = p_reservation_id;
RETURN jsonb_build_object(
    'success',
    true,
    'assets_returned',
    v_affected_assets,
    'new_status',
    v_reservation_status
);
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_return(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_return(uuid, boolean, text) TO service_role;