-- =============================================================================
-- KITLOOP - SQUASHED RLS MIGRATION
-- =============================================================================
-- Version: 5.0
-- Date: 2025-11-10
-- Author: Gemini Agent
--
-- This migration squashes all RLS-related migrations from
-- 20250124000002_rls_architecture_v3_recursion_free.sql onwards.
-- It is intended to be a single, authoritative migration that sets up
-- the entire RLS system correctly.
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: DROP ALL EXISTING RLS POLICIES
-- =============================================================================

-- Drop membership policies
DROP POLICY IF EXISTS "Users can view own memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Provider owners can manage memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins and owners can insert memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins and owners can update memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Admins and owners can delete memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Users can insert own memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Users can update own memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "Users can delete own memberships" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_select_own" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_select_admin" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_insert_own" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_insert_admin" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_update_own" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_update_admin" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_delete_own" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_delete_admin" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_delete_provider_owner" ON public.user_provider_memberships;
DROP POLICY IF EXISTS "membership_insert_by_owner" ON public.user_provider_memberships;


-- Drop provider policies
DROP POLICY IF EXISTS "Anyone can view verified providers" ON public.providers;
DROP POLICY IF EXISTS "Providers can update own data" ON public.providers;
DROP POLICY IF EXISTS "Providers can insert own data" ON public.providers;
DROP POLICY IF EXISTS "Providers select visibility" ON public.providers;
DROP POLICY IF EXISTS "Providers insert ownership" ON public.providers;
DROP POLICY IF EXISTS "Providers update ownership" ON public.providers;
DROP POLICY IF EXISTS "Providers delete ownership" ON public.providers;
DROP POLICY IF EXISTS "Public providers are viewable by everyone." ON public.providers;
DROP POLICY IF EXISTS "Owners can manage their own provider." ON public.providers;
DROP POLICY IF EXISTS "provider_select_public" ON public.providers;
DROP POLICY IF EXISTS "provider_select_owner" ON public.providers;
DROP POLICY IF EXISTS "provider_select_member" ON public.providers;
DROP POLICY IF EXISTS "provider_select_admin" ON public.providers;
DROP POLICY IF EXISTS "provider_insert_owner" ON public.providers;
DROP POLICY IF EXISTS "provider_insert_admin" ON public.providers;
DROP POLICY IF EXISTS "provider_update_owner" ON public.providers;
DROP POLICY IF EXISTS "provider_update_member_owner" ON public.providers;
DROP POLICY IF EXISTS "provider_update_admin" ON public.providers;
DROP POLICY IF EXISTS "provider_delete_owner" ON public.providers;
DROP POLICY IF EXISTS "provider_delete_admin" ON public.providers;


-- Drop gear policies
DROP POLICY IF EXISTS "Anyone can view active gear" ON public.gear_items;
DROP POLICY IF EXISTS "Providers can manage own gear" ON public.gear_items;
DROP POLICY IF EXISTS "Public can view verified gear" ON public.gear_items;
DROP POLICY IF EXISTS "Provider members manage gear" ON public.gear_items;
DROP POLICY IF EXISTS "Gear is publicly viewable." ON public.gear_items;
DROP POLICY IF EXISTS "gear_select_public" ON public.gear_items;
DROP POLICY IF EXISTS "gear_all_provider_member" ON public.gear_items;
DROP POLICY IF EXISTS "gear_all_admin" ON public.gear_items;


-- Drop reservation policies
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can view their gear reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can view own reservations by provider_id" ON public.reservations;
DROP POLICY IF EXISTS "Providers can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can update own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Providers can manage own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Provider members manage reservations" ON public.reservations;
DROP POLICY IF EXISTS "Uživatelé vidí své rezervace." ON public.reservations;
DROP POLICY IF EXISTS "Uživatelé mohou vytvářet své rezervace." ON public.reservations;
DROP POLICY IF EXISTS "reservation_select_customer" ON public.reservations;
DROP POLICY IF EXISTS "reservation_all_provider_member" ON public.reservations;
DROP POLICY IF EXISTS "reservation_all_admin" ON public.reservations;


