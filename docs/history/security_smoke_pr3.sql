-- PR#3 security smoke tests (run as indicated)
-- Adjust placeholder IDs before running.

-- Prereqs:
--   SET ROLE or use appropriate JWT (non-admin/non-member vs member/service).

-- Inputs
\set my_provider '00000000-0000-0000-0000-000000000000'      -- provider you are a member/owner of
\set other_provider '11111111-1111-1111-1111-111111111111'   -- provider you are NOT a member of
\set my_reservation '22222222-2222-2222-2222-222222222222'   -- reservation belonging to my_provider
\set other_reservation '33333333-3333-3333-3333-333333333333' -- reservation belonging to other_provider
\set my_customer_reservation '44444444-4444-4444-4444-444444444444' -- reservation where auth.uid() is customer
\set other_customer_reservation '55555555-5555-5555-5555-555555555555' -- reservation for another customer
\set my_user '66666666-6666-6666-6666-666666666666'
\set other_user '77777777-7777-7777-7777-777777777777'

-- A) Cross-tenant provider_id update should fail (run as member of my_provider, not admin)
UPDATE public.reservations
SET provider_id = :'other_provider'
WHERE id = :'my_reservation';
-- Expect: RLS/permission denied

-- B) provider_members immutability (non-admin)
INSERT INTO public.provider_members (provider_id, user_id, role) VALUES (:'other_provider', :'my_user', 'staff');
UPDATE public.provider_members SET role = 'owner' WHERE provider_id = :'other_provider' AND user_id = :'my_user';
DELETE FROM public.provider_members WHERE provider_id = :'other_provider' AND user_id = :'my_user';
-- Expect: RLS/permission denied on all

-- C) assignments_customer_read isolation
SELECT * FROM public.reservation_assignments ra
JOIN public.reservations r ON ra.reservation_id = r.id
WHERE r.id = :'other_customer_reservation';
-- Expect: empty/permission denied when auth.uid() != r.user_id

-- D) return_reports insert check
INSERT INTO public.return_reports (reservation_id, provider_id, created_by, damage_reports, notes)
VALUES (:'other_reservation', :'other_provider', :'my_user', '[]'::jsonb, 'should fail');
-- Expect: RLS/permission denied for non-member

-- Repeat D as member of my_provider (or admin/service) to confirm success:
INSERT INTO public.return_reports (reservation_id, provider_id, created_by, damage_reports, notes)
VALUES (:'my_reservation', :'my_provider', :'my_user', '[]'::jsonb, 'should succeed');
-- Expect: insert OK

-- Storage: damage-photos manual checks (run via HTTP/storage client)
-- 1) List other provider prefix (should fail):
-- curl -H "Authorization: Bearer <user_jwt>" \
--   "https://<project>.supabase.co/storage/v1/object/list/damage-photos?prefix=:other_provider/"
--
-- 2) Delete other provider object (should fail):
-- curl -X DELETE -H "Authorization: Bearer <user_jwt>" \
--   "https://<project>.supabase.co/storage/v1/object/damage-photos/:other_provider/path/to/file.jpg"
--
-- 3) Prefix collision attempt (<uuid>X/) should fail:
-- curl -H "Authorization: Bearer <user_jwt>" \
--   "https://<project>.supabase.co/storage/v1/object/list/damage-photos?prefix=:other_providerX/"
--
-- 4) As member of :my_provider, list/delete under :my_provider/ should succeed.

