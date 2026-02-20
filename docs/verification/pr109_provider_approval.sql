-- =============================================================================
-- PR109 Verification Queries: provider approval predicate + atomic approve
-- =============================================================================
-- Run against your Supabase project:
--   supabase db remote set <connection-string>
--   psql <connection-string> -f docs/verification/pr109_provider_approval.sql
-- Or paste into the Supabase SQL editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Predicate result for approved vs pending providers
-- ---------------------------------------------------------------------------
-- Expected: approved rows → is_approved = true; pending rows → is_approved = false
SELECT
  id,
  rental_name,
  status,
  verified,
  approved_at,
  deleted_at,
  public.is_provider_approved(id) AS is_approved
FROM public.providers
ORDER BY status, created_at DESC
LIMIT 50;

-- ---------------------------------------------------------------------------
-- B) Prove no invalid combos exist (should return 0 rows after migration)
-- ---------------------------------------------------------------------------
-- Case 1: approved_at set but verified = false (violates CHECK constraint)
SELECT
  id,
  rental_name,
  status,
  verified,
  approved_at,
  'approved_at set but verified=false' AS violation
FROM public.providers
WHERE approved_at IS NOT NULL
  AND verified = false

UNION ALL

-- Case 2: status='approved' but is_provider_approved() = false
-- (means either verified=false or approved_at IS NULL — the old bug)
SELECT
  id,
  rental_name,
  status,
  verified,
  approved_at,
  'status=approved but predicate=false' AS violation
FROM public.providers
WHERE status = 'approved'
  AND NOT public.is_provider_approved(id);

-- Expected: 0 rows.

-- ---------------------------------------------------------------------------
-- C) Confirm the canonical function exists with correct definition
-- ---------------------------------------------------------------------------
SELECT
  p.proname                                           AS function_name,
  pg_get_functiondef(p.oid)                           AS definition,
  p.prosecdef                                         AS security_definer,
  array_to_string(p.proconfig, ', ')                  AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'is_provider_approved';

-- Expected: 1 row, security_definer=true, config contains 'search_path=public'

-- ---------------------------------------------------------------------------
-- D) Confirm CHECK constraint exists on providers table
-- ---------------------------------------------------------------------------
SELECT
  conname   AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.providers'::regclass
  AND conname = 'chk_approved_at_requires_verified';

-- Expected: 1 row with definition: CHECK ((approved_at IS NULL OR verified = true))

-- ---------------------------------------------------------------------------
-- E) Confirm admin_approve_provider now sets approved_at
-- ---------------------------------------------------------------------------
-- After calling admin_approve_provider for a test provider, run:
--   SELECT id, status, verified, approved_at FROM public.providers WHERE id = '<test-id>';
-- Expected: status='approved', verified=true, approved_at IS NOT NULL (all three set)
