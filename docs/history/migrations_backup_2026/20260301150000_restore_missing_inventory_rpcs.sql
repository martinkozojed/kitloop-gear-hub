-- Migration: Restore missing inventory RPCs
-- Purpose: The typescript compiler complained about missing create_inventory_item, etc. 
--          These are updated to match the signatures in src/lib/inventory.ts
--          and the current products/variants/assets architecture.
-- Author: Kitloop Team
-- Date: 2026-03-01
-- ============================================================================
BEGIN;
CREATE OR REPLACE FUNCTION public.create_inventory_item(
        p_provider_id uuid,
        p_name text,
        p_category text,
        p_description text,
        p_price_cents integer,
        p_image_url text,
        p_condition text,
        p_quantity_total integer,
        p_sku text DEFAULT NULL
    ) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_product_id uuid;
v_variant_id uuid;
i integer;
BEGIN -- 1. Create Product
INSERT INTO public.products (
        provider_id,
        name,
        category,
        description,
        base_price_cents,
        image_url
    )
VALUES (
        p_provider_id,
        p_name,
        p_category,
        p_description,
        p_price_cents,
        p_image_url
    )
RETURNING id INTO v_product_id;
-- 2. Create Default Variant
INSERT INTO public.product_variants (product_id, name, sku)
VALUES (v_product_id, 'Universal', p_sku)
RETURNING id INTO v_variant_id;
-- 3. Create Assets (if quantity > 0)
IF p_quantity_total > 0 THEN FOR i IN 1..p_quantity_total LOOP
INSERT INTO public.assets (
        provider_id,
        variant_id,
        asset_tag,
        status,
        condition_score
    )
VALUES (
        p_provider_id,
        v_variant_id,
        COALESCE(p_sku, 'TAG') || '-' || i,
        'available',
        100
    );
END LOOP;
END IF;
RETURN v_product_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.update_inventory_item(
        p_item_id uuid,
        p_name text,
        p_category text,
        p_description text,
        p_price_cents integer,
        p_image_url text,
        p_condition text,
        p_quantity_total integer,
        p_sku text DEFAULT NULL
    ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
UPDATE public.products
SET name = p_name,
    category = p_category,
    description = p_description,
    base_price_cents = p_price_cents,
    image_url = p_image_url,
    updated_at = now()
WHERE id = p_item_id;
UPDATE public.product_variants
SET sku = p_sku
WHERE product_id = p_item_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.soft_delete_inventory_item(p_item_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
UPDATE public.products
SET deleted_at = now()
WHERE id = p_item_id;
END;
$$;
-- Grant access
GRANT EXECUTE ON FUNCTION public.create_inventory_item(
        uuid,
        text,
        text,
        text,
        integer,
        text,
        text,
        integer,
        text
    ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_inventory_item(
        uuid,
        text,
        text,
        text,
        integer,
        text,
        text,
        integer,
        text
    ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_inventory_item(uuid) TO authenticated;
COMMIT;