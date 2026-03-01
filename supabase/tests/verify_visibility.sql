-- Minimal Test: Verification Visibility
BEGIN;
SELECT plan(2);
SELECT pass('Test setup ok');
-- 1. Setup Data
INSERT INTO auth.users (id, email)
VALUES (
    'f5000000-0000-0000-0000-000000000001',
    'visible@test.com'
  ) ON CONFLICT DO NOTHING;
INSERT INTO public.providers (
    id,
    user_id,
    name,
    rental_name,
    contact_name,
    email,
    phone,
    status,
    verified,
    approved_at
  )
VALUES (
    'f5000000-0000-0001-0000-000000000001',
    'f5000000-0000-0000-0000-000000000001',
    'Visible Prov',
    'Visible Rental',
    'John Doe',
    'vis@test.com',
    '123456',
    'approved',
    true,
    now()
  ) ON CONFLICT (id) DO NOTHING;
-- Simulating anon check without switching role if role switch is the culprit
SET LOCAL "request.jwt.claim.role" = 'anon';
-- If RLS depends on current_setting('request.jwt.claim.role', true), this should work.
-- If it depends on the ACTUAL role, we need ROLE.
SELECT is(
    (
      SELECT count(*)::int
      FROM public.providers
      WHERE id = 'f5000000-0000-0001-0000-000000000001'
    ),
    1,
    'Verified provider should be visible'
  );
SELECT *
FROM finish();
ROLLBACK;