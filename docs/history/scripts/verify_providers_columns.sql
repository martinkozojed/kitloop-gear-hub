-- ============================================================================
-- VERIFY PROVIDERS TABLE COLUMNS
-- ============================================================================
-- Run this in Supabase SQL Editor to check all columns exist
-- ============================================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'providers'
ORDER BY ordinal_position;

-- ============================================================================
-- EXPECTED COLUMNS (from ProviderSetup.tsx INSERT):
-- ============================================================================
-- ✅ id (auto-generated)
-- ✅ user_id
-- ✅ rental_name
-- ✅ contact_name
-- ✅ email
-- ✅ phone
-- ✅ company_id
-- ✅ address
-- ✅ location
-- ✅ country
-- ✅ category
-- ✅ time_zone
-- ✅ currency
-- ✅ website (nullable)
-- ✅ seasonal_mode
-- ✅ onboarding_completed
-- ✅ onboarding_step
-- ✅ status
-- ✅ verified
-- ✅ current_season
-- ✅ created_at (auto-generated)
-- ✅ updated_at (auto-generated)
