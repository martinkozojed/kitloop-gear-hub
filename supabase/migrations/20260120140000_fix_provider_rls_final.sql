-- Fix Provider RLS Policies (Final)

BEGIN;

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- 1. Admin Access: View ALL
DROP POLICY IF EXISTS "Admins can view all providers" ON public.providers;
CREATE POLICY "Admins can view all providers"
ON public.providers
FOR SELECT
TO authenticated
USING (
  public.is_admin_trusted()
);

-- 2. Public Access: View APPROVED only
DROP POLICY IF EXISTS "Public providers are viewable by everyone." ON public.providers;
DROP POLICY IF EXISTS "Public can view approved providers" ON public.providers;
CREATE POLICY "Public can view approved providers"
ON public.providers
FOR SELECT
TO authenticated, anon
USING (
  status = 'approved' AND verified = true
);

-- 3. Owner Access: View OWN (even if pending)
DROP POLICY IF EXISTS "Owners can view their own provider" ON public.providers;
CREATE POLICY "Owners can view their own provider"
ON public.providers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

COMMIT;
