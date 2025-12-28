-- Migration: Schedule Daily Reminders via pg_cron

-- 1. Enable Extension (if not already)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create Processor Function
CREATE OR REPLACE FUNCTION public.process_daily_reminders()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    -- A. Pickup Reminders (Starts in 24h)
    -- Logic: start_date is tomorrow (ignoring time for simplicity, or specifically > now() and < now() + 30h)
    FOR r IN
        SELECT id FROM reservations 
        WHERE status = 'confirmed' 
        AND start_date::date = (current_date + interval '1 day')::date
        AND NOT EXISTS (
            SELECT 1 FROM notification_logs 
            WHERE reservation_id = reservations.id AND type = 'pickup_reminder'
        )
    LOOP
        PERFORM public.mock_send_notification(r.id, 'pickup_reminder');
    END LOOP;

    -- B. Return Reminders (Ends in 24h)
    FOR r IN
        SELECT id FROM reservations 
        WHERE status = 'active' -- Only active rentals need return reminders
        AND end_date::date = (current_date + interval '1 day')::date
        AND NOT EXISTS (
            SELECT 1 FROM notification_logs 
            WHERE reservation_id = reservations.id AND type = 'return_reminder'
        )
    LOOP
        PERFORM public.mock_send_notification(r.id, 'return_reminder');
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule Cron Job (Run every morning at 08:00 UTC)
-- Note: In local dev, you might need to run: SELECT cron.schedule('...', '...');
-- wrapping in DO block to avoid error if exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily_reminders') THEN
        PERFORM cron.schedule('daily_reminders', '0 8 * * *', 'SELECT public.process_daily_reminders()');
    END IF;
END $$;
