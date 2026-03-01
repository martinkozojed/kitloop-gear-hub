-- Migration: Fix Onboarding RLS
-- Purpose: Allow provider owners (not just invited members) to access onboarding_progress
-- Author: Kitloop Team
-- Date: 2026-03-01
-- ============================================================================
BEGIN;
DROP POLICY IF EXISTS "provider_members_manage_own_progress" ON public.onboarding_progress;
CREATE POLICY "provider_members_manage_own_progress" ON public.onboarding_progress FOR ALL USING (
    provider_id IN (
        SELECT pm.provider_id
        FROM provider_members pm
        WHERE pm.user_id = auth.uid()
    )
    OR provider_id IN (
        SELECT p.id
        FROM providers p
        WHERE p.user_id = auth.uid()
    )
) WITH CHECK (
    provider_id IN (
        SELECT pm.provider_id
        FROM provider_members pm
        WHERE pm.user_id = auth.uid()
    )
    OR provider_id IN (
        SELECT p.id
        FROM providers p
        WHERE p.user_id = auth.uid()
    )
);
COMMIT;