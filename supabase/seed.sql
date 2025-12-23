
-- Seed Data for Kitloop Inventory 2.0

-- 1. Ensure we have a provider (Mock Data)
-- We insert a dummy provider linked to a hardcoded '00000000-0000-0000-0000-000000000000' user if needed, 
-- or just a standalone provider for testing public pages or admin views.
-- However, RLS requires `auth.uid()` to match.
-- For local dev, we often just create the rows and let the developer "claim" them or sign in as a user with that ID.
-- Let's try to assume the developer's user ID (from previous sessions?) or just make one.

INSERT INTO public.providers (id, name, rental_name, status, email, created_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Seed Provider', 'Kitloop Demo Rental', 'approved', 'demo@kitloop.cz', now())
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Products (Catalog)
INSERT INTO public.products (id, provider_id, name, category, description, base_price_cents, image_url)
VALUES
    ('a0101010-0101-0101-0101-010101010101', '11111111-1111-1111-1111-111111111111', 'Atomic Bent Chetler 100', 'skis', 'Legendary freeride skis.', 50000, 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&q=80&w=800'),
    ('b0202020-0202-0202-0202-020202020202', '11111111-1111-1111-1111-111111111111', 'Salomon Shift Pro 100', 'boots_ski', 'Hybrid touring boots.', 30000, 'https://images.unsplash.com/photo-1598438188283-c24da3791005?auto=format&fit=crop&q=80&w=800'),
    ('c0303030-0303-0303-0303-030303030303', '11111111-1111-1111-1111-111111111111', 'Mammut Barryvox', 'safety', 'Avalanche beacon.', 15000, 'https://images.unsplash.com/photo-1541818167389-9bd90098f45f?auto=format&fit=crop&q=80&w=800')
ON CONFLICT DO NOTHING;

-- 3. Insert Variants
INSERT INTO public.product_variants (id, product_id, name, sku)
VALUES
    -- Atomic Skis
    ('v1000000-0000-0000-0000-000000000001', 'a0101010-0101-0101-0101-010101010101', '180cm', 'ATM-BENT-180'),
    ('v1000000-0000-0000-0000-000000000002', 'a0101010-0101-0101-0101-010101010101', '188cm', 'ATM-BENT-188'),
    -- Salomon Boots
    ('v2000000-0000-0000-0000-000000000001', 'b0202020-0202-0202-0202-020202020202', '27.5 MP', 'SAL-SHIFT-275'),
    ('v2000000-0000-0000-0000-000000000002', 'b0202020-0202-0202-0202-020202020202', '28.5 MP', 'SAL-SHIFT-285'),
    -- Beacon
    ('v3000000-0000-0000-0000-000000000001', 'c0303030-0303-0303-0303-030303030303', 'Standard', 'MMT-BARRY')
ON CONFLICT DO NOTHING;

-- 4. Insert Assets (Physical Items)
INSERT INTO public.assets (provider_id, variant_id, asset_tag, status, condition_score, location)
VALUES
    -- Skis 180cm
    ('11111111-1111-1111-1111-111111111111', 'v1000000-0000-0000-0000-000000000001', 'SKI-180-01', 'available', 95, 'Warehouse A1'),
    ('11111111-1111-1111-1111-111111111111', 'v1000000-0000-0000-0000-000000000001', 'SKI-180-02', 'rented', 80, 'Customer Hand'),
    -- Skis 188cm
    ('11111111-1111-1111-1111-111111111111', 'v1000000-0000-0000-0000-000000000002', 'SKI-188-01', 'maintenance', 60, 'Service Room'),
    -- Boots
    ('11111111-1111-1111-1111-111111111111', 'v2000000-0000-0000-0000-000000000001', 'BT-275-01', 'available', 90, 'Shelf B2'),
    ('11111111-1111-1111-1111-111111111111', 'v2000000-0000-0000-0000-000000000002', 'BT-285-01', 'available', 100, 'Shelf B2')
ON CONFLICT DO NOTHING;
