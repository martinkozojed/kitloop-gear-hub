-- Harden RLS for reservations, reservation_assignments, return_reports, and damage-photos storage

BEGIN;

-- Trusted membership helper: use provider owner or provider_members table
-- (Assumes provider_members is the trusted mapping created earlier)

-- 1) Reservations
DROP POLICY IF EXISTS "rbac_reservation_select" ON public.reservations;
DROP POLICY IF EXISTS "rbac_reservation_write" ON public.reservations;
DROP POLICY IF EXISTS "rbac_reservation_modify" ON public.reservations;

CREATE POLICY "reservations_select_member"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_admin_trusted()
      OR EXISTS (
        SELECT 1 FROM public.provider_members pm
        WHERE pm.provider_id = reservations.provider_id
          AND pm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.providers p
        WHERE p.id = reservations.provider_id
          AND p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "reservations_insert_member"
  ON public.reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_trusted()
    OR EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id = provider_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "reservations_update_member"
  ON public.reservations
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_trusted()
    OR EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id = reservations.provider_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = reservations.provider_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin_trusted()
    OR EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id = reservations.provider_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = reservations.provider_id
        AND p.user_id = auth.uid()
    )
  );

-- 2) Reservation assignments
DROP POLICY IF EXISTS "Assignments: Provider Access" ON public.reservation_assignments;
DROP POLICY IF EXISTS "Assignments: Customer Read" ON public.reservation_assignments;

CREATE POLICY "assignments_member_access"
  ON public.reservation_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reservations r
      WHERE r.id = reservation_assignments.reservation_id
        AND r.deleted_at IS NULL
        AND (
          public.is_admin_trusted()
          OR EXISTS (
            SELECT 1 FROM public.provider_members pm
            WHERE pm.provider_id = r.provider_id
              AND pm.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.providers p
            WHERE p.id = r.provider_id
              AND p.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.reservations r
      WHERE r.id = reservation_assignments.reservation_id
        AND r.deleted_at IS NULL
        AND (
          public.is_admin_trusted()
          OR EXISTS (
            SELECT 1 FROM public.provider_members pm
            WHERE pm.provider_id = r.provider_id
              AND pm.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.providers p
            WHERE p.id = r.provider_id
              AND p.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "assignments_customer_read"
  ON public.reservation_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_assignments.reservation_id
        AND r.user_id = auth.uid()
    )
  );

-- 3) Return reports
DROP POLICY IF EXISTS "Providers can view own reports" ON public.return_reports;
DROP POLICY IF EXISTS "Providers can insert own reports" ON public.return_reports;

CREATE POLICY "return_reports_member_select"
  ON public.return_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id = return_reports.provider_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = return_reports.provider_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin_trusted()
  );

CREATE POLICY "return_reports_member_write"
  ON public.return_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id = return_reports.provider_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = return_reports.provider_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin_trusted()
  );

CREATE POLICY "return_reports_member_update"
  ON public.return_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id = return_reports.provider_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = return_reports.provider_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin_trusted()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id = return_reports.provider_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = return_reports.provider_id
        AND p.user_id = auth.uid()
    )
    OR public.is_admin_trusted()
  );

-- 4) Storage policies for damage-photos
DROP POLICY IF EXISTS "Secure: Providers can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Secure: Providers can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Secure: Providers can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view own return photos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can upload own return photos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can manage own return photos" ON storage.objects;

-- Select
CREATE POLICY "damage_photos_select_member"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'damage-photos'
  AND (
    public.is_admin_trusted()
    OR EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id::text = split_part(name, '/', 1)
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  )
);

-- Insert (uploads should be service role via signed URLs; keep only service)
CREATE POLICY "damage_photos_insert_service"
ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'damage-photos');

-- Delete
CREATE POLICY "damage_photos_delete_member"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'damage-photos'
  AND (
    public.is_admin_trusted()
    OR EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id::text = split_part(name, '/', 1)
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  )
);

COMMIT;

