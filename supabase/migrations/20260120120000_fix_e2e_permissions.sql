-- Fix E2E permissions and RLS inconsistencies

BEGIN;

-- 1. Restore/Fix Kitloop Admin permissions
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'kitloop-admin@kitloop.cz';
  IF v_admin_id IS NOT NULL THEN
    -- Ensure user_roles table exists (it should from 20260115090000)
    -- Insert into user_roles to prevent future resets
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (v_admin_id, 'admin') 
    ON CONFLICT (user_id) DO NOTHING;

    -- Restore profile admin status
    UPDATE public.profiles 
    SET role = 'admin', is_admin = true 
    WHERE user_id = v_admin_id;
  END IF;
END $$;

-- 2. Cleanup old policies that might conflict (from archived fix_rls_logic.sql)
-- Drop old, insecure policies on providers
DROP POLICY IF EXISTS "Public providers are viewable by everyone." ON public.providers;
DROP POLICY IF EXISTS "Owners can manage their own provider." ON public.providers;

-- Drop old, insecure policies on gear_items
DROP POLICY IF EXISTS "Gear is publicly viewable." ON public.gear_items;
DROP POLICY IF EXISTS "Provider members can manage gear." ON public.gear_items;

-- Drop old, insecure policies on reservations
DROP POLICY IF EXISTS "Uživatelé vidí své rezervace." ON public.reservations;
DROP POLICY IF EXISTS "Uživatelé mohou vytvářet své rezervace." ON public.reservations;


-- 3. Ensure Profiles RLS is permissive enough for basic access
-- Re-apply 'profiles_select_self' just to be 100% sure
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Ensure Providers RLS allows Admin access (if missing)
-- This is a fallback in case Admins can't see Pending providers
DROP POLICY IF EXISTS "Admins can view all providers" ON public.providers;
CREATE POLICY "Admins can view all providers"
  ON public.providers
  FOR SELECT
  TO authenticated
  USING (public.is_admin_trusted());

COMMIT;
