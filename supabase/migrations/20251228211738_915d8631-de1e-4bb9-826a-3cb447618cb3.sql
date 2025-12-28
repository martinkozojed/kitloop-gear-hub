-- ============================================================================
-- SECURITY FIX: Create user_roles table and secure analytics views
-- ============================================================================

-- 1. Create app_role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'provider', 'customer');
  END IF;
END
$$;

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create SECURITY DEFINER function for role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = _role 
      AND revoked_at IS NULL
  )
$$;

-- 5. Create RLS policies for user_roles (using SECURITY DEFINER function to avoid recursion)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Migrate existing admin roles from profiles table to user_roles
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT user_id, 'admin'::public.app_role, now()
FROM public.profiles
WHERE is_admin = true OR role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Migrate existing provider roles
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT user_id, 'provider'::public.app_role, now()
FROM public.profiles
WHERE role = 'provider'
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. Migrate existing customer roles
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT user_id, 'customer'::public.app_role, now()
FROM public.profiles
WHERE role = 'customer' OR role IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 9. Update is_admin() function to use the new user_roles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- 10. Update check_is_admin() function to use the new user_roles table
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- ============================================================================
-- FIX ANALYTICS VIEWS - Add RLS protection via SECURITY INVOKER views
-- ============================================================================

-- 11. Recreate analytics views with security_invoker to enforce RLS
-- First drop the existing views
DROP VIEW IF EXISTS public.analytics_provider_activity_feed;
DROP VIEW IF EXISTS public.analytics_provider_category_revenue;
DROP VIEW IF EXISTS public.analytics_provider_daily_utilisation;
DROP VIEW IF EXISTS public.analytics_provider_item_performance;

-- 12. Recreate analytics_provider_activity_feed with SECURITY INVOKER
CREATE VIEW public.analytics_provider_activity_feed
WITH (security_invoker = true)
AS
SELECT 
  r.id AS reservation_id,
  r.status,
  r.end_date,
  r.start_date,
  g.name AS gear_name,
  r.customer_name,
  r.provider_id,
  r.updated_at,
  r.created_at
FROM public.reservations r
LEFT JOIN public.gear_items g ON r.gear_id = g.id
WHERE r.provider_id IN (
  SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
)
OR public.has_role(auth.uid(), 'admin');

-- 13. Recreate analytics_provider_category_revenue with SECURITY INVOKER
CREATE VIEW public.analytics_provider_category_revenue
WITH (security_invoker = true)
AS
SELECT 
  g.provider_id,
  SUM(r.amount_total_cents) AS revenue_cents,
  g.category,
  COUNT(r.id) AS reservation_count
FROM public.reservations r
JOIN public.gear_items g ON r.gear_id = g.id
WHERE r.status IN ('completed', 'active')
  AND (
    g.provider_id IN (
      SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
GROUP BY g.provider_id, g.category;

-- 14. Recreate analytics_provider_daily_utilisation with SECURITY INVOKER
CREATE VIEW public.analytics_provider_daily_utilisation
WITH (security_invoker = true)
AS
SELECT 
  r.provider_id,
  COUNT(DISTINCT r.id) AS active_units,
  (SELECT SUM(quantity_total) FROM public.gear_items WHERE provider_id = r.provider_id) AS total_units,
  r.start_date::date AS usage_date
FROM public.reservations r
WHERE r.status IN ('active', 'completed')
  AND (
    r.provider_id IN (
      SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
GROUP BY r.provider_id, r.start_date::date;

-- 15. Recreate analytics_provider_item_performance with SECURITY INVOKER
CREATE VIEW public.analytics_provider_item_performance
WITH (security_invoker = true)
AS
SELECT 
  g.id AS gear_id,
  g.name AS gear_name,
  g.provider_id,
  g.category,
  g.quantity_available,
  g.last_rented_at,
  COUNT(r.id) AS reservation_count,
  SUM(r.amount_total_cents) AS revenue_cents
FROM public.gear_items g
LEFT JOIN public.reservations r ON r.gear_id = g.id AND r.status IN ('completed', 'active')
WHERE g.provider_id IN (
  SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
)
OR public.has_role(auth.uid(), 'admin')
GROUP BY g.id, g.name, g.provider_id, g.category, g.quantity_available, g.last_rented_at;

-- 16. Revoke unnecessary permissions on analytics views (only authenticated users should access)
REVOKE ALL ON public.analytics_provider_activity_feed FROM anon;
REVOKE ALL ON public.analytics_provider_category_revenue FROM anon;
REVOKE ALL ON public.analytics_provider_daily_utilisation FROM anon;
REVOKE ALL ON public.analytics_provider_item_performance FROM anon;

GRANT SELECT ON public.analytics_provider_activity_feed TO authenticated;
GRANT SELECT ON public.analytics_provider_category_revenue TO authenticated;
GRANT SELECT ON public.analytics_provider_daily_utilisation TO authenticated;
GRANT SELECT ON public.analytics_provider_item_performance TO authenticated;