-- Fix RLS for Inventory Tables (Products, Variants, Assets) to prevent recursion
DO $$
DECLARE pol record;
BEGIN -- Drop policies on products
FOR pol IN
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'products' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.products';
END LOOP;
-- Drop policies on product_variants
FOR pol IN
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'product_variants' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.product_variants';
END LOOP;
-- Drop policies on assets
FOR pol IN
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'assets' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.assets';
END LOOP;
END $$;
-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view products" ON public.products FOR
SELECT TO anon,
    authenticated USING (true);
CREATE POLICY "Owner manage products" ON public.products FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.providers
        WHERE id = products.provider_id
            AND user_id = auth.uid()
    )
);
CREATE POLICY "Service Role products" ON public.products TO service_role USING (true) WITH CHECK (true);
-- Variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view variants" ON public.product_variants FOR
SELECT TO anon,
    authenticated USING (true);
CREATE POLICY "Owner manage variants" ON public.product_variants FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.products
            JOIN public.providers ON products.provider_id = providers.id
        WHERE products.id = product_variants.product_id
            AND providers.user_id = auth.uid()
    )
);
CREATE POLICY "Service Role variants" ON public.product_variants TO service_role USING (true) WITH CHECK (true);
-- Assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view assets" ON public.assets FOR
SELECT TO anon,
    authenticated USING (true);
CREATE POLICY "Owner manage assets" ON public.assets FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.providers
        WHERE id = assets.provider_id
            AND user_id = auth.uid()
    )
);
CREATE POLICY "Service Role assets" ON public.assets TO service_role USING (true) WITH CHECK (true);