-- Test to ensure that the amount_total_cents in reservations
-- is consistent with the pricing_snapshot JSONB field.
-- This test expects a trigger to be in place to prevent inconsistencies.

BEGIN;

SELECT plan(1);

-- Test that an attempt to insert an inconsistent reservation fails
SELECT throws_ok(
  $$
    INSERT INTO public.reservations (
      provider_id,
      user_id,
      gear_id,
      status,
      start_date,
      end_date,
      amount_total_cents,
      pricing_snapshot
    ) VALUES (
      '00000000-0000-0000-0000-000000000001', -- Fake provider_id
      '00000000-0000-0000-0000-000000000002', -- Fake user_id
      '00000000-0000-0000-0000-000000000003', -- Fake gear_id
      'pending',
      now(),
      now() + interval '1 day',
      100,  -- Inconsistent total
      '{"total_cents": 500, "items": []}' -- Snapshot total is 500
    );
  $$::text,
  'P0001',
  'Cena nesouhlasí se snapshotem.',
  'INSERT with inconsistent amount_total_cents and pricing_snapshot should fail.'
);

SELECT * FROM finish();

ROLLBACK;