BEGIN;
select plan(5);

-- 1. Check Function Existence
select has_function('public', 'create_return_report', 'create_return_report RPC should exist');
select has_function('public', 'attach_return_photos', 'attach_return_photos RPC should exist');

-- 2. Check Column Existence
select has_column('public', 'return_reports', 'photo_evidence', 'return_reports table should have photo_evidence column');

-- 3. Check Policy Existence (Heuristic)
select policy_exists(
  'storage', 'objects', 'Secure: Providers can upload own photos',
  'Strict upload policy should exist'
);

-- 4. Check Policy Logic (Security)
-- Detailed logic tests are in verify_return_hardening_strict.sql
-- Here we just assert the artifacts necessary for security are present.

select finish();
ROLLBACK;
