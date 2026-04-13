-- Lockdown storage policies for public buckets (logos, gear-images) while keeping public fetch

BEGIN;

-- Bucket flags: public read for logos/gear-images, damage-photos stays private
UPDATE storage.buckets SET public = true WHERE id IN ('logos','gear-images');
UPDATE storage.buckets SET public = false WHERE id = 'damage-photos';

-- Drop legacy policies
DROP POLICY IF EXISTS "service_upload_only" ON storage.objects;
DROP POLICY IF EXISTS "Providers can upload gear images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update own gear images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete own gear images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view gear images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update own logos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete own logos" ON storage.objects;

-- Recreate service upload policy (signed URLs) for public buckets
CREATE POLICY "service_upload_only_public_buckets"
ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id IN ('gear-images','logos'));

-- Select (list/read via API) limited to provider members/owners/admin; public fetch uses bucket public flag, not this policy.
CREATE POLICY "gear_images_select_member"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'gear-images'
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

CREATE POLICY "logos_select_member"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'logos'
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

-- Delete scoped to provider prefix/admin
CREATE POLICY "gear_images_delete_member"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'gear-images'
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

CREATE POLICY "logos_delete_member"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'logos'
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

-- Update restricted to service_role to avoid member tampering
CREATE POLICY "public_buckets_update_service"
ON storage.objects
FOR UPDATE TO service_role
USING (bucket_id IN ('gear-images','logos'))
WITH CHECK (bucket_id IN ('gear-images','logos'));

COMMIT;

