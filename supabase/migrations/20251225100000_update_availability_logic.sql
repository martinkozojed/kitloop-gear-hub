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
    v_buffer_minutes INT;
BEGIN
    -- 0. Get Buffer (default 1440 aka 24h if null)
    SELECT COALESCE(buffer_minutes, 1440) INTO v_buffer_minutes
    FROM public.product_variants
    WHERE id = p_variant_id;

    -- 1. Count total serviceable assets for this variant
    SELECT COUNT(*) INTO v_total_assets
    FROM public.assets
    WHERE variant_id = p_variant_id
    AND status IN ('available', 'active'); -- Exclude 'maintenance', 'retired', 'quarantine'

    -- 2. Count overlapping reservations INCLUDING BUFFER
    -- A reservation blocks the slot from [start_date] to [end_date + buffer]
    -- We seek overlap: (NewStart < OldEffectiveEnd) AND (NewEnd > OldStart)
    SELECT COUNT(*) INTO v_reserved_count
    FROM public.reservations
    WHERE product_variant_id = p_variant_id
    AND status IN ('hold', 'confirmed', 'active')
    AND start_date < p_end_date
    AND (end_date + (v_buffer_minutes || ' minutes')::interval) > p_start_date;

    -- 3. Return Availability
    IF (v_total_assets > v_reserved_count) THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;
