BEGIN;
select plan(4);

-- 1. Check Function Existence
select has_function('public', 'create_return_report', 'create_return_report RPC should exist');
select has_function('public', 'attach_return_photos', 'attach_return_photos RPC should exist');

-- 2. Check Column Existence
select has_column('public', 'return_reports', 'photo_evidence', 'return_reports table should have photo_evidence column');

-- 3. Check Policy Existence (Heuristic)
-- 3. Check Policy Existence (Manual check since policy_exists might be missing)
select results_eq(
  $$ select count(*)::int from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Secure: Providers can upload own photos' $$,
  $$ values (1) $$,
  'Strict upload policy should exist'
);

-- 4. Check Policy Logic (Security)
-- Detailed logic tests are in verify_return_hardening_strict.sql
-- Here we just assert the artifacts necessary for security are present.

select finish();
ROLLBACK;
