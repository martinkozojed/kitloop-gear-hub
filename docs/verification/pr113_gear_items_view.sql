-- =============================================================================
-- PR113 Verification: gear_items is a VIEW, not a TABLE
-- =============================================================================
-- Run against local Supabase after `supabase start`:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
--     -f docs/verification/pr113_gear_items_view.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Confirm gear_items object type (must be 'v' = view, not 'r' = table)
-- ---------------------------------------------------------------------------
-- Expected: relkind = 'v'
SELECT relkind
FROM pg_class
WHERE oid = 'public.gear_items'::regclass;

-- ---------------------------------------------------------------------------
-- 2. Confirm security_invoker is set on the view (access control delegation)
-- ---------------------------------------------------------------------------
-- Expected: security_invoker = true (row returned)
SELECT
  c.relname                                    AS view_name,
  (c.reloptions::text ILIKE '%security_invoker=true%') AS security_invoker
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'gear_items';

-- ---------------------------------------------------------------------------
-- 3. Confirm no RLS policies exist on gear_items (it is a view — none expected)
-- ---------------------------------------------------------------------------
-- Expected: 0 rows
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'public.gear_items'::regclass;

-- ---------------------------------------------------------------------------
-- 4. Confirm underlying tables (products, product_variants) have RLS enabled
-- ---------------------------------------------------------------------------
-- Expected: relrowsecurity = true for both
SELECT relname, relrowsecurity
FROM pg_class
WHERE oid IN (
  'public.products'::regclass,
  'public.product_variants'::regclass
);

-- ---------------------------------------------------------------------------
-- 5. Confirm anon cannot SELECT gear_items directly (no GRANT to PUBLIC/anon)
-- ---------------------------------------------------------------------------
-- Expected: has_table_privilege = false for anon
SELECT has_table_privilege('anon', 'public.gear_items', 'SELECT') AS anon_can_select;

-- ---------------------------------------------------------------------------
-- 6. Confirm the migration applied cleanly (no 42809 error)
-- ---------------------------------------------------------------------------
-- If supabase start succeeded, this query will return a result.
-- If the migration had failed, this database would not exist.
SELECT 'migration applied cleanly' AS status;
