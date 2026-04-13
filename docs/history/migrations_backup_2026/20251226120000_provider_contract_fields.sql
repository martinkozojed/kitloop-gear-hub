-- Migration: Add Contract Fields to Providers
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS tax_id TEXT, -- ICO/DIC
ADD COLUMN IF NOT EXISTS terms_text TEXT; -- Full legal terms for waivers
