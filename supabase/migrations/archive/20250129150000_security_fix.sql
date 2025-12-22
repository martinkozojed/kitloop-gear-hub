-- ============================================================================
-- SECURITY FIX: AUTH TRIGGER + MEMBERSHIP-BASED RLS (V3)
-- ============================================================================
-- - Opravuje funkci handle_new_user tak, aby zapisovala do public.profiles.
-- - Zavádí helper funkce is_admin a is_provider_member.
-- - Čistí všechny existující RLS policy na klíčových tabulkách a nastavuje
--   je na nový model: členové poskytovatele (nebo admin) mají plná práva,
--   veřejnost jen omezené čtení ověřených dat.
-- ============================================================================

-- ============================================================================
-- 1) AUTH TRIGGER: PUBLIC.PROFILES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    timezone('utc', now())
  )
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2) HELPER FUNKCE PRO RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_provider_member(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
      SELECT 1
    FROM public.user_provider_memberships m
    WHERE m.provider_id = pid
      AND m.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.providers pr
    WHERE pr.id = pid
      AND pr.user_id = auth.uid()
  );
$$;

-- Explicitni kontrola pro UPDATE rezervaci, aby se neautorizovane pokusy
-- nepropadly jen na tiche \"0 rows updated\".
CREATE OR REPLACE FUNCTION public.assert_reservation_update(provider_id uuid, reservation_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_provider_member(provider_id)
     OR reservation_user_id = auth.uid()
     OR public.is_admin() THEN
    RETURN true;
  END IF;

  RAISE EXCEPTION 'permission denied for reservation update' USING ERRCODE = '42501';
END;
$$;

-- ============================================================================
-- 3) SMAZÁNÍ STÁVAJÍCÍCH RLS POLICIES
-- ============================================================================

DO $$
DECLARE pol record;
BEGIN
  -- providers
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'providers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.providers', pol.policyname);
  END LOOP;

  -- gear_items
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gear_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.gear_items', pol.policyname);
  END LOOP;

  -- reservations
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reservations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reservations', pol.policyname);
  END LOOP;

  -- user_provider_memberships
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_provider_memberships'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_provider_memberships', pol.policyname);
  END LOOP;
END;
$$;

-- ============================================================================
-- 4) NOVÉ RLS POLICIES
-- ============================================================================

-- PROVIDERS ------------------------------------------------------------------

CREATE POLICY "Providers select visibility"
  ON public.providers
  FOR SELECT
  TO public
  USING (
    verified = true
    OR public.is_provider_member(id)
    OR public.is_admin()
  );

CREATE POLICY "Providers insert ownership"
  ON public.providers
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin()
  );

CREATE POLICY "Providers update ownership"
  ON public.providers
  FOR UPDATE
  TO public
  USING (
    public.is_provider_member(id)
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_provider_member(id)
    OR public.is_admin()
  );

CREATE POLICY "Providers delete ownership"
  ON public.providers
  FOR DELETE
  TO public
  USING (
    public.is_provider_member(id)
    OR public.is_admin()
  );

-- GEAR ITEMS -----------------------------------------------------------------

-- Veřejné čtení jen ověřených a aktivních položek, členové/admin vidí vše.
CREATE POLICY "Gear items public read verified"
  ON public.gear_items
  FOR SELECT
  TO public
  USING (
    (
      active = true
      AND EXISTS (
        SELECT 1 FROM public.providers p
        WHERE p.id = provider_id
          AND p.verified = true
      )
    )
    OR public.is_provider_member(provider_id)
    OR public.is_admin()
  );

CREATE POLICY "Gear items member manage"
  ON public.gear_items
  FOR ALL
  TO public
  USING (
    public.is_provider_member(provider_id)
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_provider_member(provider_id)
    OR public.is_admin()
  );

-- RESERVATIONS ---------------------------------------------------------------

-- Členové poskytovatele / admin mohou číst všechny rezervace.
CREATE POLICY "Reservations provider members read"
  ON public.reservations
  FOR SELECT
  TO public
  USING (
    public.is_provider_member(provider_id)
    OR public.is_admin()
  );

-- Členové poskytovatele / admin mohou vytvářet rezervace.
CREATE POLICY "Reservations provider members insert"
  ON public.reservations
  FOR INSERT
  TO public
  WITH CHECK (
    public.is_provider_member(provider_id)
    OR public.is_admin()
  );

-- Členové poskytovatele / admin mohou mazat rezervace.
CREATE POLICY "Reservations provider members delete"
  ON public.reservations
  FOR DELETE
  TO public
  USING (
    public.is_provider_member(provider_id)
    OR public.is_admin()
  );

-- Zákazník: čtení vlastních rezervací.
CREATE POLICY "Reservations customers read own"
  ON public.reservations
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

-- Zákazník: vytvořit / upravit / smazat vlastní rezervace.
CREATE POLICY "Reservations customers insert own"
  ON public.reservations
  FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Reservations customers delete own"
  ON public.reservations
  FOR DELETE
  TO public
  USING (user_id = auth.uid());

-- Update hlidany guard funkci, aby se zakazany pokus spustil s chybou.
CREATE POLICY "Reservations update guard"
  ON public.reservations
  FOR UPDATE
  TO public
  USING (public.assert_reservation_update(provider_id, user_id))
  WITH CHECK (public.assert_reservation_update(provider_id, user_id));

-- USER_PROVIDER_MEMBERSHIPS --------------------------------------------------

CREATE POLICY "Memberships select self or admin"
  ON public.user_provider_memberships
  FOR SELECT
  TO public
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Memberships insert self or admin"
  ON public.user_provider_memberships
  FOR INSERT
  TO public
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Memberships update self or admin"
  ON public.user_provider_memberships
  FOR UPDATE
  TO public
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Memberships delete self or admin"
  ON public.user_provider_memberships
  FOR DELETE
  TO public
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- ============================================================================
-- KONEC MIGRACE
-- ============================================================================
