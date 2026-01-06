\echo '--- VIEW DEFINITION: public.gear_items ---'
select pg_get_viewdef('public.gear_items'::regclass, true);

\echo '--- TABLE GRANTS: public.gear_items ---'
select grantee, privilege_type from information_schema.role_table_grants
     where table_schema='public' and table_name='gear_items' order by 1,2;

\echo '--- RLS SETTINGS: products, product_variants, assets ---'
select relname, relrowsecurity, relforcerowsecurity
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and relname in ('products','product_variants','assets');
