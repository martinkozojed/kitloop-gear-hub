-- 1) Fix function_search_path_mutable (P0)
-- Iterates over the known list of functions and forces search_path='public, auth, extensions'
-- Uses pg_proc to find all overloads safely.

DO $$
DECLARE
    func_name text;
    func_oid oid;
    func_sig text;
    target_functions text[] := ARRAY[
        'check_asset_provider_consistency',
        'check_overbooking_guard',
        'issue_reservation',
        'is_available',
        'process_return',
        'update_gear_last_rented',
        'is_provider_member',
        'check_reservation_pricing_consistency',
        'approve_provider',
        'log_reservation_changes',
        'check_variant_availability',
        'check_is_member_safe',
        'check_is_owner_safe',
        'get_my_role',
        'expire_stale_holds',
        'upsert_crm_customer',
        'get_customer_360',
        'update_customer_stats',
        'mock_send_notification',
        'handle_reservation_confirmation',
        'process_daily_reminders'
    ];
BEGIN
    FOREACH func_name IN ARRAY target_functions
    LOOP
        FOR func_oid IN 
            SELECT p.oid 
            FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'public' AND p.proname = func_name
        LOOP
            func_sig := func_oid::regprocedure;
            EXECUTE format('ALTER FUNCTION %s SET search_path = public, auth, extensions', func_sig);
            RAISE NOTICE 'Fixed search_path for %', func_sig;
        END LOOP;
    END LOOP;
END $$;


-- 2) Secure public.notification_logs (P0)
-- Enable RLS and revoke public access.
-- Default RLS policy is "deny all", which is what we want for this internal log table (only accessed by service role triggers/functions).

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notification_logs FROM anon;
REVOKE ALL ON TABLE public.notification_logs FROM authenticated;

-- Also revoke from sequence if it exists (usually notification_logs_id_seq)
-- We check catalog to be safe/generic-ish, or just try straightforward revoke ensuring no error if not exists
DO $$
DECLARE
    seq_name text;
BEGIN
    SELECT c.relname INTO seq_name
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_depend d ON d.objid = c.oid
    JOIN pg_class t ON d.refobjid = t.oid
    JOIN pg_attribute a ON d.refobjid = a.attrelid AND d.refobjsubid = a.attnum
    WHERE n.nspname = 'public' 
      AND t.relname = 'notification_logs' 
      AND c.relkind = 'S';

    IF seq_name IS NOT NULL THEN
        EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM anon, authenticated', seq_name);
        RAISE NOTICE 'Revoked access on sequence %', seq_name;
    END IF;
END $$;


-- 3) Verification Comments (for manual run)

/*
    -- Verify notification_logs security
    select
     has_table_privilege('anon', 'public.notification_logs', 'select') as anon_select,
     has_table_privilege('anon', 'public.notification_logs', 'insert') as anon_insert,
     has_table_privilege('authenticated', 'public.notification_logs', 'select') as auth_select,
     has_table_privilege('authenticated', 'public.notification_logs', 'insert') as auth_insert;
     -- Expect all FALSE

    -- Verify sequence security (if exists)
    -- Replace 'notification_logs_id_seq' with actual name if known, or check generic
    select
     has_sequence_privilege('anon', 'public.notification_logs_id_seq', 'usage') as anon_seq_usage,
     has_sequence_privilege('authenticated', 'public.notification_logs_id_seq', 'usage') as auth_seq_usage
    WHERE EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notification_logs_id_seq');
    -- Expect all FALSE

    -- Verify function search paths
    -- Should return 0 rows for the target functions
    SELECT proname, proconfig 
    FROM pg_proc 
    WHERE proname = ANY(ARRAY['check_asset_provider_consistency', 'process_return', 'issue_reservation'])
      AND (proconfig IS NULL OR NOT 'search_path=public, auth, extensions' = ANY(proconfig));
*/
