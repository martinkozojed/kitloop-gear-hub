-- Lock down profile privilege fields and harden admin trust path
-- Scope:
-- 1) Prevent self-updates of role/is_admin/is_verified
-- 2) Introduce trusted admin check backed by user_roles
-- 3) Reset self-promoted admins not present in user_roles(admin)

BEGIN;

-- 1) Helper: trusted admin resolver (non-recursive, not user-mutable)
CREATE OR REPLACE FUNCTION public.is_admin_trusted()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_trusted() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_trusted() TO authenticated, service_role;

-- 2) Audit table for any resets we perform
CREATE TABLE IF NOT EXISTS public.security_profile_resets (
  user_id uuid PRIMARY KEY,
  old_role text,
  old_is_admin boolean,
  old_is_verified boolean,
  reset_at timestamptz DEFAULT now()
);

-- 3) Capture and reset self-promoted admins not in trusted allowlist (user_roles.admin)
INSERT INTO public.security_profile_resets (user_id, old_role, old_is_admin, old_is_verified)
SELECT p.user_id, p.role, p.is_admin, p.is_verified
FROM public.profiles p
WHERE (p.role = 'admin' OR p.is_admin = true)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role = 'admin'
  )
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.profiles p
SET role = 'customer',
    is_admin = false
WHERE p.user_id IN (SELECT user_id FROM public.security_profile_resets);

-- 4) Harden profiles RLS
-- Drop legacy policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_owner" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- Ensure RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Read: self
CREATE POLICY "profiles_select_self"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Read: trusted admin
CREATE POLICY "profiles_select_admin_trusted"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin_trusted());

-- Update: self, but cannot change privileged fields
CREATE POLICY "profiles_update_self_nonprivileged"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT role FROM public.profiles p WHERE p.user_id = auth.uid())
    AND COALESCE(is_admin, false) = COALESCE((SELECT is_admin FROM public.profiles p WHERE p.user_id = auth.uid()), false)
    AND COALESCE(is_verified, false) = COALESCE((SELECT is_verified FROM public.profiles p WHERE p.user_id = auth.uid()), false)
  );

-- Update: trusted admin can manage all fields
CREATE POLICY "profiles_update_admin_trusted"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_trusted())
  WITH CHECK (public.is_admin_trusted());

COMMIT;
