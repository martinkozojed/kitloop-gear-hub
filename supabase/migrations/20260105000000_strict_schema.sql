-- Migration: Strict Schema & Invariants
-- Date: 2026-01-05
-- Goals:
-- 1. Enforce strict status enums via Check Constraints (more flexible than Postgres ENUM types for updates)
-- 2. Enforce logic consistency (Price >= 0)
-- 3. Enforce Hierarchy Consistency (Asset Provider matches Product Provider)
-- 4. Ensure Audit Log indexes exist

-- 1. ASSETS
-- Enforce strict status
ALTER TABLE public.assets
  ADD CONSTRAINT assets_status_check
  CHECK (status IN ('available', 'active', 'maintenance', 'retired', 'lost'));

-- Enforce unique asset tag per provider
ALTER TABLE public.assets
  ADD CONSTRAINT assets_provider_tag_key
  UNIQUE (provider_id, asset_tag);

-- Index for searching assets by status (common access pattern)
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);

-- 2. PRODUCTS
-- Enforce positive price
ALTER TABLE public.products
  ADD CONSTRAINT products_price_check
  CHECK (base_price_cents >= 0);

-- 3. CONSISTENCY TRIGGER
-- Ensure that an asset's provider_id matches the provider_id of its parent product/variant.
-- This prevents "orphaned" assets or security leaks where an asset belongs to Provider A but is linked to Provider B's product.

CREATE OR REPLACE FUNCTION public.check_asset_provider_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_provider_id UUID;
BEGIN
  -- Get the provider_id from the parent variant -> product
  SELECT p.provider_id INTO v_product_provider_id
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = NEW.variant_id;

  IF v_product_provider_id IS DISTINCT FROM NEW.provider_id THEN
    RAISE EXCEPTION 'Asset provider_id (%) must match Product provider_id (%)', NEW.provider_id, v_product_provider_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_asset_provider ON public.assets;

CREATE TRIGGER trg_check_asset_provider
  BEFORE INSERT OR UPDATE OF variant_id, provider_id
  ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_asset_provider_consistency();

-- 4. AUDIT LOGS
-- Ensure we have the right indexes for the audit_logs table (provider specific)
CREATE INDEX IF NOT EXISTS idx_audit_logs_provider_date 
  ON public.audit_logs(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
  ON public.audit_logs(action);

-- Grant access to authenticated users to insert (via RLS) is already done in 20251223120000_create_audit_logs.sql
-- We just ensure the definition is robust.
