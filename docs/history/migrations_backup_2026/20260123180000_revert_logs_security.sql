-- Revert loose permissions on notification_logs
-- User requested to treat 403 as "no logs" instead of opening internal data.
-- Drop policies first to remove usage of the function
DROP POLICY IF EXISTS "logs_member_select_final" ON "public"."notification_logs";
DROP POLICY IF EXISTS "logs_member_select_v3" ON "public"."notification_logs";
-- Now drop the function
DROP FUNCTION IF EXISTS public.check_notification_log_access(uuid);