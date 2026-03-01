-- Migration: FINAL RLS CORE LOGIC FIX
-- Purpose: 
--   1. Deep cleanup of all redundant and recursive policies on providers/memberships.
--   2. Implement non-inlinable PLPGSQL SECURITY DEFINER functions to break recursion cycles.
--   3. Apply clean, strict, and unified policies that pass both stranger-visibility and recursion tests.
-- Author: Kitloop Team
-- Date: 2026-10-29 (Future-dated to ensure it is the last migration)
-- ============================================================================
BEGIN;
-------------------------------------------------------------------------------
-- 0. CLEANUP: Drop all existing policies using DO blocks for certainty
-------------------------------------------------------------------------------
DO $$
DECLARE pol record;
BEGIN FOR pol IN
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'providers' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.providers';
END LOOP;
FOR pol IN
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'user_provider_memberships' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.user_provider_memberships';
END LOOP;
FOR pol IN
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'provider_members' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.provider_members';
END LOOP;
END $$;
-------------------------------------------------------------------------------
-- 1. SAFE FUNCTIONS (SECURITY DEFINER + PLPGSQL to prevent inlining/recursion)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_is_member_safe(p_provider_id uuid, p_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public STABLE AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM public.user_provider_memberships
        WHERE provider_id = p_provider_id
            AND user_id = p_user_id
    );
END;
$$;
CREATE OR REPLACE FUNCTION public.check_is_pending_member_safe(p_provider_id uuid, p_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public STABLE AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM public.provider_members
        WHERE provider_id = p_provider_id
            AND user_id = p_user_id
    );
END;
$$;
CREATE OR REPLACE FUNCTION public.check_is_owner_safe(p_provider_id uuid, p_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public STABLE AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM public.providers
        WHERE id = p_provider_id
            AND user_id = p_user_id
    );
END;
$$;
-------------------------------------------------------------------------------
-- 2. PROVIDERS POLICIES
-------------------------------------------------------------------------------
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers FORCE ROW LEVEL SECURITY;
-- Unified Read: Owner, Member, Pending Member, or Public (Strict)
CREATE POLICY "provider_select_unified" ON public.providers FOR
SELECT USING (
        auth.uid() = user_id
        OR public.check_is_member_safe(id, auth.uid())
        OR public.check_is_pending_member_safe(id, auth.uid())
        OR (
            verified = true
            AND approved_at IS NOT NULL
            AND status = 'approved'
            AND deleted_at IS NULL
        )
    );
-- Manage: Owner only
CREATE POLICY "provider_owner_manage" ON public.providers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-------------------------------------------------------------------------------
-- 3. USER_PROVIDER_MEMBERSHIPS POLICIES
-------------------------------------------------------------------------------
ALTER TABLE public.user_provider_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_provider_memberships FORCE ROW LEVEL SECURITY;
-- Read: Self or Provider Owner
CREATE POLICY "upm_select" ON public.user_provider_memberships FOR
SELECT USING (
        user_id = auth.uid()
        OR public.check_is_owner_safe(provider_id, auth.uid())
    );
-- Write: Provider Owner only
CREATE POLICY "upm_write_owner" ON public.user_provider_memberships FOR ALL TO authenticated USING (
    public.check_is_owner_safe(provider_id, auth.uid())
) WITH CHECK (
    public.check_is_owner_safe(provider_id, auth.uid())
);
-------------------------------------------------------------------------------
-- 4. PROVIDER_MEMBERS POLICIES (Pending invites)
-------------------------------------------------------------------------------
ALTER TABLE public.provider_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_members FORCE ROW LEVEL SECURITY;
-- Read: Self or Provider Owner
CREATE POLICY "pm_select" ON public.provider_members FOR
SELECT USING (
        user_id = auth.uid()
        OR public.check_is_owner_safe(provider_id, auth.uid())
    );
-- Manage: Provider Owner only
CREATE POLICY "pm_manage_owner" ON public.provider_members FOR ALL USING (
    public.check_is_owner_safe(provider_id, auth.uid())
) WITH CHECK (
    public.check_is_owner_safe(provider_id, auth.uid())
);
COMMIT;