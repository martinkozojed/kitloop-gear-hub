-- Migration: Add secure rotatable token for public booking requests
-- Purpose: Replace predictable provider_slug with a secure UUID token for public request links
--          and ensure booking_requests table has the required fields.
-- Author: Kitloop Team
-- Date: 2026-03-01
-- ============================================================================

BEGIN;

-- 1. Create reservation_requests table if it doesnt exist (it seems the RPC exists but the table was never actually created, or it was in a lost migration)
CREATE TABLE IF NOT EXISTS public.reservation_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    request_link_token_hash text NOT NULL,
    customer_name text NOT NULL,
    customer_email text,
    customer_phone text,
    requested_start_date date NOT NULL,
    requested_end_date date NOT NULL,
    product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
    requested_gear_text text,
    notes text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rejected')),
    handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    handled_at timestamptz,
    reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT valid_date_range CHECK (requested_start_date <= requested_end_date),
    CONSTRAINT has_contact_info CHECK (customer_email IS NOT NULL OR customer_phone IS NOT NULL)
);

-- Indices for efficient dashboard querying
CREATE INDEX IF NOT EXISTS idx_reservation_requests_provider_status ON public.reservation_requests(provider_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservation_requests_provider_created ON public.reservation_requests(provider_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.reservation_requests ENABLE ROW LEVEL SECURITY;

-- Provider can read/update their own requests
CREATE POLICY "provider_manage_requests" ON public.reservation_requests
    FOR ALL
    TO authenticated
    USING (
        provider_id IN (
            SELECT p.id FROM public.providers p WHERE p.user_id = auth.uid()
            UNION
            SELECT pm.provider_id FROM public.provider_members pm WHERE pm.user_id = auth.uid()
            UNION
            SELECT upm.provider_id FROM public.user_provider_memberships upm WHERE upm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        provider_id IN (
            SELECT p.id FROM public.providers p WHERE p.user_id = auth.uid()
            UNION
            SELECT pm.provider_id FROM public.provider_members pm WHERE pm.user_id = auth.uid()
            UNION
            SELECT upm.provider_id FROM public.user_provider_memberships upm WHERE upm.user_id = auth.uid()
        )
    );

-- The Edge Function uses a service role to insert, so we do NOT need an anon insert policy.
-- This fulfills the security requirement: "Public submit musí jít přes Edge Function... DB tabulka booking_requests zůstane pro anon zavřená."

COMMIT;
