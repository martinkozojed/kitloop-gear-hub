-- =============================================================================
-- KITLOOP RLS TESTS - PROVIDER MEMBERSHIP & ADMIN ACCESS
-- =============================================================================

SET client_min_messages TO WARNING;

CREATE EXTENSION IF NOT EXISTS pgtap;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

TRUNCATE auth.users CASCADE;
TRUNCATE public.profiles CASCADE;
TRUNCATE public.providers CASCADE;
TRUNCATE public.user_provider_memberships CASCADE;
TRUNCATE public.products CASCADE;
TRUNCATE public.product_variants CASCADE;
TRUNCATE public.reservations CASCADE;

SELECT plan(10);

-- ---------------------------------------------------------------------------
-- Test fixtures
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE test_users (label text PRIMARY KEY, id uuid NOT NULL);
INSERT INTO test_users (label, id) VALUES
  ('owner', gen_random_uuid()),
  ('non_member', gen_random_uuid()),
  ('admin', gen_random_uuid());

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  confirmation_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
SELECT
  id,
  '00000000-0000-0000-0000-000000000000',
  label || '@test.local',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  'authenticated',
  'authenticated'
FROM test_users;

INSERT INTO public.profiles (user_id, role, created_at)
SELECT
  id,
  CASE WHEN label = 'admin' THEN 'admin' ELSE 'provider' END,
  now()
FROM test_users
ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;

CREATE TEMP TABLE test_providers (label text PRIMARY KEY, id uuid NOT NULL);

WITH inserted AS (
  INSERT INTO public.providers (
    id,
    user_id,
    name,
    contact_name,
    email,
    phone,
    rental_name,
    status,
    verified,
    created_at
  )
  SELECT
    gen_random_uuid(),
    (SELECT id FROM test_users WHERE label = 'owner'),
    'Test Provider',
    'Owner User',
    'owner@test.local',
    '+420123456789',
    'Test Rental Name',
    'pending',
    false,
    now()
  RETURNING id
)
INSERT INTO test_providers (label, id)
SELECT 'primary', id FROM inserted;

INSERT INTO public.user_provider_memberships (user_id, provider_id, role)
SELECT
  (SELECT id FROM test_users WHERE label = 'owner'),
  (SELECT id FROM test_providers WHERE label = 'primary'),
  'owner';

GRANT ALL ON TABLE test_users TO authenticated;
GRANT ALL ON TABLE test_providers TO authenticated;

-- ---------------------------------------------------------------------------
-- Pouzijeme aplikacni roli, aby se RLS skutecne uplatnilo.
SET LOCAL ROLE authenticated;
SET LOCAL row_security = on;

CREATE TEMP TABLE temp_products (id uuid NOT NULL);
CREATE TEMP TABLE temp_variants (id uuid NOT NULL);
CREATE TEMP TABLE temp_reservations (id uuid NOT NULL);

SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id FROM test_users WHERE label = 'owner')::text,
  true
);

-- Debug: Check if membership is visible
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.user_provider_memberships $$,
  $$ VALUES (1) $$,
  'Owner sees their own membership'
);

SELECT lives_ok($$
  WITH inserted_product AS (
    INSERT INTO public.products (
      provider_id,
      name,
      category,
      base_price_cents,
      is_active
    )
    VALUES (
      (SELECT id FROM test_providers WHERE label = 'primary'),
      'Alpine Tent',
      'camping',
      12000,
      true
    )
    -- RETURNING id
  ),
  inserted_variant AS (
    INSERT INTO public.product_variants (
      product_id,
      name,
      sku
    )
    SELECT
      id,
      'Standard',
      'SKU-123'
    FROM public.products WHERE name = 'Alpine Tent' LIMIT 1
    -- RETURNING id
  )
  SELECT 1;
  -- INSERT INTO temp_variants (id) SELECT ...
  
  INSERT INTO temp_products (id)
  SELECT id FROM public.products WHERE name = 'Alpine Tent';
$$, 'Owner can insert products and variants');

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id FROM test_users WHERE label = 'non_member')::text,
  true
);
SELECT throws_ok(
  $$
    INSERT INTO public.products (provider_id, name, category)
    VALUES (
      (SELECT id FROM test_providers WHERE label = 'primary'),
      'Blocked Item',
      'camping'
    )
  $$,
  NULL,
  'Non-member cannot insert products'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id FROM test_users WHERE label = 'owner')::text,
  true
);
SELECT results_eq(
  $$
    SELECT verified
    FROM public.providers
    WHERE id = (SELECT id FROM test_providers WHERE label = 'primary')
  $$,
  $$ VALUES (false) $$,
  'Member can view unverified provider'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id FROM test_users WHERE label = 'non_member')::text,
  true
);
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.providers
    WHERE id = (SELECT id FROM test_providers WHERE label = 'primary')
  $$,
  $$ VALUES (0) $$,
  'Non-member cannot view unverified provider'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id FROM test_users WHERE label = 'owner')::text,
  true
);
SELECT lives_ok($$
  WITH inserted AS (
    INSERT INTO public.reservations (
      provider_id,
      user_id,
      product_variant_id,
      customer_name,
      start_date,
      end_date,
      status
    )
    VALUES (
      (SELECT id FROM test_providers WHERE label = 'primary'),
      (SELECT id FROM test_users WHERE label = 'owner'),
      (SELECT id FROM temp_variants LIMIT 1),
      'John Doe',
      now() + interval '1 day',
      now() + interval '2 days',
      'hold'
    )
    RETURNING id
  )
  INSERT INTO temp_reservations (id)
  SELECT id FROM inserted
$$, 'Owner can insert reservations');

SELECT results_eq(
  $$
    SELECT count(*)::int FROM public.reservations
  $$,
  $$ VALUES (1) $$,
  'Reservation row exists after insert'
);

SELECT lives_ok($$
  UPDATE public.reservations
  SET notes = 'Updated by owner'
  WHERE id = (SELECT id FROM temp_reservations LIMIT 1)
$$, 'Owner can update reservations');

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id FROM test_users WHERE label = 'non_member')::text,
  true
);
SELECT results_eq(
  $$
    SELECT auth.uid()
  $$,
  $$
    VALUES ((SELECT id FROM test_users WHERE label = 'non_member'))
  $$,
  'Session user is non_member'
);
SELECT is_empty(
  $$
    UPDATE public.reservations
    SET notes = 'Should fail'
    WHERE id = (SELECT id FROM temp_reservations LIMIT 1)
    RETURNING id
  $$,
  'Non-member cannot update reservations'
);

SELECT finish();

ROLLBACK;
