-- =============================================================================
-- PHASE 2 DATA FOUNDATIONS FOR PROVIDER ANALYTICS
-- =============================================================================
-- 1. Add last_rented_at column to gear_items and keep it up to date
-- 2. Backfill last_rented_at from existing reservation history
-- 3. Create analytics views for item performance, category revenue,
--    daily utilisation, and recent reservation activity
-- =============================================================================

-- 1. last_rented_at column ----------------------------------------------------

ALTER TABLE public.gear_items
  ADD COLUMN IF NOT EXISTS last_rented_at timestamptz;

-- Backfill using historical reservations (confirmed/active/completed)
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

-- Trigger to update last_rented_at when reservation status becomes billable
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

-- 2. Analytics Views ----------------------------------------------------------

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
    SUM(COALESCE(quantity_available, 0)) AS total_units
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

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
