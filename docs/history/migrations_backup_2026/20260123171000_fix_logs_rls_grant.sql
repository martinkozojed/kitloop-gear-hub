-- Grant execute permission on the 403-fixing function
GRANT EXECUTE ON FUNCTION public.check_notification_log_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_notification_log_access(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_notification_log_access(uuid) TO anon;