-- Inventory 2.0: The Great Split
-- Separating Product Catalog from Physical Assets

-- 1. Create Enums for STRICT State Management
CREATE TYPE public.asset_status_type AS ENUM ('available', 'reserved', 'active', 'maintenance', 'quarantine', 'retired', 'lost');
CREATE TYPE public.maintenance_type AS ENUM ('cleaning', 'repair', 'inspection', 'quality_hold');
CREATE TYPE public.maintenance_priority AS ENUM ('critical', 'high', 'normal', 'low', 'cosmetic');

-- 2. Create New Tables
-- A) Products (Catalog)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    base_price_cents INTEGER, -- Stored as cents to avoid floating point issues
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_active BOOLEAN DEFAULT true
);

-- B) Variants (SKUs / Sizes)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Size L", "184cm"
    sku TEXT, -- Manufacturer SKU or internal code
    attributes JSONB DEFAULT '{}'::jsonb, -- Flexible Attributes: size, color, length
    price_override_cents INTEGER, -- If size L costs more than base
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_active BOOLEAN DEFAULT true
);

-- C) Assets (Physical Details)
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE, -- Shortcut for RLS
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    
    asset_tag TEXT NOT NULL, -- Unique Readable ID (e.g. "SKI-001")
    serial_number TEXT,
    
    status public.asset_status_type DEFAULT 'available',
    condition_score SMALLINT DEFAULT 100, -- 0-100
    condition_note TEXT,
    
    location TEXT DEFAULT 'Warehouse', -- Simple string for MVP, later table
    
    purchase_date DATE,
    purchase_price_cents INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraint: Asset Tags must be unique per Provider
    UNIQUE(provider_id, asset_tag)
);

-- D) Maintenance Log (Work Orders)
CREATE TABLE IF NOT EXISTS public.maintenance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    
    type public.maintenance_type NOT NULL,
    priority public.maintenance_priority DEFAULT 'normal',
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'done'
    
    notes TEXT,
    cost_cents INTEGER,
    
    created_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- E) Audit Events (Immutable History)
CREATE TABLE IF NOT EXISTS public.asset_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    p_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE, -- Shorthand
    
    event_type TEXT NOT NULL, -- 'status_change', 'maintenance_start', 'location_update', 'reservation_issue'
    old_status TEXT,
    new_status TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb, -- Extra data (reservation_id, user_id)
    actor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. RLS Policies (Base Level)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_events ENABLE ROW LEVEL SECURITY;

-- Products: Everyone can read, Only Provider/Admin can write
CREATE POLICY "Products: Public Read" ON public.products FOR SELECT USING (true);
CREATE POLICY "Products: Provider Write" ON public.products FOR ALL USING (
    provider_id IN (
        SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    ) OR 
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
);

-- Variants: Same as Products
CREATE POLICY "Variants: Public Read" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Variants: Provider Write" ON public.product_variants FOR ALL USING (
    product_id IN (
        SELECT id FROM public.products WHERE 
        provider_id IN (SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid())
    ) OR 
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
);

-- Assets: Only Provider/Admin Access (Private!)
CREATE POLICY "Assets: Provider Only" ON public.assets FOR ALL USING (
    provider_id IN (
        SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    ) OR 
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
);

-- 4. Initial Migration Logic (Legacy -> New)
-- This block attempts to migrate existing flat gear_items into the new structure
-- Uses a DO block to prevent transaction errors

DO $$
DECLARE 
    r RECORD;
    new_product_id UUID;
    new_variant_id UUID;
    counter INT := 1;
BEGIN
    FOR r IN SELECT * FROM public.gear_items LOOP
        -- 1. Create Product (One per Gear Item for now)
        INSERT INTO public.products (provider_id, name, description, category, base_price_cents, image_url, created_at)
        VALUES (
            r.provider_id, 
            r.name, 
            r.description, 
            COALESCE(r.category, 'uncategorized'), 
            (r.price_per_day * 100)::INTEGER, 
            r.image_url,
            r.created_at
        ) RETURNING id INTO new_product_id;

        -- 2. Create "Standard" Variant
        INSERT INTO public.product_variants (product_id, name, sku, created_at)
        VALUES (
            new_product_id, 
            'Standard', 
            r.sku,
            r.created_at
        ) RETURNING id INTO new_variant_id;

        -- 3. Create N Assets based on quantity_total
        -- If quantity_total is NULL, assume 1
        FOR i IN 1..COALESCE(r.quantity_total, 1) LOOP
            INSERT INTO public.assets (
                provider_id, 
                variant_id, 
                asset_tag, 
                status, 
                condition_score, 
                location, 
                created_at 
            )
            VALUES (
                r.provider_id,
                new_variant_id,
                CONCAT('MIG-', SUBSTRING(new_product_id::text, 1, 4), '-', counter, '-', i), -- Auto-generate tag
                CASE 
                    WHEN r.active = false THEN 'retired'::public.asset_status_type
                    WHEN r.item_state = 'maintenance' THEN 'maintenance'::public.asset_status_type
                    ELSE 'available'::public.asset_status_type
                END,
                CASE WHEN r.condition = 'new' THEN 100 WHEN r.condition = 'used' THEN 80 ELSE 60 END,
                COALESCE(r.location, 'Warehouse'),
                r.created_at
            );
        END LOOP;
        
        counter := counter + 1;
    END LOOP;
END $$;
