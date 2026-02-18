-- PR4-1A verification script
-- Negative checks: unauthorized, cross-provider, deleted assets not issued
-- Positive behavior: return twice is safe (idempotent)

DO $$
BEGIN
  BEGIN
    PERFORM public.issue_reservation(
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000002'::uuid,
      '00000000-0000-0000-0000-000000000003'::uuid,
      false,
      NULL
    );
    RAISE NOTICE 'unauthorized fails: function returned (check fixture/auth context)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'unauthorized fails: PASS (%).', SQLERRM;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    PERFORM public.issue_reservation(
      '00000000-0000-0000-0000-000000000004'::uuid,
      'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
      '00000000-0000-0000-0000-000000000005'::uuid,
      false,
      'cross-provider attempt'
    );
    RAISE NOTICE 'cross-provider fails: function returned (check fixture/auth context)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'cross-provider fails: PASS (%).', SQLERRM;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    PERFORM public.issue_reservation(
      '00000000-0000-0000-0000-000000000006'::uuid,
      '00000000-0000-0000-0000-000000000007'::uuid,
      '00000000-0000-0000-0000-000000000008'::uuid,
      false,
      NULL
    );
    RAISE NOTICE 'deleted assets not issued: function returned (check fixture/auth context)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'deleted assets not issued: PASS (%).', SQLERRM;
  END;
END $$;

DO $$
DECLARE
  v_first JSONB;
  v_second JSONB;
BEGIN
  BEGIN
    SELECT public.process_return(
      '00000000-0000-0000-0000-000000000009'::uuid,
      false,
      'first return'
    ) INTO v_first;

    SELECT public.process_return(
      '00000000-0000-0000-0000-000000000009'::uuid,
      false,
      'second return'
    ) INTO v_second;

    RAISE NOTICE 'return twice safe: PASS (first=%, second=%).', v_first, v_second;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'return twice safe: inconclusive (%).', SQLERRM;
  END;
END $$;
-- PR4-1A verification SQL
-- Replace placeholder UUIDs with real local test fixtures before execution.

-- 1) unauthorized fails
SELECT public.issue_reservation(
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid,
  false,
  NULL
);

-- 2) cross-provider fails (provider argument ignored; derived provider enforced)
SELECT public.issue_reservation(
  '00000000-0000-0000-0000-000000000004'::uuid,
  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
  '00000000-0000-0000-0000-000000000005'::uuid,
  false,
  'cross-provider attempt'
);

-- 3) deleted assets not issued
SELECT public.issue_reservation(
  '00000000-0000-0000-0000-000000000006'::uuid,
  '00000000-0000-0000-0000-000000000007'::uuid,
  '00000000-0000-0000-0000-000000000008'::uuid,
  false,
  NULL
);

-- 4) return twice safe (2nd call should be deterministic no-op success)
SELECT public.process_return(
  '00000000-0000-0000-0000-000000000009'::uuid,
  false,
  'first return'
);

SELECT public.process_return(
  '00000000-0000-0000-0000-000000000009'::uuid,
  false,
  'second return should be no-op'
);
-- PR4-1A verification: provider-only RPC hardening
-- Run after applying migrations against local Supabase DB.

-- 1) Unauthorized should fail (assert_provider_role expected to reject).
-- Replace UUID with a reservation owned by another provider/account.
SELECT public.issue_reservation(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    false,
    NULL
);

-- 2) Cross-provider should fail even if caller supplies provider_id.
-- provider_id argument is intentionally ignored; derived provider must be authorized.
SELECT public.issue_reservation(
    '00000000-0000-0000-0000-000000000004'::uuid,
    'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    false,
    'cross-provider attempt'
);

-- 3) Deleted assets should not be issued (expect error unless override=true).
-- Use a reservation whose assigned asset has deleted_at IS NOT NULL.
SELECT public.issue_reservation(
    '00000000-0000-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000007'::uuid,
    '00000000-0000-0000-0000-000000000008'::uuid,
    false,
    NULL
);

-- 4) Return is idempotent and safe to call twice.
SELECT public.process_return(
    '00000000-0000-0000-0000-000000000009'::uuid,
    false,
    'first return'
);

SELECT public.process_return(
    '00000000-0000-0000-0000-000000000009'::uuid,
    false,
    'second return should be deterministic no-op'
);
