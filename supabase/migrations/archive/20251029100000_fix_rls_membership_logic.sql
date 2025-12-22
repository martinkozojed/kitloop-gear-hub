-- =============================================================================
-- KITLOOP RLS HOTFIX - SECURE MEMBERSHIP INSERTS
-- =============================================================================
-- Version: 3.1
-- Date: 2025-10-29
-- Author: Gemini Agent
--
-- JIRA: P3-AUDIT-RLS
--
-- PROBLEM:
-- The existing "membership_insert_own" policy was too permissive. It allowed
-- any authenticated user to insert a membership for themselves into ANY
-- provider, leading to a privilege escalation vulnerability.
--
-- SOLUTION:
-- This migration replaces the insecure policy with a stricter one. The new
-- "membership_insert_by_owner" policy ensures that only the actual owner
-- of a provider (as defined by `providers.user_id`) can insert new
-- memberships for that provider. This closes the security hole.
-- =============================================================================

BEGIN;

-- STEP 1: Drop the insecure policy that allows any user to add themselves
-- to any provider team.
DROP POLICY IF EXISTS "membership_insert_own" ON public.user_provider_memberships;

-- STEP 2: Create a new, secure policy.
-- This policy allows a provider's owner to add members to their team.
-- It checks that the currently authenticated user is the owner of the provider
-- for which a membership is being inserted.
-- This also safely covers the `ensureProviderMembership` use case, as the user
-- creating their own initial membership is also the provider's owner.
CREATE POLICY "membership_insert_by_owner"
  ON public.user_provider_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id -- The provider we are adding a member to
        AND pr.user_id = auth.uid() -- The current user must be the owner of that provider
    )
  );

COMMIT;
