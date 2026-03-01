-- =============================================================================
-- PRODUKČNÍ ÚKLID SUPABASE (kitloop.cz) – POUZE DATA, ŽÁDNÉ ZMĚNY SCHÉMATU
-- =============================================================================
--
-- DŮLEŽITÉ:
-- 1. Před jakýmkoli mazáním VYTVOŘ ZÁLOHU (Dashboard → Backups, nebo pg_dump).
-- 2. Nejdřív spusť POUZE ČÁST A (dry-run) a zkontroluj výstup.
-- 3. Část B (DELETE) spouštěj až po zálohování a s vědomím, že jde o nevratnou akci.
-- 4. Ověř, že jsi v správném Supabase projektu (produkce pro kitloop.cz).
--
-- =============================================================================


-- ##############################################################################
-- ČÁST A: DRY-RUN (POUZE ČTENÍ) – spusť jako první a ulož si výstup
-- ##############################################################################

-- A1: Uživatelé odpovídající testovacím e-mailům (budoucí kandidáti na smazání)
--     Kontrola: demo@kitloop.cz, admin@kitloop.com, kitloop-admin@kitloop.cz, *@example.com
SELECT
  id AS user_id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email IN (
  'demo@kitloop.cz',
  'admin@kitloop.com',
  'kitloop-admin@kitloop.cz'
)
   OR email LIKE '%@example.com'
ORDER BY email;

-- A2: Počet takových uživatelů (mělo by odpovídat řádkům z A1)
SELECT COUNT(*) AS users_to_remove
FROM auth.users
WHERE email IN (
  'demo@kitloop.cz',
  'admin@kitloop.com',
  'kitloop-admin@kitloop.cz'
)
   OR email LIKE '%@example.com';

-- A3: Providery navázané na tyto uživatele (přes user_provider_memberships)
SELECT DISTINCT p.id AS provider_id, p.name, p.email, p.status
FROM public.providers p
JOIN public.user_provider_memberships m ON m.provider_id = p.id
JOIN auth.users u ON u.id = m.user_id
WHERE u.email IN (
  'demo@kitloop.cz',
  'admin@kitloop.com',
  'kitloop-admin@kitloop.cz'
)
   OR u.email LIKE '%@example.com'
ORDER BY p.email;

-- A4: Počty záznamů, které zmizí (pro uvedené providery a uživatele)
--     Spusť až po ověření, že A1–A3 dávají smysl.
WITH cleanup_users AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'demo@kitloop.cz',
    'admin@kitloop.com',
    'kitloop-admin@kitloop.cz'
  ) OR email LIKE '%@example.com'
),
cleanup_providers AS (
  SELECT DISTINCT p.id
  FROM public.providers p
  JOIN public.user_provider_memberships m ON m.provider_id = p.id
  WHERE m.user_id IN (SELECT id FROM cleanup_users)
)
SELECT
  (SELECT COUNT(*) FROM cleanup_users) AS users_count,
  (SELECT COUNT(*) FROM cleanup_providers) AS providers_count,
  (SELECT COUNT(*) FROM public.reservation_assignments ra
   JOIN public.reservations r ON r.id = ra.reservation_id
   WHERE r.provider_id IN (SELECT id FROM cleanup_providers)) AS reservation_assignments,
  (SELECT COUNT(*) FROM public.reservation_lines rl
   JOIN public.reservations r ON r.id = rl.reservation_id
   WHERE r.provider_id IN (SELECT id FROM cleanup_providers)) AS reservation_lines,
  (SELECT COUNT(*) FROM public.reservations WHERE provider_id IN (SELECT id FROM cleanup_providers)) AS reservations,
  (SELECT COUNT(*) FROM public.assets WHERE provider_id IN (SELECT id FROM cleanup_providers)) AS assets,
  (SELECT COUNT(*) FROM public.products WHERE provider_id IN (SELECT id FROM cleanup_providers)) AS products;


-- ##############################################################################
-- ČÁST B: MAZÁNÍ – NEVRATNÉ. Spouštěj JEN po zálohování a po kontrole části A.
-- ##############################################################################
--
-- Postup:
-- 1. Záloha (Dashboard nebo pg_dump).
-- 2. Pro první ověření nahraď na konci COMMIT; za ROLLBACK; a spusť celou transakci – nic se neuloží.
-- 3. Až budeš jistý, změň zpět na COMMIT; a spusť znovu.
--
-- Pořadí mazání respektuje cizí klíče (nejdřív závislé tabulky, nakonec auth.users).
--

