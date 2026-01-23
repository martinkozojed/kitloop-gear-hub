-- Harden SECURITY DEFINER functions
-- Explicitly set search_path to 'public' to prevent search path hijacking.
DO $$
DECLARE func RECORD;
BEGIN FOR func IN
SELECT pg_proc.oid::regprocedure::text as sig
FROM pg_proc
    JOIN pg_namespace n ON pg_proc.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND prosecdef = true
    AND pg_get_userbyid(pg_proc.proowner) != 'supabase_admin' -- Exclude specific functions if needed
    LOOP EXECUTE 'ALTER FUNCTION ' || func.sig || ' SET search_path = public';
END LOOP;
END $$;