-- =============================================================================
-- STEP 2: RECREATE OR KEEP HELPER FUNCTIONS
-- =============================================================================

-- Keep is_admin() - it's safe (only queries profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  );
$$;

-- Keep is_provider_member() for compatibility with application code.
-- It returns true for provider owners or members.
CREATE OR REPLACE FUNCTION public.is_provider_member(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.providers p
    WHERE p.id = pid
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_provider_memberships m
    WHERE m.provider_id = pid
      AND m.user_id = auth.uid()
  );
$$;

-- =============================================================================
-- STEP 3: USER_PROVIDER_MEMBERSHIPS POLICIES (Layer 2 - Foundation)
-- =============================================================================

-- SELECT: Users can view their own memberships
CREATE POLICY "membership_select_own"
  ON public.user_provider_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- SELECT: Admins can view all memberships
CREATE POLICY "membership_select_admin"
  ON public.user_provider_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- INSERT: Admins can insert any membership
CREATE POLICY "membership_insert_admin"
  ON public.user_provider_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- UPDATE: Users can update their own memberships
CREATE POLICY "membership_update_own"
  ON public.user_provider_memberships
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Admins can update any membership
CREATE POLICY "membership_update_admin"
  ON public.user_provider_memberships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- DELETE: Users can delete their own memberships (leave team)
CREATE POLICY "membership_delete_own"
  ON public.user_provider_memberships
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- DELETE: Admins can delete any membership
CREATE POLICY "membership_delete_admin"
  ON public.user_provider_memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- DELETE: Provider owners can remove members from their providers
CREATE POLICY "membership_delete_provider_owner"
  ON public.user_provider_memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
  );

-- SECURE INSERT by owner
CREATE POLICY "membership_insert_by_owner"
  ON public.user_provider_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id -- The provider we are adding a member to
        AND pr.user_id = auth.uid() -- The current user must be the owner of that provider
    )
  );

-- =============================================================================
-- STEP 4: PROVIDERS POLICIES (Layer 3 - Can query memberships safely)
-- =============================================================================

-- SELECT: Public can view verified providers
CREATE POLICY "provider_select_public"
  ON public.providers
  FOR SELECT
  USING (verified = true);

-- SELECT: Owners can view their own providers (verified or not)
CREATE POLICY "provider_select_owner"
  ON public.providers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT: Team members can view their provider (verified or not)
CREATE POLICY "provider_select_member"
  ON public.providers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = id
        AND m.user_id = auth.uid()
    )
  );

-- SELECT: Admins can view all providers
CREATE POLICY "provider_select_admin"
  ON public.providers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- INSERT: Users can insert providers where they are the owner
CREATE POLICY "provider_insert_owner"
  ON public.providers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- INSERT: Admins can insert any provider
CREATE POLICY "provider_insert_admin"
  ON public.providers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- UPDATE: Owners can update their own providers
CREATE POLICY "provider_update_owner"
  ON public.providers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Team members with 'owner' role can update provider
CREATE POLICY "provider_update_member_owner"
  ON public.providers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- UPDATE: Admins can update any provider
CREATE POLICY "provider_update_admin"
  ON public.providers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- DELETE: Only owners and admins can delete providers
CREATE POLICY "provider_delete_owner"
  ON public.providers
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "provider_delete_admin"
  ON public.providers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- =============================================================================
-- STEP 5: GEAR_ITEMS POLICIES (Layer 4 - Can query providers safely)
-- =============================================================================

-- SELECT: Public can view active gear from verified providers
CREATE POLICY "gear_select_public"
  ON public.gear_items
  FOR SELECT
  USING (
    active = true
    AND EXISTS (
      SELECT 1
      FROM public.providers p
      WHERE p.id = provider_id
        AND p.verified = true
    )
  );

-- SELECT: Provider owners and members can view their gear
CREATE POLICY "gear_select_provider_member"
  ON public.gear_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  );

