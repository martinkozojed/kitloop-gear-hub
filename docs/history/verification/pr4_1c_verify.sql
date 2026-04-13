-- PR4-1C verification (stop-the-bleed)
-- Run with:
-- docker exec -i supabase_db_bkyokcjpelqwtndienos psql -U postgres -d postgres < docs/verification/pr4_1c_verify.sql

BEGIN;

DO $$
BEGIN
  -- Users
  INSERT INTO auth.users (id, email, role, aud, encrypted_password, created_at, updated_at)
  VALUES
    ('a1000000-0000-0000-0000-000000000001', 'owner@pr41c.local', 'authenticated', 'authenticated', '', NOW(), NOW()),
    ('a1000000-0000-0000-0000-000000000002', 'stranger@pr41c.local', 'authenticated', 'authenticated', '', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Provider + owner membership
  INSERT INTO public.providers (id, user_id, rental_name, contact_name, email, phone, verified, updated_at)
  VALUES (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'PR4-1C Provider',
    'Owner',
    'owner@pr41c.local',
    '+1000001000',
    true,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_provider_memberships (user_id, provider_id, role)
  VALUES ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'owner')
  ON CONFLICT DO NOTHING;

  -- Product chain for reservation/assets
  INSERT INTO public.products (id, provider_id, name, category)
  VALUES ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'PR4-1C Product', 'other')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.product_variants (id, product_id, name)
  VALUES ('c1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Default')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_variants (id, product_id, name)
VALUES ('c1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'TTL Variant')
ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.assets (id, provider_id, variant_id, asset_tag, status, deleted_at)
  VALUES ('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'LIVE-PR41C', 'available', NULL)
  ON CONFLICT (id) DO NOTHING;

  -- Reservation for issue/return
  INSERT INTO public.reservations (id, provider_id, product_variant_id, status, start_date, end_date, customer_name, updated_at)
  VALUES (
    'e1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'confirmed',
    NOW(),
    NOW() + INTERVAL '1 day',
    'PR4-1C Customer',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.reservation_assignments (reservation_id, asset_id)
  VALUES ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001')
  ON CONFLICT DO NOTHING;

  -- Hold reservation for TTL cleanup
  INSERT INTO public.reservations (id, provider_id, product_variant_id, status, start_date, end_date, customer_name, updated_at)
  VALUES (
    'e1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002',
    'hold',
    NOW(),
    NOW() + INTERVAL '1 day',
    'TTL Hold',
    NOW() - INTERVAL '120 minutes'
  )
  ON CONFLICT (id) DO UPDATE
  SET status = 'hold', updated_at = NOW() - INTERVAL '120 minutes';
END $$;

-- 1) assert_provider_role should fail for non-member
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000002', true);
  BEGIN
    PERFORM public.assert_provider_role('b1000000-0000-0000-0000-000000000001'::uuid);
    RAISE EXCEPTION 'TEST 1 FAIL: assert_provider_role allowed non-member';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = '42501' THEN
      RAISE NOTICE 'TEST 1 PASS: non-member denied (%)', SQLERRM;
    ELSE
      RAISE EXCEPTION 'TEST 1 FAIL: wrong error state %, msg %', SQLSTATE, SQLERRM;
    END IF;
  END;
END $$;

-- 2) issue/return happy path should not fail on missing function/column
DO $$
DECLARE
  v_issue jsonb;
  v_return jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Call 4-arg overload (historically broken by admin_audit_logs.provider_id insert)
  SELECT public.issue_reservation(
    'e1000000-0000-0000-0000-000000000001'::uuid,
    'b1000000-0000-0000-0000-000000000001'::uuid,
    'a1000000-0000-0000-0000-000000000001'::uuid,
    false
  ) INTO v_issue;

  IF COALESCE((v_issue->>'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST 2 FAIL: issue_reservation returned %', v_issue;
  END IF;

  SELECT public.process_return(
    'e1000000-0000-0000-0000-000000000001'::uuid,
    false,
    'PR4-1C return'
  ) INTO v_return;

  IF COALESCE((v_return->>'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST 2 FAIL: process_return returned %', v_return;
  END IF;

  RAISE NOTICE 'TEST 2 PASS: issue+return flow succeeded';
END $$;

-- 3) expire_stale_holds should run without missing column error
DO $$
DECLARE
  v_expire jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  SELECT public.expire_stale_holds(30) INTO v_expire;

  IF COALESCE((v_expire->>'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST 3 FAIL: expire_stale_holds returned %', v_expire;
  END IF;

  RAISE NOTICE 'TEST 3 PASS: expire_stale_holds succeeded (%)', v_expire;
END $$;

ROLLBACK;
