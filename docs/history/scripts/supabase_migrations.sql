-- ============================================================================
-- KITLOOP GEAR HUB - SUPABASE AUTHENTICATION SETUP
-- ============================================================================
-- Run these SQL commands in your Supabase SQL Editor
-- Execute them in order from top to bottom
-- ============================================================================

-- ============================================================================
-- 1. DATABASE TRIGGER FOR AUTO-CREATING PROFILES
-- ============================================================================
-- This function automatically creates a profile when a new user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to call function on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES - PROFILES TABLE
-- ============================================================================

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES - PROVIDERS TABLE
-- ============================================================================

-- Enable RLS on providers table
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view verified providers" ON public.providers;
DROP POLICY IF EXISTS "Providers can update own data" ON public.providers;
DROP POLICY IF EXISTS "Providers can insert own data" ON public.providers;

-- Anyone can view verified providers (for marketplace)
CREATE POLICY "Anyone can view verified providers"
  ON public.providers FOR SELECT
  USING (verified = true OR auth.uid() = user_id);

-- Providers can update their own data
CREATE POLICY "Providers can update own data"
  ON public.providers FOR UPDATE
  USING (auth.uid() = user_id);

-- Providers can insert their own data
CREATE POLICY "Providers can insert own data"
  ON public.providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES - GEAR_ITEMS TABLE
-- ============================================================================

-- Enable RLS on gear_items table
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active gear" ON public.gear_items;
DROP POLICY IF EXISTS "Providers can manage own gear" ON public.gear_items;

-- Anyone can view active gear
CREATE POLICY "Anyone can view active gear"
  ON public.gear_items FOR SELECT
  USING (active = true);

-- Providers can manage their own gear (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Providers can manage own gear"
  ON public.gear_items FOR ALL
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES - RESERVATIONS TABLE
-- ============================================================================

-- Enable RLS on reservations table
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can view their gear reservations" ON public.reservations;

-- Users can view their own reservations
CREATE POLICY "Users can view own reservations"
  ON public.reservations FOR SELECT
  USING (user_id = auth.uid());

-- Users can create reservations
CREATE POLICY "Users can create reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Providers can view reservations for their gear
CREATE POLICY "Providers can view their gear reservations"
  ON public.reservations FOR SELECT
  USING (
    gear_id IN (
      SELECT gi.id
      FROM public.gear_items gi
      JOIN public.providers p ON gi.provider_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
--
-- Next steps:
-- 1. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file
-- 2. Test signup with customer role
-- 3. Test signup with provider role
-- 4. Test login and logout
-- 5. Verify RLS policies are working correctly
--
-- ============================================================================
