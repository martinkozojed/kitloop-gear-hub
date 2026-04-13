-- Migration: Add missing provider columns for Phase 4
-- Purpose: The previous migration missed adding the public_booking_token and public_booking_enabled columns
-- Author: Kitloop Team
-- Date: 2026-03-01
-- ============================================================================

BEGIN;

ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS public_booking_token uuid DEFAULT gen_random_uuid() UNIQUE,
ADD COLUMN IF NOT EXISTS public_booking_enabled boolean DEFAULT true NOT NULL;

-- Make sure existing rows get a token
UPDATE public.providers SET public_booking_token = gen_random_uuid() WHERE public_booking_token IS NULL;

-- Ensure constraints block nulls hereafter
ALTER TABLE public.providers ALTER COLUMN public_booking_token SET NOT NULL;

COMMIT;
