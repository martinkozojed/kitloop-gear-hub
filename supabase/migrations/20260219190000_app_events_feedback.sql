BEGIN;

CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  metadata jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_app_events_provider_created_at
  ON public.app_events (provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_event_name_created_at
  ON public.app_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_provider_event_created_at
  ON public.app_events (provider_id, event_name, created_at DESC);

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  page_path text NULL,
  metadata jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_provider_created_at
  ON public.feedback (provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_page_path_created_at
  ON public.feedback (page_path, created_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_events_insert_provider_member" ON public.app_events;
CREATE POLICY "app_events_insert_provider_member"
  ON public.app_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.providers pr
        WHERE pr.id = app_events.provider_id
          AND pr.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.provider_members pm
        WHERE pm.provider_id = app_events.provider_id
          AND pm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_provider_memberships upm
        WHERE upm.provider_id = app_events.provider_id
          AND upm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "app_events_select_provider_member_or_admin" ON public.app_events;
CREATE POLICY "app_events_select_provider_member_or_admin"
  ON public.app_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.role = 'admin' OR p.is_admin = true)
    )
    OR EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = app_events.provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.provider_members pm
      WHERE pm.provider_id = app_events.provider_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships upm
      WHERE upm.provider_id = app_events.provider_id
        AND upm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "feedback_insert_provider_member" ON public.feedback;
CREATE POLICY "feedback_insert_provider_member"
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.providers pr
        WHERE pr.id = feedback.provider_id
          AND pr.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.provider_members pm
        WHERE pm.provider_id = feedback.provider_id
          AND pm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_provider_memberships upm
        WHERE upm.provider_id = feedback.provider_id
          AND upm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "feedback_select_provider_member_or_admin" ON public.feedback;
CREATE POLICY "feedback_select_provider_member_or_admin"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.role = 'admin' OR p.is_admin = true)
    )
    OR EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = feedback.provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.provider_members pm
      WHERE pm.provider_id = feedback.provider_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships upm
      WHERE upm.provider_id = feedback.provider_id
        AND upm.user_id = auth.uid()
    )
  );

COMMIT;
