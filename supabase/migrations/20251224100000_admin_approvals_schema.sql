-- Add security columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Function for Admin to approve a provider
-- SECURITY DEFINER: Runs with privileges of the creator (postgres/admin), bypassing RLS
CREATE OR REPLACE FUNCTION public.approve_provider(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the executor is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only admins can approve providers.';
    END IF;

    -- Perform the update
    UPDATE public.profiles
    SET is_verified = true,
        updated_at = now()
    WHERE user_id = target_user_id;
END;
$$;

-- RLS Updates: Restrict Unverified Users
-- 1. Gear Items: Only verified providers can insert
DROP POLICY IF EXISTS "Providers can insert their own gear." ON public.gear_items;
CREATE POLICY "Verified Providers can insert their own gear."
ON public.gear_items FOR INSERT
WITH CHECK (
    auth.uid() = provider_id 
    AND 
    (SELECT is_verified FROM public.profiles WHERE user_id = auth.uid()) = true
);

-- 2. Reservations: Only verified providers can insert (create reservations manually)
DROP POLICY IF EXISTS "Providers can insert their own reservations." ON public.reservations;
CREATE POLICY "Verified Providers can insert their own reservations."
ON public.reservations FOR INSERT
WITH CHECK (
    auth.uid() = provider_id
    AND
    (SELECT is_verified FROM public.profiles WHERE user_id = auth.uid()) = true
);

-- 3. Allow Admins to View All Profiles (for approval list)
CREATE POLICY "Admins can view all profiles."
ON public.profiles FOR SELECT
USING (
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
);

-- 4. Allow Admins to Update All Profiles (via RPC ideally, but policy good backup)
CREATE POLICY "Admins can update all profiles."
ON public.profiles FOR UPDATE
USING (
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
);
