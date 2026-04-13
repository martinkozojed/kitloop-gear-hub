-- Add stable external_key columns to support idempotent seeding

BEGIN;

-- Providers
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS providers_external_key_key
  ON public.providers(external_key);

-- Workspace membership (provider owners/managers)
ALTER TABLE public.user_provider_memberships
ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS user_provider_memberships_external_key_key
  ON public.user_provider_memberships(external_key);

-- Inventory hierarchy
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS products_external_key_provider_key
  ON public.products(provider_id, external_key);

ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_external_key_product_key
  ON public.product_variants(product_id, external_key);

ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS assets_external_key_provider_key
  ON public.assets(provider_id, external_key);

-- Reservations
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS reservations_external_key_provider_key
  ON public.reservations(provider_id, external_key);

COMMIT;