/*
BEGIN;

-- Dočasné seznamy (nahraď konkrétními UUID z výstupu části A1 a A3, pokud chceš mazat jen vybrané)
-- Pro mazání podle e-mailů níže použijeme přímo podmínky, žádné temp tabulky s UUID.

-- 1) reservation_assignments (pro rezervace testovacích proviederů)
DELETE FROM public.reservation_assignments
WHERE reservation_id IN (
  SELECT id FROM public.reservations r
  JOIN public.user_provider_memberships m ON m.provider_id = r.provider_id
  JOIN auth.users u ON u.id = m.user_id
  WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
     OR u.email LIKE '%@example.com'
);

-- 2) reservation_lines
DELETE FROM public.reservation_lines
WHERE reservation_id IN (
  SELECT id FROM public.reservations r
  JOIN public.user_provider_memberships m ON m.provider_id = r.provider_id
  JOIN auth.users u ON u.id = m.user_id
  WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
     OR u.email LIKE '%@example.com'
);

-- 3) return_reports (pokud existují, pro tyto rezervace)
DELETE FROM public.return_reports
WHERE reservation_id IN (
  SELECT id FROM public.reservations r
  JOIN public.user_provider_memberships m ON m.provider_id = r.provider_id
  JOIN auth.users u ON u.id = m.user_id
  WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
     OR u.email LIKE '%@example.com'
);

-- 4) reservation_requests (žádosti přes request link – provider_id)
DELETE FROM public.reservation_requests
WHERE provider_id IN (
  SELECT DISTINCT p.id FROM public.providers p
  JOIN public.user_provider_memberships m ON m.provider_id = p.id
  JOIN auth.users u ON u.id = m.user_id
  WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
     OR u.email LIKE '%@example.com'
);

-- 5) reservations
DELETE FROM public.reservations
WHERE provider_id IN (
  SELECT DISTINCT p.id FROM public.providers p
  JOIN public.user_provider_memberships m ON m.provider_id = p.id
  JOIN auth.users u ON u.id = m.user_id
  WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
     OR u.email LIKE '%@example.com'
);

-- 6) assets
DELETE FROM public.assets
WHERE provider_id IN (
  SELECT DISTINCT p.id FROM public.providers p
  JOIN public.user_provider_memberships m ON m.provider_id = p.id
  JOIN auth.users u ON u.id = m.user_id
  WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
     OR u.email LIKE '%@example.com'
);

-- 7) product_variants (přes products)
DELETE FROM public.product_variants
WHERE product_id IN (
  SELECT id FROM public.products WHERE provider_id IN (
    SELECT DISTINCT p.id FROM public.providers p
    JOIN public.user_provider_memberships m ON m.provider_id = p.id
    JOIN auth.users u ON u.id = m.user_id
    WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
       OR u.email LIKE '%@example.com'
  )
);

-- 8) products
DELETE FROM public.products
WHERE provider_id IN (
  SELECT DISTINCT p.id FROM public.providers p
  JOIN public.user_provider_memberships m ON m.provider_id = p.id
  JOIN auth.users u ON u.id = m.user_id
  WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
     OR u.email LIKE '%@example.com'
);

-- 9) Další tabulky s provider_id / user_id (podle schématu)
-- notification_outbox, app_events, request_link_tokens, onboarding_progress, ...
DELETE FROM public.notification_outbox
WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz') OR email LIKE '%@example.com');

DELETE FROM public.app_events
WHERE provider_id IN (
  SELECT DISTINCT p.id FROM public.providers p
  JOIN public.user_provider_memberships m ON m.provider_id = p.id
  JOIN auth.users u ON u.id = m.user_id
  WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz') OR u.email LIKE '%@example.com')
   OR user_id IN (SELECT id FROM auth.users WHERE email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz') OR email LIKE '%@example.com');

DELETE FROM public.onboarding_progress
WHERE provider_id IN (
  SELECT DISTINCT p.id FROM public.providers p
  JOIN public.user_provider_memberships m ON m.provider_id = p.id
  JOIN auth.users u ON u.id = m.user_id
  WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz') OR u.email LIKE '%@example.com');

-- 10) providers (nejdřív providery navázané na test uživatele – dokud ještě existují memberships)
DELETE FROM public.providers
WHERE id IN (
  SELECT DISTINCT p.id FROM public.providers p
  JOIN public.user_provider_memberships m ON m.provider_id = p.id
  JOIN auth.users u ON u.id = m.user_id
  WHERE u.email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
     OR u.email LIKE '%@example.com'
);

-- 11) user_provider_memberships (odpojí test uživatele od zbylých proviederů)
DELETE FROM public.user_provider_memberships
WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz') OR email LIKE '%@example.com');

-- 11b) Zbylé providery s testovacím e-mailem (např. bez membership)
DELETE FROM public.providers
WHERE email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
   OR email LIKE '%@example.com';

-- 12) Auth uživatelé (CASCADE vyčistí profiles, auth.sessions, identities, user_roles)
-- V Supabase SQL Editoru máš přístup k auth.users.
DELETE FROM auth.users
WHERE email IN ('demo@kitloop.cz','admin@kitloop.com','kitloop-admin@kitloop.cz')
   OR email LIKE '%@example.com';

-- Nejdřív zkus ROLLBACK; až pak COMMIT;
ROLLBACK;
-- COMMIT;
*/
