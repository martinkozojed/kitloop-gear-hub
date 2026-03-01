-- =============================================================================
-- ÚPLNÝ RESET VŠECH DAT V SUPABASE (SQL Editor)
-- =============================================================================
-- Spusť v Supabase Dashboard → SQL Editor. Smaže VŠECHNY uživatele a jejich data.
-- Schéma (tabulky, RLS, funkce) zůstane. Po běhu bude DB prázdná.
--
-- Doporučení: nejdřív spusť s ROLLBACK; na konci (ověříš, že to proběhne).
-- Pak změň na COMMIT; a spusť znovu.
-- =============================================================================

BEGIN;

-- 1) Rezervace a závislé tabulky (deliveries před outbox – FK na outbox)
DELETE FROM public.reservation_assignments;
DELETE FROM public.reservation_lines;
DELETE FROM public.return_reports;
DELETE FROM public.notification_deliveries;
DELETE FROM public.notification_outbox;
DELETE FROM public.reservation_requests;
DELETE FROM public.reservations;

-- 2) Assety a produkty
DELETE FROM public.assets;
DELETE FROM public.product_variants;
DELETE FROM public.products;

-- 3) Ostatní tabulky závislé na providerech / uživatelích
DELETE FROM public.app_events;
DELETE FROM public.feedback;
DELETE FROM public.onboarding_progress;
DELETE FROM public.notification_preferences;
DELETE FROM public.user_provider_memberships;
DELETE FROM public.providers;

-- 4) Audit / admin (odkazují na auth.users)
DELETE FROM public.admin_audit_logs;
DELETE FROM public.admin_rate_limits;
DELETE FROM public.audit_logs;

-- 5) Auth – smazání všech uživatelů (CASCADE smaže profiles, user_roles, sessions, identities)
DELETE FROM auth.users;

-- Nejdřív zkus ROLLBACK (nic se neuloží). Až budeš chtít opravdu smazat, změň na COMMIT a spusť znovu.
ROLLBACK;
-- COMMIT;
