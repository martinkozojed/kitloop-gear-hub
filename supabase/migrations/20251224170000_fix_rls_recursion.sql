
-- Fix Infinite Recursion in Profiles RLS by using a Security Definer function

-- 1. Create Helper Function
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- 2. Update Policies
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;

CREATE POLICY "Admins can view all profiles."
ON public.profiles FOR SELECT
USING ( check_is_admin() = true );

-- Ensure Self-View still exists (it's safe, recursive mainly happened due to the complex subquery in the other policy)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);
