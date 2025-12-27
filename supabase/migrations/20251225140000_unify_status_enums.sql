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
-- 'rented' does not exist in the new schema (it is 'active'), and 'active' already exists.
-- So we do NOT need to update or rename anything for assets in a fresh install.
-- The previous code failed because 'rented' was not in asset_status_type.

COMMIT;
