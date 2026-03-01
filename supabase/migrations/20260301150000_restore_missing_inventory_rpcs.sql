-- Migration: Restore missing inventory RPCs
-- Purpose: The typescript compiler complained about missing create_inventory_item, etc. 
--          These might be legacy from a previous test or development session. Re-adding stub/actual.
-- Author: Kitloop Team
-- Date: 2026-03-01
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_inventory_item(
    p_product_id uuid,
    p_sku text,
    p_serial_number text,
    p_condition text,
    p_status text,
    p_notes text,
    p_location text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item_id uuid;
BEGIN
    INSERT INTO public.gear_items (product_id, sku, serial_number, condition, status, notes, location)
    VALUES (p_product_id, p_sku, p_serial_number, p_condition, p_status, p_notes, p_location)
    RETURNING id INTO v_item_id;
    RETURN v_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_item(
    p_id uuid,
    p_sku text,
    p_serial_number text,
    p_condition text,
    p_status text,
    p_notes text,
    p_location text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.gear_items
    SET sku = COALESCE(p_sku, sku),
        serial_number = COALESCE(p_serial_number, serial_number),
        condition = COALESCE(p_condition, condition),
        status = COALESCE(p_status, status),
        notes = COALESCE(p_notes, notes),
        location = COALESCE(p_location, location)
    WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_inventory_item(p_id uuid) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.gear_items SET status = 'retired' WHERE id = p_id;
END;
$$;

COMMIT;
