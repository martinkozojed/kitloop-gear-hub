-- manage_product: upsert a product + its variants for a provider.
-- Called by ProductForm in the frontend.
-- Returns the product UUID.

CREATE OR REPLACE FUNCTION public.manage_product(
    p_provider_id    UUID,
    p_product_id     UUID DEFAULT NULL,
    p_name           TEXT DEFAULT '',
    p_description    TEXT DEFAULT '',
    p_category       TEXT DEFAULT '',
    p_price_cents    INTEGER DEFAULT 0,
    p_image_url      TEXT DEFAULT '',
    p_variants       JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id   UUID := auth.uid();
    v_product_id UUID;
    v_variant   JSONB;
    v_variant_id UUID;
    v_variant_name TEXT;
    v_variant_sku  TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    -- Authorization: caller must own or be a member of the provider
    IF NOT EXISTS (
        SELECT 1 FROM public.providers WHERE id = p_provider_id AND user_id = v_user_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.user_provider_memberships WHERE provider_id = p_provider_id AND user_id = v_user_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;

    IF p_name = '' OR p_name IS NULL THEN
        RAISE EXCEPTION 'Product name is required';
    END IF;
    IF p_category = '' OR p_category IS NULL THEN
        RAISE EXCEPTION 'Category is required';
    END IF;

    IF p_product_id IS NOT NULL THEN
        -- Update existing product
        UPDATE public.products
        SET name             = p_name,
            description      = p_description,
            category         = p_category,
            base_price_cents = p_price_cents,
            image_url        = p_image_url,
            updated_at       = now()
        WHERE id = p_product_id
          AND provider_id = p_provider_id
          AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found or access denied';
        END IF;
        v_product_id := p_product_id;
    ELSE
        -- Insert new product
        INSERT INTO public.products (provider_id, name, description, category, base_price_cents, image_url)
        VALUES (p_provider_id, p_name, p_description, p_category, p_price_cents, p_image_url)
        RETURNING id INTO v_product_id;
    END IF;

    -- Upsert variants
    FOR v_variant IN SELECT * FROM jsonb_array_elements(p_variants)
    LOOP
        v_variant_name := COALESCE(v_variant->>'name', 'Standard');
        v_variant_sku  := COALESCE(v_variant->>'sku', '');

        -- Try to find existing variant by id (if provided and looks like a UUID)
        v_variant_id := NULL;
        BEGIN
            v_variant_id := (v_variant->>'id')::uuid;
        EXCEPTION WHEN others THEN
            v_variant_id := NULL;
        END;

        IF v_variant_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.product_variants WHERE id = v_variant_id AND product_id = v_product_id
        ) THEN
            UPDATE public.product_variants
            SET name = v_variant_name, sku = v_variant_sku
            WHERE id = v_variant_id AND product_id = v_product_id;
        ELSE
            INSERT INTO public.product_variants (product_id, name, sku)
            VALUES (v_product_id, v_variant_name, v_variant_sku)
            ON CONFLICT (product_id, name) DO UPDATE
                SET sku = EXCLUDED.sku;
        END IF;
    END LOOP;

    -- Ensure at least one default variant exists
    IF NOT EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = v_product_id AND deleted_at IS NULL) THEN
        INSERT INTO public.product_variants (product_id, name) VALUES (v_product_id, 'Standard')
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_product(uuid, uuid, text, text, text, integer, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_product(uuid, uuid, text, text, text, integer, text, jsonb) TO authenticated;
