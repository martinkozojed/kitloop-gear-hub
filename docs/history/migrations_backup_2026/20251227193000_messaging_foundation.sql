-- Migration: Messaging System Foundation
-- 1. Create Log Table
CREATE TYPE notification_type AS ENUM ('confirmation', 'pickup_reminder', 'return_reminder', 'review_request');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.providers(id), -- For filtering
    type notification_type NOT NULL,
    status notification_status DEFAULT 'pending',
    recipient_email TEXT,
    subject TEXT,
    content_preview TEXT, -- Short preview for UI
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    error_message TEXT,
    meta_data JSONB -- For storing extra context
);

-- Index for showing logs in UI
CREATE INDEX IF NOT EXISTS idx_notification_logs_reservation ON public.notification_logs(reservation_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_provider ON public.notification_logs(provider_id);

-- 2. Mock Send Function (The "Mailer")
-- In production, this would call an Edge Function. Here it just logs.
CREATE OR REPLACE FUNCTION public.mock_send_notification(
    p_reservation_id UUID,
    p_type notification_type
) RETURNS UUID AS $$
DECLARE
    v_res RECORD;
    v_email TEXT;
    v_subject TEXT;
    v_content TEXT;
    v_log_id UUID;
BEGIN
    -- Fetch Data
    SELECT r.*, c.email, p.rental_name 
    INTO v_res
    FROM reservations r
    JOIN customers c ON r.crm_customer_id = c.id
    JOIN providers p ON r.provider_id = p.id
    WHERE r.id = p_reservation_id;

    IF v_res IS NULL THEN
        RAISE WARNING 'Reservation % not found or missing customer', p_reservation_id;
        RETURN NULL;
    END IF;

    -- Template Logic (Simple strings for now)
    v_email := v_res.email;
    
    IF p_type = 'confirmation' THEN
        v_subject := '✅ Rezervace potvrzena: #' || substring(p_reservation_id::text, 1, 8);
        v_content := 'Dobrý den, vaše rezervace je potvrzena. Těšíme se na vás.';
    ELSIF p_type = 'pickup_reminder' THEN
        v_subject := '⏰ Zítra vás čekáme!';
        v_content := 'Nezapomeňte si doklady. Vyzvednutí je zítra.';
    ELSIF p_type = 'return_reminder' THEN
        v_subject := '↩️ Blíží se čas vrácení';
        v_content := 'Prosíme vrátit vybavení do ' || to_char(v_res.end_date, 'DD.MM HH:MI');
    END IF;

    -- "Send" (Insert Log)
    INSERT INTO public.notification_logs (
        reservation_id, provider_id, type, status, recipient_email, subject, content_preview
    ) VALUES (
        p_reservation_id, v_res.provider_id, p_type, 'sent', v_email, v_subject, v_content
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
