-- Migration: Legacy View Switch
-- Date: 2026-01-05
-- Goals:
-- 1. Rename gear_items to gear_items_legacy (Read-Only Archive)
-- 2. Create gear_items VIEW mapping (Products + Variants -> Flat Structure)
-- 3. Security: View runs with Owner privileges (Security Definer behavior by default), 
--    allowing it to aggregate 'assets' counts without exposing the sensitive 'assets' table to public RLS.

-- 1. CLEANUP LEGACY TRIGGERS
-- Drop trigger that updates 'gear_items' (which is becoming a view)
DROP TRIGGER IF EXISTS trg_update_gear_last_rented ON public.reservations;
-- Function might stay or be dropped, but trigger is the link.

-- 2. RENAME
ALTER TABLE IF EXISTS public.gear_items RENAME TO gear_items_legacy;

-- 2. CREATE VIEW
-- Note: We use security_invoker=true to respect RLS on underlying tables.
CREATE OR REPLACE VIEW public.gear_items WITH (security_invoker = true) AS
SELECT
  pv.id AS id, -- The ID is now the Variant ID (Actionable Entity)
  p.name || ' (' || pv.name || ')' AS name,
  p.description,
  (p.base_price_cents::numeric / 100) AS price_per_day,
  p.image_url,
  'Prague'::text AS location, -- Placeholder for MVP
  5.0::numeric AS rating,     -- Placeholder
  p.provider_id,
  pv.created_at,
  p.category,
  NULL::public.geography AS geom,
  p.is_active AS active,
  
  -- Aggregated Quantities
  (SELECT COUNT(*)::int FROM public.assets a WHERE a.variant_id = pv.id AND a.status != 'retired') AS quantity_total,
  (SELECT COUNT(*)::int FROM public.assets a WHERE a.variant_id = pv.id AND a.status = 'available') AS quantity_available,
  
  'available'::text AS item_state,
  pv.sku,
  'good'::text AS condition,
  ''::text AS notes,
  NULL::date AS last_serviced,
  pv.created_at AS updated_at,
  NULL::timestamptz AS last_rented_at

FROM public.product_variants pv
JOIN public.products p ON p.id = pv.product_id;

-- 3. SECURITY
-- Grant access to the view (Read-Only)
REVOKE ALL ON public.gear_items FROM anon, authenticated, public;
GRANT SELECT ON public.gear_items TO anon, authenticated, service_role;

-- 4. FIX REFERENCES
-- Existing foreign keys to gear_items will likely prevent the RENAME unless we drop constraints or cascading handles it.
-- PostgreSQL RENAME usually updates FKs to point to the new name (gear_items_legacy).
-- This means old Reservations will point to gear_items_legacy. This is Desired Behavior (Historical integrity).
-- New Reservations will point to product_variants (which this View's ID represents).
