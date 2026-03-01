-- Migration: Clean up duplicate provider RLS policies
-- Purpose: Remove conflicting SELECT policies that break visibility for new onboarded providers
-- Author: Kitloop Team
-- Date: 2026-03-01
-- ============================================================================

BEGIN;

-- Drop all the old confusing duplicate SELECT policies
DROP POLICY IF EXISTS "Allow provider owner to SELECT their data" ON public.providers;
DROP POLICY IF EXISTS "Providers: Read own record" ON public.providers;
DROP POLICY IF EXISTS "provider_select_owner" ON public.providers;
DROP POLICY IF EXISTS "providers_owner_select" ON public.providers;

DROP POLICY IF EXISTS "provider_select_member" ON public.providers;

-- Create one unified clear policy for reading a provider
CREATE POLICY "provider_read_access" ON public.providers FOR SELECT USING (
    -- 1. Owner can always read
    auth.uid() = user_id
    OR
    -- 2. Members can read
    EXISTS (
        SELECT 1 FROM public.user_provider_memberships m
        WHERE m.provider_id = providers.id AND m.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.provider_members pm
        WHERE pm.provider_id = providers.id AND pm.user_id = auth.uid()
    )
    OR
    -- 3. Public can read if verified and not deleted
    (verified = true AND approved_at IS NOT NULL AND status = 'approved' AND deleted_at IS NULL)
);

COMMIT;
