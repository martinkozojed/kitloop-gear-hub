-- =============================================================================
-- KITLOOP RLS HOTFIX - TIGHTEN PROVIDER MEMBERSHIP LOGIC
-- =============================================================================
-- Context:
--   - The `is_provider_member` function contained legacy logic that checked
--     the original `providers.user_id` column, granting unintended
--     permissions.
--   - This breaks the new, stricter membership model where all access should
--     be managed exclusively via the `user_provider_memberships` table.
--   - This migration removes the legacy check, ensuring RLS policies for gear
--     and reservations are correctly enforced.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_provider_member(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_provider_memberships m
    WHERE m.provider_id = pid
      AND m.user_id = auth.uid()
  );
$$;

COMMIT;
