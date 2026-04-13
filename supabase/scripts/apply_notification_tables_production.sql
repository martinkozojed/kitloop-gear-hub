-- Idempotent script: run once in Supabase Dashboard → SQL Editor (production project).
-- Creates notification_preferences, notification_outbox, notification_deliveries and enables realtime.
-- Requires: public.providers, public.profiles already exist.

-- Extension for updated_at trigger
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- 1) Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    email_enabled boolean NOT NULL DEFAULT true,
    inapp_enabled boolean NOT NULL DEFAULT true,
    webpush_enabled boolean NOT NULL DEFAULT false,
    ops_daily_digest boolean NOT NULL DEFAULT true,
    ops_realtime boolean NOT NULL DEFAULT true,
    edu_digest boolean NOT NULL DEFAULT false,
    quiet_hours_start time,
    quiet_hours_end time,
    timezone text NOT NULL DEFAULT 'Europe/Prague',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(provider_id, user_id)
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own preferences" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS handle_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER handle_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 2) Notification outbox (in-app + email outbox)
CREATE TABLE IF NOT EXISTS public.notification_outbox (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    kind text NOT NULL,
    channel text NOT NULL,
    priority int NOT NULL DEFAULT 5,
    idempotency_key text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending',
    attempt_count int NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_dedupe ON public.notification_outbox (provider_id, user_id, channel, idempotency_key);
CREATE INDEX IF NOT EXISTS notification_outbox_pending ON public.notification_outbox (status, next_attempt_at);
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own outbox entries" ON public.notification_outbox;
CREATE POLICY "Users can view their own outbox entries" ON public.notification_outbox FOR SELECT USING (auth.uid() = user_id);

-- read_at column (for unread state)
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS read_at timestamptz DEFAULT NULL;
DROP POLICY IF EXISTS "Users can mark their own outbox entries as read" ON public.notification_outbox;
CREATE POLICY "Users can mark their own outbox entries as read" ON public.notification_outbox FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) Notification deliveries (audit log)
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    outbox_id uuid NOT NULL REFERENCES public.notification_outbox(id) ON DELETE CASCADE,
    provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    channel text NOT NULL,
    external_id text,
    delivered_at timestamptz,
    opened_at timestamptz,
    clicked_at timestamptz,
    bounced_at timestamptz,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own deliveries" ON public.notification_deliveries;
CREATE POLICY "Users can view their own deliveries" ON public.notification_deliveries FOR SELECT USING (auth.uid() = user_id);

-- 4) Enable Realtime for notification_outbox (so in-app live updates work)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'notification_outbox'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_outbox;
    END IF;
END $$;
