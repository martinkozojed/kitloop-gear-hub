
-- Migration: Fix infinite recursion in provider_members RLS

-- Drop the recursive policy
DROP POLICY IF EXISTS "Owners manage members" ON "public"."provider_members";

-- Recreate policy using direct check on providers table (single-owner model)
-- OR if multi-owner via members is needed, we must ensure avoiding recursion.
-- But standard Kitloop seems to have one main owner in providers.user_id.

-- Let's enable:
-- 1. User sees their own membership (existing policy "Members see own membership")
-- 2. "Provider Owner" (providers.user_id) can manage members.

CREATE POLICY "Owners manage members" ON "public"."provider_members"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Check if auth user is the Owner of the provider
  EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = provider_members.provider_id
    AND p.user_id = auth.uid()
  )
);
