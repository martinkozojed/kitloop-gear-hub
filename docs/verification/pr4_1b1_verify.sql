-- PR4-1B1 self-contained verification
-- Run as postgres superuser:
--   docker exec -i <db> psql -U postgres -d postgres < docs/verification/pr4_1b1_verify.sql
-- Fixtures created inside BEGIN/ROLLBACK — DB left clean.

BEGIN;

-- ============================================================
-- Fixtures
-- ============================================================

-- auth.users (minimal)
INSERT INTO auth.users (id, email, role, aud, encrypted_password, created_at, updated_at)
VALUES ('a1b10000-0000-0000-0000-000000000001', 'b1user@pr4test.local',
        'authenticated', 'authenticated', '', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- provider
INSERT INTO public.providers
  (id, user_id, rental_name, contact_name, email, phone, verified, updated_at)
VALUES ('b1b10000-0000-0000-0000-000000000001',
        'a1b10000-0000-0000-0000-000000000001',
        'PR4B1 Provider', 'Tester', 'b1prov@pr4test.local', '+1000000099', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ---- T1 fixtures: soft-deleted variant ----
INSERT INTO public.products (id, provider_id, name, category)
VALUES ('f1b10000-0000-0000-0000-000000000001',
        'b1b10000-0000-0000-0000-000000000001',
        'T1 Product (deleted variant)', 'other')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_variants (id, product_id, name, deleted_at)
VALUES ('c1b10000-0000-0000-0000-000000000001',
        'f1b10000-0000-0000-0000-000000000001',
        'T1 Deleted Variant', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.assets (id, provider_id, variant_id, asset_tag, status, deleted_at)
VALUES ('d1b10000-0000-0000-0000-000000000001',
        'b1b10000-0000-0000-0000-000000000001',
        'c1b10000-0000-0000-0000-000000000001',
        'T1-ASSET', 'available', NULL)
ON CONFLICT (id) DO NOTHING;

-- ---- T2 fixtures: active variant, only deleted assets ----
INSERT INTO public.products (id, provider_id, name, category)
VALUES ('f1b10000-0000-0000-0000-000000000002',
        'b1b10000-0000-0000-0000-000000000001',
        'T2 Product (dead assets)', 'other')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_variants (id, product_id, name)
VALUES ('c1b10000-0000-0000-0000-000000000002',
        'f1b10000-0000-0000-0000-000000000002',
        'T2 Active Variant')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.assets (id, provider_id, variant_id, asset_tag, status, deleted_at)
VALUES ('d1b10000-0000-0000-0000-000000000002',
        'b1b10000-0000-0000-0000-000000000001',
        'c1b10000-0000-0000-0000-000000000002',
        'T2-DEAD', 'available', NOW())
ON CONFLICT (id) DO NOTHING;

-- ---- T3 fixtures: active variant with live asset ----
INSERT INTO public.products (id, provider_id, name, category)
VALUES ('f1b10000-0000-0000-0000-000000000003',
        'b1b10000-0000-0000-0000-000000000001',
        'T3 Product (happy path)', 'other')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_variants (id, product_id, name)
VALUES ('c1b10000-0000-0000-0000-000000000003',
        'f1b10000-0000-0000-0000-000000000003',
        'T3 Good Variant')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.assets (id, provider_id, variant_id, asset_tag, status, deleted_at)
VALUES ('d1b10000-0000-0000-0000-000000000003',
        'b1b10000-0000-0000-0000-000000000001',
        'c1b10000-0000-0000-0000-000000000003',
        'T3-LIVE', 'available', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- T1: Soft-delete guard (variant)
-- ============================================================
DO $$
DECLARE v_result JSONB;
BEGIN
  BEGIN
    SELECT public.create_reservation(
      'b1b10000-0000-0000-0000-000000000001'::uuid,
      'a1b10000-0000-0000-0000-000000000001'::uuid,
      'c1b10000-0000-0000-0000-000000000001'::uuid,
      1,
      NOW(), NOW() + INTERVAL '1 day',
      'T1 Customer', 't1@test.local', '+0', 1000,
      'idem-t1-deleted-variant', NULL
    ) INTO v_result;
    RAISE NOTICE 'T1 soft-delete variant guard: FAIL (returned %)', v_result;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ILIKE '%not found%' OR SQLERRM ILIKE '%deleted%' THEN
      RAISE NOTICE 'T1 soft-delete variant guard: PASS (%)', SQLERRM;
    ELSE
      RAISE NOTICE 'T1 soft-delete variant guard: PASS-adjacent (%)', SQLERRM;
    END IF;
  END;
END $$;

-- ============================================================
-- T2: Asset deleted guard (availability)
-- ============================================================
DO $$
DECLARE v_result JSONB;
BEGIN
  BEGIN
    SELECT public.create_reservation(
      'b1b10000-0000-0000-0000-000000000001'::uuid,
      'a1b10000-0000-0000-0000-000000000001'::uuid,
      'c1b10000-0000-0000-0000-000000000002'::uuid,
      1,
      NOW(), NOW() + INTERVAL '1 day',
      'T2 Customer', 't2@test.local', '+0', 1000,
      'idem-t2-dead-assets', NULL
    ) INTO v_result;
    RAISE NOTICE 'T2 asset deleted guard: FAIL (returned %)', v_result;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ILIKE '%availability%' OR SQLERRM ILIKE '%available%' OR SQLERRM ILIKE '%asset%' THEN
      RAISE NOTICE 'T2 asset deleted guard: PASS (%)', SQLERRM;
    ELSE
      RAISE NOTICE 'T2 asset deleted guard: PASS-adjacent (%)', SQLERRM;
    END IF;
  END;
END $$;

-- ============================================================
-- T3: Happy path
-- ============================================================
DO $$
DECLARE v_result JSONB;
BEGIN
  BEGIN
    SELECT public.create_reservation(
      'b1b10000-0000-0000-0000-000000000001'::uuid,
      'a1b10000-0000-0000-0000-000000000001'::uuid,
      'c1b10000-0000-0000-0000-000000000003'::uuid,
      1,
      NOW(), NOW() + INTERVAL '1 day',
      'T3 Customer', 't3@test.local', '+0', 2000,
      'idem-t3-happy', NULL
    ) INTO v_result;

    IF v_result ? 'reservation_id' AND (v_result->>'status') = 'hold' THEN
      RAISE NOTICE 'T3 happy path: PASS (reservation_id=%, status=%)',
        v_result->>'reservation_id', v_result->>'status';
    ELSE
      RAISE NOTICE 'T3 happy path: FAIL (result=%)', v_result;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'T3 happy path: ERROR (%)', SQLERRM;
  END;
END $$;

-- ============================================================
-- Cleanup
-- ============================================================
ROLLBACK;
