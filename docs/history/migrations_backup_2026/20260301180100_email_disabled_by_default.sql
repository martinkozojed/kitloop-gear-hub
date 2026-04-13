-- Audit item B: Pilot is in-app only. Disable email notifications by default
-- to prevent accidental spam if RESEND_API_KEY is configured.
-- Existing rows are NOT updated; only new rows get the safe default.
ALTER TABLE public.notification_preferences
ALTER COLUMN email_enabled
SET DEFAULT false;