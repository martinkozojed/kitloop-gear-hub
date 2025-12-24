-- Securely check availability without exposing Asset table to public
CREATE OR REPLACE FUNCTION public.check_variant_availability(
    p_variant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_assets INT;
    v_reserved_count INT;
BEGIN
    -- 1. Count total serviceable assets for this variant
    SELECT COUNT(*) INTO v_total_assets
    FROM public.assets
    WHERE variant_id = p_variant_id
    AND status IN ('available', 'active'); -- Exclude 'maintenance', 'retired', 'quarantine'

    -- 2. Count overlapping reservations
    SELECT COUNT(*) INTO v_reserved_count
    FROM public.reservations
    WHERE product_variant_id = p_variant_id
    AND status IN ('hold', 'confirmed', 'active')
    AND start_date < p_end_date
    AND end_date > p_start_date;

    -- 3. Return Availability
    IF (v_total_assets > v_reserved_count) THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;
