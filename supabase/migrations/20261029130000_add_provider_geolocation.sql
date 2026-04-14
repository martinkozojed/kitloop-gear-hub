-- Přidání sloupců pro geolokaci do providers (pokud neexistují)
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS location_point public.geography(Point, 4326);

-- Funkce pro automatický sync location_point z lat/lon
CREATE OR REPLACE FUNCTION public.sync_provider_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
    NEW.location_point = public.st_point(NEW.longitude, NEW.latitude);
  ELSE
    NEW.location_point = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vytvoření triggeru, který volá funkci po změně lat nebo lon
DROP TRIGGER IF EXISTS tr_providers_sync_location_point ON public.providers;
CREATE TRIGGER tr_providers_sync_location_point
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.providers
FOR EACH ROW EXECUTE FUNCTION public.sync_provider_location_point();

-- Vytvoření prostorového GIST indexu pro rychlé vyhledávání "v okolí" (ST_DWithin atd.)
CREATE INDEX IF NOT EXISTS idx_providers_location_point ON public.providers USING GIST (location_point);

-- Úprava view gear_items pro zahrnutí reálné geolokace půjčovny
CREATE OR REPLACE VIEW public.gear_items WITH (security_invoker='true') AS
 SELECT pv.id,
    (((p.name || ' ('::text) || pv.name) || ')'::text) AS name,
    p.description,
    (p.base_price_cents::numeric / 100::numeric) AS price_per_day,
    p.image_url,
    COALESCE(pr.location, 'Prague'::text) AS location,
    5.0 AS rating,
    p.provider_id,
    pv.created_at,
    p.category,
    pr.location_point::public.geography AS geom,
    p.is_active AS active,
    ( SELECT count(*)::integer AS count
           FROM public.assets a
          WHERE ((a.variant_id = pv.id) AND (a.status <> 'retired'::public.asset_status_type))) AS quantity_total,
    ( SELECT count(*)::integer AS count
           FROM public.assets a
          WHERE ((a.variant_id = pv.id) AND (a.status = 'available'::public.asset_status_type))) AS quantity_available,
    'available'::text AS item_state,
    pv.sku,
    'good'::text AS condition,
    ''::text AS notes,
    NULL::date AS last_serviced,
    pv.created_at AS updated_at,
    NULL::timestamp with time zone AS last_rented_at
   FROM public.product_variants pv
     JOIN public.products p ON p.id = pv.product_id
     JOIN public.providers pr ON pr.id = p.provider_id;

-- Seed pro testovací půjčovnu, abychom viděli špendlík v Praze
UPDATE public.providers SET 
    latitude = 50.0755, 
    longitude = 14.4378 
WHERE rental_name = 'Demo Alpine Rentals';
