
-- Seed Data for Kitloop Inventory 2.0 (Outdoor Edition)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 0. Create Auth User (demo@kitloop.cz / password123)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'demo@kitloop.cz',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{"role": "provider"}',
    now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '{"sub":"00000000-0000-0000-0000-000000000000","email":"demo@kitloop.cz"}',
    'email', '00000000-0000-0000-0000-000000000000', now(), now(), now()
) ON CONFLICT (id) DO NOTHING;

-- 0.5 Create Profile
INSERT INTO public.profiles (user_id, role, is_admin)
VALUES ('00000000-0000-0000-0000-000000000000', 'provider', true)
ON CONFLICT (user_id) DO UPDATE 
SET role = EXCLUDED.role, is_admin = EXCLUDED.is_admin;

-- 1. Create Provider
INSERT INTO public.providers (id, name, rental_name, status, email, contact_name, phone, created_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Seed Outdoor Provider', 'Kitloop Basecamp', 'approved', 'demo@kitloop.cz', 'Basecamp Manager', '+420123456789', now())
ON CONFLICT (id) DO NOTHING;

-- 1.5 Link User to Provider
INSERT INTO public.user_provider_memberships (user_id, provider_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'owner')
ON CONFLICT (user_id, provider_id) DO NOTHING;

-- 2. Insert Products (Outdoor Catalog)
INSERT INTO public.products (id, provider_id, name, category, description, base_price_cents, image_url)
VALUES
    -- Ferrata Set
    ('a0101010-0101-0101-0101-010101010101', '11111111-1111-1111-1111-111111111111', 'Ferrata Set Camp Vortex', 'ferrata', 'Complete via ferrata set with tear-webbing energy absorber.', 25000, 'https://images.unsplash.com/photo-1521336573784-0c9d2d4761e1?auto=format&fit=crop&q=80&w=800'),
    -- Climbing Harness
    ('b0202020-0202-0202-0202-020202020202', '11111111-1111-1111-1111-111111111111', 'Petzl Corax Harness', 'harness', 'Versatile and adjustable climbing harness.', 15000, 'https://images.unsplash.com/photo-1601228221656-78486f5c8c6d?auto=format&fit=crop&q=80&w=800'),
    -- Tent
    ('c0303030-0303-0303-0303-030303030303', '11111111-1111-1111-1111-111111111111', 'MSR Hubba Hubba', 'tents', 'Ultralight 2-person tent for backpacking.', 80000, 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=800'),
    -- Crampons
    ('e0505050-0505-0505-0505-050505050505', '11111111-1111-1111-1111-111111111111', 'Grivel G12 Crampons', 'crampons', 'Classic 12-point crampons for mountaineering.', 20000, 'https://images.unsplash.com/photo-1545648505-08a8a4f9324c?auto=format&fit=crop&q=80&w=800')
ON CONFLICT DO NOTHING;

-- 3. Insert Variants
INSERT INTO public.product_variants (id, product_id, name, sku)
VALUES
    -- Ferrata Set (Universal)
    ('d1000000-0000-0000-0000-000000000001', 'a0101010-0101-0101-0101-010101010101', 'Universal', 'FER-VOR-001'),
    -- Harness (Sizes)
    ('d2000000-0000-0000-0000-000000000001', 'b0202020-0202-0202-0202-020202020202', 'Size 1 (XS-M)', 'PTZ-COR-S1'),
    ('d2000000-0000-0000-0000-000000000002', 'b0202020-0202-0202-0202-020202020202', 'Size 2 (L-XL)', 'PTZ-COR-S2'),
    -- Tent (2P)
    ('d3000000-0000-0000-0000-000000000001', 'c0303030-0303-0303-0303-030303030303', '2-Person', 'MSR-HUB-2P'),
    -- Crampons (Universal)
    ('d4000000-0000-0000-0000-000000000001', 'e0505050-0505-0505-0505-050505050505', 'New-Matic', 'GRV-G12-NM')
ON CONFLICT DO NOTHING;

-- 4. Insert Assets (Physical Items)
INSERT INTO public.assets (provider_id, variant_id, asset_tag, status, condition_score, location)
VALUES
    -- Ferrata Sets
    ('11111111-1111-1111-1111-111111111111', 'd1000000-0000-0000-0000-000000000001', 'FER-001', 'available', 100, 'Shelf A1'),
    ('11111111-1111-1111-1111-111111111111', 'd1000000-0000-0000-0000-000000000001', 'FER-002', 'active', 95, 'Rent (Adam)'),
    ('11111111-1111-1111-1111-111111111111', 'd1000000-0000-0000-0000-000000000001', 'FER-003', 'maintenance', 80, 'Safety Check'),
    -- Harnesses
    ('11111111-1111-1111-1111-111111111111', 'd2000000-0000-0000-0000-000000000001', 'HAR-S1-01', 'available', 90, 'Shelf A2'),
    ('11111111-1111-1111-1111-111111111111', 'd2000000-0000-0000-0000-000000000002', 'HAR-S2-01', 'available', 100, 'Shelf A2'),
    -- Tent
    ('11111111-1111-1111-1111-111111111111', 'd3000000-0000-0000-0000-000000000001', 'TNT-001', 'available', 85, 'Shelf B1')
ON CONFLICT DO NOTHING;
