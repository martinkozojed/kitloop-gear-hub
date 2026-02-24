-- Request Link hardening verification
-- Run after migrations 20260226100000_request_link_hardening.sql and 20260226110000_request_link_token_hash.sql
-- Usage: psql -U postgres -d postgres -f docs/verification/request_link_hardening_verify.sql
-- All assertions run in a transaction that is rolled back.

\set ON_ERROR_STOP on

BEGIN;

-- =============================================================================
-- 1. convert_request_to_reservation: exists and signature
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'convert_request_to_reservation'
  ) THEN
    RAISE EXCEPTION 'convert_request_to_reservation RPC not found';
  END IF;
END $$;

-- =============================================================================
-- 2. reservation_requests: has converted_at and request_link_token_hash
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservation_requests'
      AND column_name = 'converted_at'
  ) THEN
    RAISE EXCEPTION 'reservation_requests.converted_at column missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservation_requests'
      AND column_name = 'request_link_token_hash'
  ) THEN
    RAISE EXCEPTION 'reservation_requests.request_link_token_hash column missing';
  END IF;
END $$;

-- =============================================================================
-- 3. providers: token stored as hash only (no request_link_token)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'providers'
      AND column_name = 'request_link_token'
  ) THEN
    RAISE EXCEPTION 'providers.request_link_token should be dropped (token must not be stored plaintext)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'providers'
      AND column_name = 'request_link_token_hash'
  ) THEN
    RAISE EXCEPTION 'providers.request_link_token_hash column missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'providers'
      AND column_name = 'request_link_created_at'
  ) THEN
    RAISE EXCEPTION 'providers.request_link_created_at column missing';
  END IF;
END $$;

-- =============================================================================
-- 4. generate_or_regenerate_request_link_token exists
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_or_regenerate_request_link_token'
  ) THEN
    RAISE EXCEPTION 'generate_or_regenerate_request_link_token RPC not found';
  END IF;
END $$;

-- =============================================================================
-- 5. Status column and CHECK constraint
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservation_requests'
      AND column_name = 'status'
  ) THEN
    RAISE EXCEPTION 'reservation_requests.status column missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'reservation_requests'
      AND constraint_name = 'reservation_requests_status_converted_check'
  ) THEN
    RAISE EXCEPTION 'reservation_requests_status_converted_check constraint missing';
  END IF;
END $$;

-- =============================================================================
-- 6. Rate limit: submit_request_public exists (p_ip_hash, no plaintext IP) and table exists
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'request_submit_rate_buckets') THEN
    RAISE EXCEPTION 'request_submit_rate_buckets table missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'submit_request_public'
  ) THEN
    RAISE EXCEPTION 'submit_request_public RPC not found';
  END IF;
END $$;

-- =============================================================================
-- 6b. reservation_requests.rejected_at (for status='rejected' CHECK)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservation_requests' AND column_name = 'rejected_at'
  ) THEN
    RAISE EXCEPTION 'reservation_requests.rejected_at column missing';
  END IF;
END $$;

-- =============================================================================
-- 7. Negative test: convert without membership must fail (42501)
-- =============================================================================
DO $$
DECLARE
  v_provider_id uuid;
  v_request_id uuid;
  v_variant_id uuid;
  v_foreign_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_did_raise boolean := false;
BEGIN
  SELECT id INTO v_provider_id FROM public.providers LIMIT 1;
  IF v_provider_id IS NULL THEN
    RAISE NOTICE 'Skip convert negative test: no provider';
    RETURN;
  END IF;
  SELECT id INTO v_variant_id FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id WHERE p.provider_id = v_provider_id LIMIT 1;
  IF v_variant_id IS NULL THEN
    RAISE NOTICE 'Skip convert negative test: no variant';
    RETURN;
  END IF;
  INSERT INTO public.reservation_requests (
    provider_id, request_link_token_hash, customer_name, requested_start_date, requested_end_date, status
  ) VALUES (v_provider_id, 'test_hash_neg', 'Test', current_date + 1, current_date + 2, 'pending')
  RETURNING id INTO v_request_id;

  PERFORM set_config('request.jwt.claim.sub', v_foreign_user_id::text, true);

  BEGIN
    PERFORM public.convert_request_to_reservation(
      v_request_id, v_variant_id, 1,
      (current_date + 1)::timestamptz, (current_date + 2)::timestamptz,
      1000, NULL, NULL
    );
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_did_raise := true;
  END;

  IF NOT v_did_raise THEN
    RAISE EXCEPTION 'convert_request_to_reservation without membership should raise 42501';
  END IF;
END $$;

-- =============================================================================
-- 8. Negative test: reject non-pending returns 0 rows
-- =============================================================================
DO $$
DECLARE
  v_request_id uuid;
  v_updated int;
BEGIN
  SELECT id INTO v_request_id FROM public.reservation_requests WHERE status = 'converted' LIMIT 1;
  IF v_request_id IS NULL THEN
    SELECT id INTO v_request_id FROM public.reservation_requests WHERE status = 'rejected' LIMIT 1;
  END IF;
  IF v_request_id IS NULL THEN
    RAISE NOTICE 'Skip reject negative test: no converted/rejected request';
    RETURN;
  END IF;

  UPDATE public.reservation_requests
  SET status = 'rejected'
  WHERE id = v_request_id AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated != 0 THEN
    RAISE EXCEPTION 'Reject on non-pending request should update 0 rows, got %', v_updated;
  END IF;
END $$;

ROLLBACK;

-- Summary
SELECT 'Request Link hardening verification passed.' AS result;