-- INSERT: Provider owners and members can insert their gear
CREATE POLICY "gear_insert_provider_member"
  ON public.gear_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  );

-- UPDATE: Provider owners and members can update their gear
CREATE POLICY "gear_update_provider_member"
  ON public.gear_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  );

-- DELETE: Provider owners and members can delete their gear
CREATE POLICY "gear_delete_provider_member"
  ON public.gear_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  );

-- ALL: Admins can manage all gear
CREATE POLICY "gear_all_admin"
  ON public.gear_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- =============================================================================
-- STEP 6: RESERVATIONS POLICIES (Layer 4 - Can query providers safely)
-- =============================================================================

-- SELECT: Customers can view their own reservations
CREATE POLICY "reservation_select_customer"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ALL: Provider members can manage reservations for their providers
CREATE POLICY "reservation_all_provider_member"
  ON public.reservations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.providers pr
      WHERE pr.id = provider_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_provider_memberships m
      WHERE m.provider_id = provider_id
        AND m.user_id = auth.uid()
    )
  );

-- ALL: Admins can manage all reservations
CREATE POLICY "reservation_all_admin"
  ON public.reservations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- =============================================================================
-- STEP 7: VERIFY RLS IS ENABLED
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_provider_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 8: OTHER MIGRATION CHANGES
-- =============================================================================



-- From 202501241530_analytics_phase2_data.sql
ALTER TABLE public.gear_items
  ADD COLUMN IF NOT EXISTS last_rented_at timestamptz;

UPDATE public.gear_items gi
SET last_rented_at = sub.last_rented_at
FROM (
  SELECT
    r.gear_id,
    MAX(
      COALESCE(
        r.actual_return_time,
        r.return_time,
        r.end_date,
        r.start_date,
        r.created_at
      )
    ) AS last_rented_at
  FROM public.reservations r
  WHERE r.status IN ('confirmed', 'active', 'completed')
  GROUP BY r.gear_id
) AS sub
WHERE gi.id = sub.gear_id;

CREATE OR REPLACE FUNCTION public.update_gear_last_rented()
RETURNS TRIGGER AS $$
DECLARE
  last_use timestamptz;
  should_update boolean := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    should_update := TRUE;
  ELSIF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') <> NEW.status THEN
    should_update := TRUE;
  END IF;

  IF should_update AND NEW.status IN ('confirmed', 'active', 'completed') THEN
    last_use := COALESCE(
      NEW.actual_return_time,
      NEW.return_time,
      NEW.end_date,
      NEW.start_date,
      NEW.created_at
    );

    IF last_use IS NOT NULL THEN
      UPDATE public.gear_items
      SET last_rented_at = GREATEST(
        COALESCE(last_rented_at, TIMESTAMP 'epoch'),
        last_use
      )
      WHERE id = NEW.gear_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_gear_last_rented ON public.reservations;

CREATE TRIGGER trg_update_gear_last_rented
  AFTER INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gear_last_rented();

DROP VIEW IF EXISTS analytics_provider_item_performance;
CREATE VIEW analytics_provider_item_performance AS
SELECT
  gi.provider_id,
  gi.id AS gear_id,
  gi.name AS gear_name,
  gi.category,
  gi.quantity_available,
  gi.last_rented_at,
  COALESCE(
    SUM(
      CASE
        WHEN r.status IN ('confirmed', 'active', 'completed') THEN
          COALESCE(
            r.amount_total_cents,
            (r.total_price * 100)::bigint
          )
        ELSE 0
      END
    ),
    0
  ) AS revenue_cents,
  COUNT(*) FILTER (
    WHERE r.status IN ('confirmed', 'active', 'completed')
  ) AS reservation_count
FROM public.gear_items gi
LEFT JOIN public.reservations r
  ON r.gear_id = gi.id
GROUP BY gi.provider_id, gi.id, gi.name, gi.category, gi.quantity_available, gi.last_rented_at;

