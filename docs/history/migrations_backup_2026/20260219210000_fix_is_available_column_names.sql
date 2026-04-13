-- Fix is_available overloads: column names quantity/stock → quantity_total
-- gear_items has quantity_total (not quantity or stock)
-- No callers in frontend or edge functions; fixing for DB lint cleanliness.

-- Overload 1: drop + recreate to rename param gear_id → p_gear_id (avoids column ambiguity)
DROP FUNCTION IF EXISTS public.is_available(uuid, timestamp with time zone, timestamp with time zone);
CREATE OR REPLACE FUNCTION public.is_available(
  p_gear_id  uuid,
  start_time timestamp with time zone,
  end_time   timestamp with time zone
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_quantity    integer;
  reserved_quantity integer;
BEGIN
  SELECT quantity_total
    INTO total_quantity
    FROM public.gear_items
   WHERE id = p_gear_id;

  SELECT COALESCE(SUM(1), 0)
    INTO reserved_quantity
    FROM public.reservations r
   WHERE r.gear_id = p_gear_id
     AND r.status IN ('hold', 'confirmed', 'active')
     AND (
       (r.start_date <= start_time AND r.end_date >= start_time) OR
       (r.start_date <= end_time   AND r.end_date >= end_time)   OR
       (r.start_date >= start_time AND r.end_date <= end_time)
     );

  RETURN COALESCE((total_quantity - reserved_quantity), 0) > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.is_available(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_available(uuid, timestamptz, timestamptz) TO authenticated, service_role;

-- Overload 2: (p_gear uuid, p_start date, p_end date, p_qty integer)
CREATE OR REPLACE FUNCTION public.is_available(
  p_gear uuid,
  p_start date,
  p_end  date,
  p_qty  integer
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_stock    int;
  v_reserved int;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_qty IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_start >= p_end OR p_qty < 1 THEN
    RETURN FALSE;
  END IF;

  SELECT quantity_total
    INTO v_stock
    FROM public.gear_items
   WHERE id = p_gear
     AND active = TRUE;

  IF v_stock IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(SUM(r.quantity), 0)
    INTO v_reserved
    FROM public.reservations r
   WHERE r.gear_id = p_gear
     AND r.status IN ('pending', 'paid')
     AND r.start_date < p_end
     AND r.end_date   > p_start;

  RETURN (v_reserved + p_qty) <= v_stock;
END;
$$;

REVOKE ALL ON FUNCTION public.is_available(uuid, date, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_available(uuid, date, date, integer) TO authenticated, service_role;
