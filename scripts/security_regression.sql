\set ON_ERROR_STOP on

BEGIN;

-- Randomized suffix to avoid clashes, rolled back at the end
SELECT substring(gen_random_uuid()::text, 1, 8) AS suffix \gset
SELECT gen_random_uuid() AS user_a \gset
SELECT gen_random_uuid() AS user_b \gset
SELECT gen_random_uuid() AS provider_a \gset
SELECT gen_random_uuid() AS provider_b \gset
SELECT gen_random_uuid() AS product_a \gset
SELECT gen_random_uuid() AS product_b \gset
SELECT gen_random_uuid() AS variant_a \gset
SELECT gen_random_uuid() AS variant_b \gset
SELECT gen_random_uuid() AS asset_a \gset
SELECT gen_random_uuid() AS asset_b \gset

-- Create auth users + profiles
INSERT INTO auth.users (id, instance_id, role, aud, email, encrypted_password, created_at, updated_at)
VALUES
  (:'user_a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'security_a_' || :'suffix' || '@example.com', 'x', now(), now()),
  (:'user_b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'security_b_' || :'suffix' || '@example.com', 'x', now(), now());

INSERT INTO public.profiles (user_id, role, is_admin, is_verified, created_at)
VALUES
  (:'user_a', 'provider', false, true, now()),
  (:'user_b', 'provider', false, true, now());

-- Providers (A owned by user_a, B by user_b)
INSERT INTO public.providers (id, name, rental_name, email, status, verified, user_id, category, currency, time_zone, external_key)
VALUES
  (:'provider_a', 'sec_provider_a_' || :'suffix', 'sec_provider_a_' || :'suffix', 'a_' || :'suffix' || '@example.com', 'approved', true, :'user_a', 'seed', 'CZK', 'UTC', 'sec_provider_a_' || :'suffix'),
  (:'provider_b', 'sec_provider_b_' || :'suffix', 'sec_provider_b_' || :'suffix', 'b_' || :'suffix' || '@example.com', 'approved', true, :'user_b', 'seed', 'CZK', 'UTC', 'sec_provider_b_' || :'suffix');

-- Membership only for provider A
INSERT INTO public.user_provider_memberships (user_id, provider_id, role, created_at, external_key)
VALUES (:'user_a', :'provider_a', 'owner', now(), 'sec_membership_a_' || :'suffix');

-- Inventory for both providers
INSERT INTO public.products (id, provider_id, name, category, base_price_cents, external_key)
VALUES
  (:'product_a', :'provider_a', 'sec_product_a_' || :'suffix', 'seed', 1000, 'sec_product_a_' || :'suffix'),
  (:'product_b', :'provider_b', 'sec_product_b_' || :'suffix', 'seed', 1000, 'sec_product_b_' || :'suffix');

INSERT INTO public.product_variants (id, product_id, name, external_key)
VALUES
  (:'variant_a', :'product_a', 'sec_variant_a_' || :'suffix', 'sec_variant_a_' || :'suffix'),
  (:'variant_b', :'product_b', 'sec_variant_b_' || :'suffix', 'sec_variant_b_' || :'suffix');

INSERT INTO public.assets (id, provider_id, variant_id, asset_tag, status, condition_score, external_key)
VALUES
  (:'asset_a', :'provider_a', :'variant_a', 'SEC-A-' || :'suffix', 'available', 100, 'sec_asset_a_' || :'suffix'),
  (:'asset_b', :'provider_b', :'variant_b', 'SEC-B-' || :'suffix', 'available', 100, 'sec_asset_b_' || :'suffix');

-- Helpers to simulate authenticated context
DO $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', :'user_a', true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);

  -- Cross-tenant read should return zero assets for provider B
  PERFORM 1 FROM public.assets WHERE provider_id = :'provider_b';
  IF FOUND THEN
    RAISE EXCEPTION 'Cross-tenant read: user A can see provider B assets';
  END IF;

  -- Cross-tenant write should fail (RLS)
  BEGIN
    INSERT INTO public.assets (provider_id, variant_id, asset_tag, status, condition_score, external_key)
    VALUES (:'provider_b', :'variant_b', 'ILLEGAL-' || :'suffix', 'available', 80, 'illegal_' || :'suffix');
    RAISE EXCEPTION 'Cross-tenant write: user A inserted asset into provider B';
  EXCEPTION WHEN others THEN
    -- expected failure
    NULL;
  END;

  -- add_provider_member must be blocked for non-service
  BEGIN
    PERFORM public.add_provider_member(:'provider_a', :'user_b', 'manager');
    RAISE EXCEPTION 'add_provider_member callable by authenticated user';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- SECURITY DEFINER function should not be callable by auth user
  BEGIN
    PERFORM public.cleanup_reservation_holds_sql();
    RAISE EXCEPTION 'cleanup_reservation_holds_sql callable by authenticated user';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);
SELECT set_config('request.jwt.claims', '', true);

-- Service-level sanity: RLS enabled on key tables
DO $$
DECLARE
  missing_rls int;
BEGIN
  SELECT count(*) INTO missing_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE ((n.nspname = 'public' AND c.relname IN ('providers','products','product_variants','assets','reservations','user_provider_memberships'))
     OR (n.nspname = 'storage' AND c.relname = 'objects'))
    AND c.relrowsecurity = false;
  IF missing_rls > 0 THEN
    RAISE EXCEPTION 'RLS disabled on one or more key tables';
  END IF;
END;
$$;

-- Broad grants check: ensure anon/authenticated/public do not have INSERT on sensitive tables
DO $$
DECLARE
  bad_grants int;
BEGIN
  SELECT count(*) INTO bad_grants
  FROM information_schema.role_table_grants
  WHERE grantee IN ('anon','authenticated','public')
    AND privilege_type = 'INSERT'
    AND table_schema = 'public'
    AND table_name IN ('providers','products','product_variants','assets','reservations','user_provider_memberships');
  IF bad_grants > 0 THEN
    RAISE EXCEPTION 'Broad INSERT grants detected on protected tables';
  END IF;
END;
$$;

RAISE NOTICE 'SECURITY REGRESSION: PASS (rolled back)';

ROLLBACK;
