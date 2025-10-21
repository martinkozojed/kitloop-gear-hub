-- ============================================================================
-- SUPABASE STORAGE POLICIES FOR GEAR IMAGES
-- ============================================================================
-- Run these commands AFTER creating the 'gear-images' bucket in Supabase UI
-- Dashboard > Storage > Create bucket: "gear-images" (Public: YES)
-- ============================================================================

-- ============================================================================
-- 1. PROVIDERS CAN UPLOAD GEAR IMAGES TO THEIR FOLDER
-- ============================================================================

CREATE POLICY "Providers can upload gear images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gear-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM providers WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 2. PROVIDERS CAN UPDATE THEIR OWN IMAGES
-- ============================================================================

CREATE POLICY "Providers can update own gear images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gear-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM providers WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 3. PROVIDERS CAN DELETE THEIR OWN IMAGES
-- ============================================================================

CREATE POLICY "Providers can delete own gear images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gear-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM providers WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 4. ANYONE CAN VIEW GEAR IMAGES (PUBLIC BUCKET)
-- ============================================================================

CREATE POLICY "Anyone can view gear images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gear-images');

-- ============================================================================
-- SETUP INSTRUCTIONS
-- ============================================================================
--
-- Before running this SQL:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Storage
-- 3. Click "Create bucket"
-- 4. Name: "gear-images"
-- 5. Set as Public: YES
-- 6. Click Create
--
-- Then run this SQL in the SQL Editor
--
-- ============================================================================
