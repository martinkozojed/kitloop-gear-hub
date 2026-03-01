-- Migration: Cleanup RPC Overloads
-- Date: 2026-02-28
-- Goal: Remove legacy function signatures for issue_reservation and process_return to prevent ambiguity and potential security bypasses.
BEGIN;
-- 1. DROP ALL KNOWN LEGACY OVERLOADS
-- issue_reservation
DROP FUNCTION IF EXISTS public.issue_reservation(uuid, uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.issue_reservation(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.issue_reservation(uuid, uuid);
-- process_return
DROP FUNCTION IF EXISTS public.process_return(uuid, uuid, uuid, jsonb, text [], text);
DROP FUNCTION IF EXISTS public.process_return(uuid, uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.process_return(uuid, uuid, uuid);
-- 2. RE-GRANT LATEST SIGNATURES (Defensive)
-- These should already exist and be correctly defined from previous migrations,
-- but we ensure they have the correct permissions.
GRANT EXECUTE ON FUNCTION public.issue_reservation(uuid, uuid, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_return(uuid, boolean, text) TO authenticated;
COMMIT;