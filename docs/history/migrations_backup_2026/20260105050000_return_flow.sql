-- Migration: Return Flow Hardening (Security Patch)
-- Date: 2026-01-05
-- Goal: Support return evidence, strict damage handling, and secure storage policies.

-- 1. RETURN REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.return_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id),
    provider_id UUID NOT NULL REFERENCES public.providers(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    damage_reports JSONB DEFAULT '[]'::jsonb, -- Store detailed asset breakdown
    photo_paths TEXT[] DEFAULT '{}', -- Array of storage paths
    notes TEXT
);

-- RLS
ALTER TABLE public.return_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own reports" ON public.return_reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_provider_memberships
            WHERE user_id = auth.uid() AND provider_id = return_reports.provider_id
        )
    );

CREATE POLICY "Providers can insert own reports" ON public.return_reports
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_provider_memberships
            WHERE user_id = auth.uid() AND provider_id = return_reports.provider_id
        )
    );

-- 2. STORAGE BUCKET (If not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('damage-photos', 'damage-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Secure)
-- Drop old policies if they exist to avoid conflict or looseness
DROP POLICY IF EXISTS "Give provider access to own folder" ON storage.objects;

-- SELECT Policy (USING only)
CREATE POLICY "Providers can view own return photos" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'damage-photos' 
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    )
);

-- INSERT Policy (WITH CHECK)
CREATE POLICY "Providers can upload own return photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'damage-photos' 
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    )
);

-- UPDATE/DELETE Policy (USING)
CREATE POLICY "Providers can manage own return photos" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'damage-photos' 
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    )
);

-- 3. UPDATE RPC process_return
DROP FUNCTION IF EXISTS public.process_return(UUID, UUID, UUID, JSONB, TEXT[], TEXT);
DROP FUNCTION IF EXISTS public.process_return(UUID, UUID, UUID, JSONB); -- legacy drop

CREATE OR REPLACE FUNCTION public.process_return(
    p_reservation_id UUID,
    p_provider_id UUID,
    p_user_id UUID,
    p_damage_reports JSONB DEFAULT '[]'::jsonb, 
    p_photo_paths TEXT[] DEFAULT '{}',
    p_general_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_assign RECORD;
    v_report_item JSONB;
    v_is_damaged BOOLEAN;
    v_item_note TEXT;
    v_new_status public.asset_status_type;
    v_report_id UUID;
    v_processed_count INT := 0;
BEGIN
    -- 0. Security Check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.user_provider_memberships 
        WHERE user_id = auth.uid() AND provider_id = p_provider_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied: You are not a member of this provider.';
    END IF;

    -- 1. Lock Reservation (Strict Tenant Check)
    PERFORM 1 FROM public.reservations 
    WHERE id = p_reservation_id 
    AND provider_id = p_provider_id -- Tenant Scope
    AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active reservation not found (or access denied/provider mismatch)';
    END IF;

    -- 2. Create Return Report
    INSERT INTO public.return_reports (
        reservation_id, provider_id, created_by, damage_reports, photo_paths, notes
    ) VALUES (
        p_reservation_id, p_provider_id, p_user_id, p_damage_reports, p_photo_paths, p_general_notes
    ) RETURNING id INTO v_report_id;

    -- 3. Loop through assignments and update assets
    FOR v_assign IN 
        SELECT asset_id, id FROM public.reservation_assignments 
        WHERE reservation_id = p_reservation_id
        -- Implicitly scoped via reservation_id which is checked above, but asset ownership should be constrained
    LOOP
        -- Find damage report for this asset
        v_is_damaged := false;
        v_item_note := NULL;
        v_new_status := 'available';

        SELECT item ->> 'damaged', item ->> 'note'
        INTO v_is_damaged, v_item_note
        FROM jsonb_array_elements(p_damage_reports) AS item
        WHERE (item ->> 'asset_id')::uuid = v_assign.asset_id;
        
        IF v_is_damaged THEN
            v_new_status := 'maintenance';
        END IF;

        -- Update Asset (Strict Tenant Check)
        UPDATE public.assets 
        SET status = v_new_status,
            location = 'Warehouse',
            updated_at = now()
        WHERE id = v_assign.asset_id
        AND provider_id = p_provider_id; -- Extra safety

        -- Update Assignment
        UPDATE public.reservation_assignments
        SET returned_at = now(),
            checked_in_by = p_user_id
        WHERE id = v_assign.id;
        
        v_processed_count := v_processed_count + 1;
    END LOOP;

    -- 4. Complete Reservation
    UPDATE public.reservations
    SET status = 'completed',
        updated_at = now()
    WHERE id = p_reservation_id
    AND provider_id = p_provider_id; -- Extra safety

    RETURN jsonb_build_object(
        'success', true, 
        'status', 'completed', 
        'processed_assets', v_processed_count,
        'report_id', v_report_id
    );
END;
$$;
