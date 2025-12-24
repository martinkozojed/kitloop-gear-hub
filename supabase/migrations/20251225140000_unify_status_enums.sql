-- Migration: Unify Status Enums
-- Goal: Standardize on 'active' (for rented/out) and 'completed' (for returned).

BEGIN;

-- 1. Update Reservations
-- checked_out -> active
UPDATE public.reservations 
SET status = 'active' 
WHERE status = 'checked_out';

-- returned -> completed
UPDATE public.reservations 
SET status = 'completed' 
WHERE status = 'returned';

-- 2. Update Assets
-- rented -> active
UPDATE public.assets 
SET status = 'active'::asset_status_type 
WHERE status = 'rented'::asset_status_type;

-- 3. (Optional) Cleanup Enums if possible, strictly we can't delete enum values easily in Postgres 
-- without dropping usage, but we can leave them as legacy/unused for now to avoid downtime complexity.
-- Ideally we would: ALTER TYPE asset_status_type RENAME VALUE 'rented' TO 'active'; 
-- But 'active' might not exist or we want to merge.
-- If 'active' is not in the enum yet, we should add it.
-- Let's check if 'active' exists in asset_status_type. 
-- For safety, we'll try to add it if missing (using IF NOT EXISTS block logic is hard for enums in pure SQL without query).
-- However, typically `asset_status_type` was: available, rented, maintenance, etc.
-- If we want to rename 'rented' to 'active', `ALTER TYPE ... RENAME VALUE` is the best PostgreSQL way (Postgres 10+).

ALTER TYPE public.asset_status_type RENAME VALUE 'rented' TO 'active';

COMMIT;
