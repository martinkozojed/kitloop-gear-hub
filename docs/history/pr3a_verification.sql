-- Verification SQL for PR3-A
-- Run these as postgres (superuser) to inspect, or simulate roles.
-- 1. Setup Test Data
-- Assume we have a user (UUID) and a provider (UUID).
-- Set auth.uid() to the user.
-- Example: Check Provider Status
-- SELECT id, status, verified FROM public.providers WHERE user_id = 'USER_UUID';
-- 2. Verify INSERT Gear Item (As Approved Provider)
-- SET request.jwt.claim.sub = 'USER_UUID';
-- SET ROLE authenticated;
-- INSERT INTO public.gear_items (name, provider_id) 
-- VALUES ('Test Item', 'PROVIDER_UUID'); 
-- Should SUCCEED if status='approved' and verified=true.
-- 3. Verify INSERT Gear Item (As Unapproved)
-- Update provider to status='pending'
-- INSERT ... 
-- Should FAIL (RLS violation).
-- 4. Verify Soft Delete
-- UPDATE public.gear_items SET deleted_at = NOW() WHERE id = 'ITEM_UUID';
-- Should SUCCEED.
-- SELECT * FROM public.gear_items WHERE id = 'ITEM_UUID';
-- Should return NOTHING (filtered by select policy deleted_at IS NULL).
-- 5. Verify Storage Policy (Simulation)
-- SET request.jwt.claim.sub = 'USER_UUID';
-- SET ROLE authenticated;
-- INSERT INTO storage.objects (bucket_id, name, owner, metadata)
-- VALUES ('gear-images', 'providers/PROVIDER_UUID/item1/test.jpg', 'USER_UUID', '{}');
-- Should SUCCEED if approved/verified.
-- Should FAIL if name is 'providers/OTHER_PROVIDER_UUID/...'
-- Check Policies
select *
from pg_policies
where tablename = 'gear_items';
select *
from pg_policies
where tablename = 'objects';