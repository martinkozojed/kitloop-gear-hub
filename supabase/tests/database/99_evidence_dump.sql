BEGIN;
SELECT plan(1);

-- Dump View Definition
SELECT diag('--- VIEW DEFINITION: public.gear_items ---');
SELECT diag(pg_get_viewdef('public.gear_items'::regclass, true));

-- Dump Grants
SELECT diag('--- TABLE GRANTS: public.gear_items ---');
SELECT diag(grantee || ': ' || privilege_type) 
FROM information_schema.role_table_grants 
WHERE table_schema='public' and table_name='gear_items';

-- Dump RLS
SELECT diag('--- RLS SETTINGS ---');
SELECT diag(relname || ' | RLS: ' || relrowsecurity || ' | Force: ' || relforcerowsecurity)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND relname IN ('products','product_variants','assets');

SELECT pass('Evidence gathered');
SELECT * FROM finish();
ROLLBACK;
