BEGIN;
-- Tests RLS visibility for new providers who have NO members yet
SELECT plan(2);
-- Since we are testing RLS we want to act as an authenticated user
-- We also need a valid entry in auth.users, but the test environment restricts writing to auth schema
-- We can bypass this by temporarily switching to superuser postgres
-- 1. Create user as postgres
SET ROLE postgres;
INSERT INTO auth.users (id, email)
VALUES (
    '99999999-9999-9999-9999-999999999999',
    'test@test.com'
  );
-- Create the provider using that user id
INSERT INTO public.providers (
    id,
    user_id,
    name,
    rental_name,
    contact_name,
    email,
    phone,
    location,
    status
  )
VALUES (
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    'Test Provider',
    'Test Rental',
    'Test Contact',
    'test@test.com',
    '123',
    'Prague',
    'approved'
  );
-- 2. Act as that specific authenticated user
SET request.jwt.claim.sub TO '99999999-9999-9999-9999-999999999999';
SET request.jwt.claims TO '{"role":"authenticated", "sub":"99999999-9999-9999-9999-999999999999"}';
SET ROLE authenticated;
SELECT results_eq(
    $$
    SELECT id
    FROM public.providers
    WHERE id = '88888888-8888-8888-8888-888888888888' $$,
      $$
    VALUES ('88888888-8888-8888-8888-888888888888'::uuid) $$,
      'Provider should be able to see their own newly created record'
  );
-- 3. Act as a stranger
SET ROLE postgres;
INSERT INTO auth.users (id, email)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'stranger@test.com'
  );
SET request.jwt.claim.sub TO '11111111-1111-1111-1111-111111111111';
SET request.jwt.claims TO '{"role":"authenticated", "sub":"11111111-1111-1111-1111-111111111111"}';
SET ROLE authenticated;
SELECT is_empty(
    $$
    SELECT id
    FROM public.providers
    WHERE id = '88888888-8888-8888-8888-888888888888' $$,
      'Stranger should not see provider record'
  );
ROLLBACK;