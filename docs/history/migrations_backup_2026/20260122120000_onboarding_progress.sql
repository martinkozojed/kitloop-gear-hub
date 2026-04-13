-- Migration: Onboarding Progress Tracking
-- Purpose: Track provider onboarding completion and checklist items
-- Author: Kitloop Team
-- Date: 2026-01-22
-- ============================================================================
-- ONBOARDING PROGRESS TABLE
-- ============================================================================
-- Separate from providers table for:
-- 1. Clean separation of concerns (onboarding state vs. provider data)
-- 2. Easy querying of incomplete onboardings
-- 3. Audit trail of completion timestamps
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    -- ========================================
    -- Wizard Step Completion (blocking)
    -- ========================================
    step_workspace_completed_at TIMESTAMPTZ,
    step_location_completed_at TIMESTAMPTZ,
    step_inventory_completed_at TIMESTAMPTZ,
    -- ========================================
    -- Milestone Tracking
    -- ========================================
    first_reservation_at TIMESTAMPTZ,
    -- Main activation metric
    first_asset_created_at TIMESTAMPTZ,
    -- Inventory milestone
    -- ========================================
    -- Checklist Items (non-blocking)
    -- ========================================
    checklist_terms_configured BOOLEAN DEFAULT FALSE,
    checklist_team_invited BOOLEAN DEFAULT FALSE,
    checklist_payments_connected BOOLEAN DEFAULT FALSE,
    -- ========================================
    -- UI State
    -- ========================================
    checklist_dismissed_at TIMESTAMPTZ,
    -- User dismissed the widget
    -- ========================================
    -- Metadata
    -- ========================================
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure one progress record per provider
    CONSTRAINT unique_provider_onboarding UNIQUE (provider_id)
);
-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_onboarding_progress_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_onboarding_progress_updated BEFORE
UPDATE ON public.onboarding_progress FOR EACH ROW EXECUTE FUNCTION update_onboarding_progress_timestamp();
-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
-- Provider members can view and update their own onboarding progress
CREATE POLICY "provider_members_manage_own_progress" ON public.onboarding_progress FOR ALL USING (
    provider_id IN (
        SELECT pm.provider_id
        FROM provider_members pm
        WHERE pm.user_id = auth.uid()
    )
) WITH CHECK (
    provider_id IN (
        SELECT pm.provider_id
        FROM provider_members pm
        WHERE pm.user_id = auth.uid()
    )
);
-- Admins can view all (for analytics)
CREATE POLICY "admins_view_all_progress" ON public.onboarding_progress FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM profiles p
            WHERE p.user_id = auth.uid()
                AND p.is_admin = TRUE
        )
    );
-- ============================================================================
-- INDEXES
-- ============================================================================
-- Fast lookup by provider
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_provider ON onboarding_progress(provider_id);
-- Analytics: find incomplete onboardings
CREATE INDEX IF NOT EXISTS idx_onboarding_incomplete ON onboarding_progress(provider_id)
WHERE first_reservation_at IS NULL;
-- ============================================================================
-- HELPER FUNCTION: Get Onboarding Status
-- ============================================================================
CREATE OR REPLACE FUNCTION get_onboarding_status(p_provider_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE result JSONB;
progress RECORD;
BEGIN -- Get or create progress record
INSERT INTO onboarding_progress (provider_id)
VALUES (p_provider_id) ON CONFLICT (provider_id) DO NOTHING;
SELECT * INTO progress
FROM onboarding_progress
WHERE provider_id = p_provider_id;
result := jsonb_build_object(
    'wizard_completed',
    (
        progress.step_workspace_completed_at IS NOT NULL
        AND progress.step_location_completed_at IS NOT NULL
        AND progress.step_inventory_completed_at IS NOT NULL
    ),
    'steps',
    jsonb_build_object(
        'workspace',
        progress.step_workspace_completed_at IS NOT NULL,
        'location',
        progress.step_location_completed_at IS NOT NULL,
        'inventory',
        progress.step_inventory_completed_at IS NOT NULL
    ),
    'milestones',
    jsonb_build_object(
        'first_asset',
        progress.first_asset_created_at IS NOT NULL,
        'first_reservation',
        progress.first_reservation_at IS NOT NULL
    ),
    'checklist',
    jsonb_build_object(
        'terms',
        progress.checklist_terms_configured,
        'team',
        progress.checklist_team_invited,
        'payments',
        progress.checklist_payments_connected
    ),
    'checklist_dismissed',
    progress.checklist_dismissed_at IS NOT NULL,
    'completion_rate',
    (
        CASE
            WHEN progress.step_workspace_completed_at IS NOT NULL THEN 1
            ELSE 0
        END + CASE
            WHEN progress.step_location_completed_at IS NOT NULL THEN 1
            ELSE 0
        END + CASE
            WHEN progress.step_inventory_completed_at IS NOT NULL THEN 1
            ELSE 0
        END + CASE
            WHEN progress.first_reservation_at IS NOT NULL THEN 1
            ELSE 0
        END + CASE
            WHEN progress.checklist_terms_configured THEN 1
            ELSE 0
        END + CASE
            WHEN progress.checklist_team_invited THEN 1
            ELSE 0
        END
    )::FLOAT / 6.0
);
RETURN result;
END;
$$;
-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_onboarding_status(UUID) TO authenticated;
-- ============================================================================
-- PROVIDER TABLE ADDITIONS
-- ============================================================================
-- Add new fields to providers for location info
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS pickup_instructions TEXT,
    ADD COLUMN IF NOT EXISTS business_hours_display TEXT;
-- Comment for documentation
COMMENT ON COLUMN providers.pickup_instructions IS 'Customer-facing pickup instructions (parking, meeting point, etc.)';
COMMENT ON COLUMN providers.business_hours_display IS 'Human-readable business hours (e.g., "Po-Pá 9-17" or "Po domluvě")';
COMMENT ON TABLE onboarding_progress IS 'Tracks provider onboarding wizard and checklist completion';