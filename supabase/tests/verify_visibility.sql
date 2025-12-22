-- Test: Verification Visibility
-- Verifies that only verified providers are visible to public (anon)

BEGIN;

-- 1. Setup Data
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-111111111111', 'visible@test.com');
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-222222222222', 'hidden@test.com');

-- Public Verified Provider
INSERT INTO public.providers (id, user_id, name, rental_name, contact_name, email, phone, status, verified, approved_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-111111111111', 'Visible Prov', 'Visible Rental', 'John Doe', 'vis@test.com', '123456', 'approved', true, now());

-- Public Unverified Provider (but status approved)
INSERT INTO public.providers (id, user_id, name, rental_name, contact_name, email, phone, status, verified, approved_at)
VALUES 
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-222222222222', 'Hidden Prov', 'Hidden Rental', 'Jane Doe', 'hid@test.com', '123456', 'approved', false, now());

-- 2. Verify Visibility as Anon
SET ROLE anon;
SELECT plan(2);

-- Should find the verified one
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.providers WHERE id = '11111111-1111-1111-1111-111111111111' $$,
  $$ VALUES (1::int) $$,
  'Verified provider should be visible to anon'
);

-- Should NOT find the unverified one
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.providers WHERE id = '22222222-2222-2222-2222-222222222222' $$,
  $$ VALUES (0::int) $$,
  'Unverified provider should NOT be visible to anon'
);

SELECT * FROM finish();
ROLLBACK;
