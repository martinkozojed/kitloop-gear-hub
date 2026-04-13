-- Migration: RBAC Implementation (Provider Members)
-- Goal: Standardize membership table and introduce non-recursive role lookup.

BEGIN;

-- 1. Create new `provider_members` table
CREATE TABLE IF NOT EXISTS public.provider_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL CHECK (role IN ('owner', 'staff', 'viewer')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(provider_id, user_id)
);

-- Enable RLS on the new table
ALTER TABLE public.provider_members ENABLE ROW LEVEL SECURITY;

-- 2. Migrate data from old `user_provider_memberships` if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_provider_memberships') THEN
        INSERT INTO public.provider_members (provider_id, user_id, role, created_at)
        SELECT provider_id, user_id, role, created_at 
        FROM public.user_provider_memberships
        ON CONFLICT (provider_id, user_id) DO NOTHING;
    END IF;
END $$;

-- 3. Secure Role Lookup Function (Anti-Recursion)
-- SECURITY DEFINER: Runs with privileges of the creator (postgres/admin), bypassing RLS on `provider_members`
-- This allows us to use this function INSIDE policies of other tables without causing infinite loops.
CREATE OR REPLACE FUNCTION public.get_my_role(limit_provider_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    role_text text;
BEGIN
    SELECT role INTO role_text
    FROM public.provider_members
    WHERE user_id = auth.uid()
      AND provider_id = limit_provider_id;
      
    RETURN role_text; -- Returns 'owner', 'staff', 'viewer', or NULL
END;
$$;

-- 4. RLS for `provider_members` itself
-- Only owners can manage members.
-- Members can view themselves.
CREATE POLICY "Members see own membership"
  ON public.provider_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners manage members"
  ON public.provider_members FOR ALL TO authenticated
  USING (
    EXISTS (
        SELECT 1 FROM public.provider_members pm
        WHERE pm.provider_id = provider_members.provider_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
    )
  );

-- 5. Update Reservations Policy (Proof of Value)
-- Drop conflicting policies first
DROP POLICY IF EXISTS "reservation_all_provider_member" ON public.reservations;
DROP POLICY IF EXISTS "Providers can view own reservations by provider_id" ON public.reservations;
DROP POLICY IF EXISTS "Providers can view their gear reservations" ON public.reservations;

-- New Unified Policy using `get_my_role`
CREATE POLICY "rbac_reservation_all"
  ON public.reservations
  FOR ALL TO authenticated
  USING (
      -- Admin
      (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
      OR
      -- Provider Member (Any Role can read/write reservations for now, strictness comes later)
      public.get_my_role(provider_id) IS NOT NULL
  );

-- 6. Cleanup (Optional: Drop old table if verified)
-- DROP TABLE IF EXISTS public.user_provider_memberships; 
-- Keeping it for safety for now.

COMMIT;
