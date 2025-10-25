-- =============================================================================
-- KITLOOP RLS TESTS - PROVIDER MEMBERSHIP & ADMIN ACCESS
-- =============================================================================

SET client_min_messages TO WARNING;

CREATE EXTENSION IF NOT EXISTS pgtap;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

SELECT plan(6);

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
  'password',
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
FROM test_users;

CREATE TEMP TABLE test_providers (label text PRIMARY KEY, id uuid NOT NULL);

WITH inserted AS (
  INSERT INTO public.providers (
    id,
    user_id,
    name,
    contact_name,
    email,
    phone,
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

CREATE TEMP TABLE temp_gear (id uuid NOT NULL);
CREATE TEMP TABLE temp_reservations (id uuid NOT NULL);

-- ---------------------------------------------------------------------------
-- Tests
-- ---------------------------------------------------------------------------

SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id::text FROM test_users WHERE label = 'owner'),
  true
);
SELECT lives_ok($$
  WITH inserted AS (
    INSERT INTO public.gear_items (
      provider_id,
      name,
      category,
      price_per_day,
      active
    )
    VALUES (
      (SELECT id FROM test_providers WHERE label = 'primary'),
      'Alpine Tent',
      'camping',
      120,
      true
    )
    RETURNING id
  )
  INSERT INTO temp_gear (id)
  SELECT id FROM inserted
$$, 'Owner can insert gear items');

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id::text FROM test_users WHERE label = 'non_member'),
  true
);
SELECT throws_ok(
  $$
    INSERT INTO public.gear_items (provider_id, name, category)
    VALUES (
      (SELECT id FROM test_providers WHERE label = 'primary'),
      'Blocked Item',
      'camping'
    )
  $$,
  '42501',
  'Non-member cannot insert gear items'
);

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id::text FROM test_users WHERE label = 'owner'),
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
  (SELECT id::text FROM test_users WHERE label = 'non_member'),
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
  (SELECT id::text FROM test_users WHERE label = 'owner'),
  true
);
SELECT lives_ok($$
  WITH inserted AS (
    INSERT INTO public.reservations (
      provider_id,
      user_id,
      gear_id,
      customer_name,
      start_date,
      end_date,
      status
    )
    VALUES (
      (SELECT id FROM test_providers WHERE label = 'primary'),
      (SELECT id FROM test_users WHERE label = 'owner'),
      (SELECT id FROM temp_gear LIMIT 1),
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

SELECT lives_ok($$
  UPDATE public.reservations
  SET notes = 'Updated by owner'
  WHERE id = (SELECT id FROM temp_reservations LIMIT 1)
$$, 'Owner can update reservations');

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id::text FROM test_users WHERE label = 'non_member'),
  true
);
SELECT throws_ok(
  $$
    UPDATE public.reservations
    SET notes = 'Should fail'
    WHERE id = (SELECT id FROM temp_reservations LIMIT 1)
  $$,
  '42501',
  'Non-member cannot update reservations'
);

SELECT finish();

ROLLBACK;
