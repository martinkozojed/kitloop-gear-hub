
-- Fix RLS on profiles to allow users to read their own role/is_admin status
-- and allow admins to view all.

-- 1. Ensure basic self-read access exists (Non-recursive)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- 2. Admin Access (Avoid recursion if possible, but standard pattern is usually safe enough if self-view exists)
-- We rely on the Self-View policy to allow the subquery to succeed for the admin themselves.
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;
CREATE POLICY "Admins can view all profiles."
ON public.profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

-- 3. Allow Updates (Self)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Enable RLS (just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
