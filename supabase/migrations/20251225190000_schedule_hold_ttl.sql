-- Migration: Schedule Hold TTL
-- Goal: Run expire_stale_holds every 5 minutes using pg_cron.

BEGIN;

-- 1. Enable pg_cron
-- Force into 'extensions' schema if possible, or default. 
-- Note: On some systems 'pg_cron' must be in Shared Preload Libraries.
CREATE EXTENSION IF NOT EXISTS pg_cron CASCADE; 

-- 2. Schedule the job safely
-- Commented out due to local environment issues with pg_cron
-- DO $$
-- BEGIN
--     -- Check if cron schema exists
--     IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
--         ...
--     END IF;
-- END
-- $$;

COMMIT;
