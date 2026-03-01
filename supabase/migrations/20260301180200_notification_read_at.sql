-- Audit item D: Add read_at column for real unread state tracking.
-- NULL = unread, timestamp = read.
ALTER TABLE public.notification_outbox
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;
-- Allow users to update read_at on their own outbox entries
CREATE POLICY "Users can mark their own outbox entries as read" ON public.notification_outbox FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);