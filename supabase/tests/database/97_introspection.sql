-- 97_introspection.sql
BEGIN;
SELECT plan(1);

SELECT diag('--- BUCKETS ---');
SELECT diag('id: ' || id || ', public: ' || public) 
FROM storage.buckets 
WHERE id='damage-photos';

SELECT diag('--- POLICIES ---');
SELECT diag('Table: ' || tablename || ' | Policy: ' || policyname || ' | Cmd: ' || cmd || ' | Roles: ' || array_to_string(roles, ',') || ' | Qual: ' || coalesce(qual::text, 'NULL') || ' | WithCheck: ' || coalesce(with_check::text, 'NULL'))
FROM pg_policies 
WHERE tablename IN ('objects', 'return_reports')
ORDER BY tablename, policyname;

SELECT pass('Introspection complete');
SELECT * FROM finish();
ROLLBACK;