DROP VIEW IF EXISTS analytics_provider_category_revenue;
CREATE VIEW analytics_provider_category_revenue AS
SELECT
  gi.provider_id,
  COALESCE(gi.category, 'Uncategorized') AS category,
  COUNT(*) FILTER (
    WHERE r.status IN ('confirmed', 'active', 'completed')
  ) AS reservation_count,
  COALESCE(
    SUM(
      CASE
        WHEN r.status IN ('confirmed', 'active', 'completed') THEN
          COALESCE(
            r.amount_total_cents,
            (r.total_price * 100)::bigint
          )
        ELSE 0
      END
    ),
    0
  ) AS revenue_cents
FROM public.gear_items gi
LEFT JOIN public.reservations r
  ON r.gear_id = gi.id
GROUP BY gi.provider_id, COALESCE(gi.category, 'Uncategorized');

DROP VIEW IF EXISTS analytics_provider_daily_utilisation;
CREATE VIEW analytics_provider_daily_utilisation AS
WITH expanded AS (
  SELECT
    r.provider_id,
    r.gear_id,
    generate_series(
      date_trunc('day', r.start_date),
      date_trunc('day', COALESCE(r.end_date, r.start_date)),
      interval '1 day'
    )::date AS usage_date,
    1 AS units
  FROM public.reservations r
  WHERE r.status IN ('hold', 'confirmed', 'active')
    AND r.start_date IS NOT NULL
),
gear_totals AS (
  SELECT
    provider_id,
    SUM(COALESCE(quantity_total, 0)) AS total_units
  FROM public.gear_items
  WHERE active IS DISTINCT FROM FALSE
  GROUP BY provider_id
)
SELECT
  e.provider_id,
  e.usage_date,
  SUM(e.units) AS active_units,
  gt.total_units
FROM expanded e
JOIN gear_totals gt
  ON gt.provider_id = e.provider_id
GROUP BY e.provider_id, e.usage_date, gt.total_units;

DROP VIEW IF EXISTS analytics_provider_activity_feed;
CREATE VIEW analytics_provider_activity_feed AS
SELECT
  r.provider_id,
  r.id AS reservation_id,
  gi.name AS gear_name,
  r.customer_name,
  r.status,
  r.created_at AS created_at,
  r.updated_at AS updated_at,
  COALESCE(r.start_date, r.created_at) AS start_date,
  r.end_date
FROM public.reservations r
LEFT JOIN public.gear_items gi
  ON gi.id = r.gear_id;

-- From 202501250000_hotfix_production_issues.sql
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
ON public.profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_providers_user_id
ON public.providers(user_id);

CREATE INDEX IF NOT EXISTS idx_reservations_provider_id
ON public.reservations(provider_id);

CREATE INDEX IF NOT EXISTS idx_reservations_gear_id
ON public.reservations(gear_id);

CREATE INDEX IF NOT EXISTS idx_reservations_provider_status_dates
ON public.reservations(provider_id, status, start_date DESC);

DROP POLICY IF EXISTS "Providers can view their gear reservations" ON public.reservations;

CREATE POLICY "Providers can view own reservations by provider_id"
  ON public.reservations FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Providers can create reservations" ON public.reservations;

CREATE POLICY "Providers can create reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Providers can update own reservations" ON public.reservations;

CREATE POLICY "Providers can update own reservations"
  ON public.reservations FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- From 20251025100000_add_consistency_trigger.sql
CREATE OR REPLACE FUNCTION public.check_reservation_pricing_consistency()
RETURNS TRIGGER AS $$
DECLARE
  snapshot_total_cents integer;
BEGIN
  IF NEW.pricing_snapshot IS NULL THEN
    RETURN NEW;
  END IF;

  snapshot_total_cents := (NEW.pricing_snapshot->>'total_cents')::integer;

  IF snapshot_total_cents IS NOT NULL AND NEW.amount_total_cents IS DISTINCT FROM snapshot_total_cents THEN
    RAISE EXCEPTION 'Cena nesouhlasí se snapshotem.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_pricing_consistency ON public.reservations;

CREATE TRIGGER enforce_pricing_consistency
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.check_reservation_pricing_consistency();




COMMIT;
