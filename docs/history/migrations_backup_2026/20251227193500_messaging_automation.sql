-- Migration: Messaging Automation
-- 1. Confirmation Trigger
CREATE OR REPLACE FUNCTION public.handle_reservation_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to 'confirmed' (or created as 'confirmed')
    -- AND no previous confirmation log exists
    IF (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed')) THEN
        PERFORM public.mock_send_notification(NEW.id, 'confirmation');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_send_confirmation
AFTER INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.handle_reservation_confirmation();


-- 2. Cron Processor (Reminders)
CREATE OR REPLACE FUNCTION public.process_daily_reminders()
RETURNS void AS $$
DECLARE
    r RECORD;
    cnt INT := 0;
BEGIN
    -- A. Pickup Reminders (Starts in 24h +/- 1h buffer)
    -- Logic: Start Date is tomorrow (approx)
    -- Simplified: Start Date::date = Tomorrow
    FOR r IN 
        SELECT id FROM reservations 
        WHERE start_date::date = (now() + interval '1 day')::date
        AND status = 'confirmed'
    LOOP
        -- Check if already sent
        PERFORM public.mock_send_notification(r.id, 'pickup_reminder')
        WHERE NOT EXISTS (
            SELECT 1 FROM notification_logs 
            WHERE reservation_id = r.id AND type = 'pickup_reminder'
        );
    END LOOP;

    -- B. Return Reminders (Ends in 24h)
    FOR r IN 
        SELECT id FROM reservations 
        WHERE end_date::date = (now() + interval '1 day')::date
        AND status IN ('active', 'checked_out') -- Only active rentals
    LOOP
        PERFORM public.mock_send_notification(r.id, 'return_reminder')
        WHERE NOT EXISTS (
            SELECT 1 FROM notification_logs 
            WHERE reservation_id = r.id AND type = 'return_reminder'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Schedule Cron (Job Name: 'daily_reminders')
-- Run every hour to be safe, logic is idempotent
SELECT cron.schedule('daily_reminders', '0 * * * *', 'SELECT public.process_daily_reminders()');
