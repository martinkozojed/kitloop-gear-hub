-- PR-RLS-ASSETS-SELECT verification
-- Run as postgres superuser:
--   docker exec -i <db_container> psql -U postgres -d postgres \
--     < docs/verification/pr_rls_assets_select_verify.sql
--
-- All fixtures are inserted inside a transaction that is rolled back at the end.
-- Uses set_config('request.jwt.claim.sub', ...) to simulate authenticated sessions.
--
-- Expected output:
--   NOTICE: AUTH_OK
--   NOTICE: CROSS_PROVIDER_BLOCKED
--   NOTICE: ANON_BLOCKED

BEGIN;

DO $$
DECLARE
  v_user1    UUID := '11111111-1111-1111-1111-111111111101';
  v_user2    UUID := '22222222-2222-2222-2222-222222222202';
  v_prov1    UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_prov2    UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_prod1    UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd01';
  v_prod2    UUID := 'dddddddd-dddd-dddd-dddd-dddddddddd02';
  v_var1     UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01';
  v_var2     UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02';
  v_asset1   UUID := 'cccccccc-cccc-cccc-cccc-cccccccccc01';
  v_asset2   UUID := 'cccccccc-cccc-cccc-cccc-cccccccccc02';
  v_count    INT;
  v_raised   BOOLEAN;
BEGIN

  -- ----------------------------------------------------------------
  -- 0. Insert minimal fixtures (running as superuser, bypasses RLS)
  -- ----------------------------------------------------------------

  -- auth.users (minimal; email must be unique)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES
      (v_user1, 'verify_u1@kitloop.test', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
      (v_user2, 'verify_u2@kitloop.test', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;

  -- providers
  INSERT INTO public.providers (id, user_id, rental_name, contact_name, email, phone, status)
    VALUES
      (v_prov1, v_user1, 'Verify Provider 1', 'Test', 'p1@kitloop.test', '+420000000001', 'approved'),
      (v_prov2, v_user2, 'Verify Provider 2', 'Test', 'p2@kitloop.test', '+420000000002', 'approved')
    ON CONFLICT (id) DO NOTHING;

  -- provider_members (owner rows — required for SELECT policy)
  INSERT INTO public.provider_members (provider_id, user_id, role)
    VALUES
      (v_prov1, v_user1, 'owner'),
      (v_prov2, v_user2, 'owner')
    ON CONFLICT DO NOTHING;

  -- products
  INSERT INTO public.products (id, provider_id, name, category)
    VALUES
      (v_prod1, v_prov1, 'Verify Product 1', 'test'),
      (v_prod2, v_prov2, 'Verify Product 2', 'test')
    ON CONFLICT (id) DO NOTHING;

  -- product_variants
  INSERT INTO public.product_variants (id, product_id, name)
    VALUES
      (v_var1, v_prod1, 'Variant 1'),
      (v_var2, v_prod2, 'Variant 2')
    ON CONFLICT (id) DO NOTHING;

  -- assets
  INSERT INTO public.assets (id, provider_id, variant_id, asset_tag, status)
    VALUES
      (v_asset1, v_prov1, v_var1, 'VERIFY-ASSET-P1', 'available'),
      (v_asset2, v_prov2, v_var2, 'VERIFY-ASSET-P2', 'available')
    ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------------
  -- 1. AUTH_OK: U1 (authenticated) can SELECT own asset (prov1)
  -- ----------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_user1::text, true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count
  FROM public.assets
  WHERE id = v_asset1;

  IF v_count = 1 THEN
    RAISE NOTICE 'AUTH_OK';
  ELSE
    RAISE EXCEPTION 'AUTH_OK FAILED: expected 1 row for own asset, got %', v_count;
  END IF;

  -- ----------------------------------------------------------------
  -- 2. CROSS_PROVIDER_BLOCKED: U1 cannot SELECT P2's asset
  -- ----------------------------------------------------------------
  -- jwt.claim.sub still = v_user1, role still authenticated

  SELECT COUNT(*) INTO v_count
  FROM public.assets
  WHERE id = v_asset2;

  IF v_count = 0 THEN
    RAISE NOTICE 'CROSS_PROVIDER_BLOCKED';
  ELSE
    RAISE EXCEPTION 'CROSS_PROVIDER_BLOCKED FAILED: U1 can see P2 asset (% rows)', v_count;
  END IF;

  -- ----------------------------------------------------------------
  -- 3. ANON_BLOCKED: anon role has no SELECT policy → 0 rows
  -- ----------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;

  v_raised := FALSE;
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.assets
    WHERE id = v_asset1;
    IF v_count = 0 THEN
      v_raised := TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_raised := TRUE;
  END;

  IF v_raised THEN
    RAISE NOTICE 'ANON_BLOCKED';
  ELSE
    RAISE EXCEPTION 'ANON_BLOCKED FAILED: anon can see % rows', v_count;
  END IF;

  -- Reset to superuser for clean rollback
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '', true);

END $$;

ROLLBACK;
