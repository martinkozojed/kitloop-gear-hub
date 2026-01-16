-- Harden storage uploads to go through server-side tickets only
-- Drop client-side insert policies and restrict inserts to service role for upload buckets

-- Gear images
DROP POLICY IF EXISTS "Providers can upload gear images" ON storage.objects;

-- Damage photos (return evidence)
DROP POLICY IF EXISTS "Providers can upload own return photos" ON storage.objects;
DROP POLICY IF EXISTS "Secure: Providers can upload own photos" ON storage.objects;

-- Logos
DROP POLICY IF EXISTS "Providers can upload logos" ON storage.objects;

-- Service role insert only for upload buckets (signed upload tokens)
CREATE POLICY "service_upload_only" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id IN ('gear-images', 'damage-photos', 'logos'));
