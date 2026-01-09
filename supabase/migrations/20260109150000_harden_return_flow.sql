-- Migration: Secure Return Flow & Storage Hardening (Fix v2)
-- Date: 2026-01-09
-- Goal: Enforce tenant isolation in storage, prevent orphaned photos, and ensure return idempotence.

-- 1. UPDATE SCHEMA
ALTER TABLE public.return_reports 
ADD COLUMN IF NOT EXISTS photo_evidence JSONB DEFAULT '[]'::jsonb;
-- photo_paths retained for backward compatibility

-- 2. SECURE STORAGE POLICIES
-- Goal: Ensure upload/read/delete only allowed if user belongs to the provider segment in path
-- Path format: {provider_id}/{reservation_id}/{report_id}/{filename}

DROP POLICY IF EXISTS "Providers can view own return photos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can upload own return photos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can manage own return photos" ON storage.objects;
DROP POLICY IF EXISTS "Secure: Providers can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Secure: Providers can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Secure: Providers can delete own photos" ON storage.objects;

CREATE POLICY "Secure: Providers can view own photos" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'damage-photos' 
    AND (
        -- Member Check
        EXISTS (
            SELECT 1 FROM public.user_provider_memberships m
            WHERE m.user_id = auth.uid() 
            AND m.provider_id::text = split_part(name, '/', 1)
        )
        OR
        -- Owner Check (providers.user_id)
        EXISTS (
            SELECT 1 FROM public.providers p
            WHERE p.user_id = auth.uid()
            AND p.id::text = split_part(name, '/', 1)
        )
    )
);

CREATE POLICY "Secure: Providers can upload own photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'damage-photos' 
    AND (
        EXISTS (
            SELECT 1 FROM public.user_provider_memberships m
            WHERE m.user_id = auth.uid() 
            AND m.provider_id::text = split_part(name, '/', 1)
        )
        OR
        EXISTS (
            SELECT 1 FROM public.providers p
            WHERE p.user_id = auth.uid()
            AND p.id::text = split_part(name, '/', 1)
        )
    )
);

CREATE POLICY "Secure: Providers can delete own photos" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'damage-photos' 
    AND (
        EXISTS (
            SELECT 1 FROM public.user_provider_memberships m
            WHERE m.user_id = auth.uid() 
            AND m.provider_id::text = split_part(name, '/', 1)
        )
        OR
        EXISTS (
            SELECT 1 FROM public.providers p
            WHERE p.user_id = auth.uid()
            AND p.id::text = split_part(name, '/', 1)
        )
    )
);

-- 3. NEW RPC: create_return_report (Hardened)
DROP FUNCTION IF EXISTS public.create_return_report(UUID, UUID, UUID, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.create_return_report(UUID, UUID, JSONB, TEXT); -- Drop previous dev signature if exists

CREATE OR REPLACE FUNCTION public.create_return_report(
    p_reservation_id UUID,
    p_provider_id UUID,
    p_damage_reports JSONB DEFAULT '[]'::jsonb, 
    p_general_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_assign RECORD;
    v_is_damaged BOOLEAN;
    v_new_status public.asset_status_type;
    v_report_id UUID;
    v_res_provider_id UUID;
    v_res_status TEXT;
    v_user_id UUID := auth.uid();
BEGIN
    -- 0. Auth Check
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 1. Authorization (Member OR Owner OR Admin)
    IF NOT EXISTS (
        SELECT 1 FROM public.user_provider_memberships 
        WHERE user_id = v_user_id AND provider_id = p_provider_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.providers
        WHERE user_id = v_user_id AND id = p_provider_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- 2. Idempotence Check & Lock & Provider Verification
    SELECT status, provider_id INTO v_res_status, v_res_provider_id
    FROM public.reservations 
    WHERE id = p_reservation_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    -- Verify Provider Match
    IF v_res_provider_id != p_provider_id THEN
         RAISE EXCEPTION 'Provider mismatch';
    END IF;

    IF v_res_status = 'completed' THEN
        RAISE EXCEPTION 'Reservation already returned' USING ERRCODE = 'P0003';
    END IF;

    IF v_res_status != 'active' THEN
        RAISE EXCEPTION 'Reservation must be active to return';
    END IF;

    -- 3. Create Report
    INSERT INTO public.return_reports (
        reservation_id, provider_id, created_by, damage_reports, notes
    ) VALUES (
        p_reservation_id, p_provider_id, v_user_id, p_damage_reports, p_general_notes
    ) RETURNING id INTO v_report_id;

    -- 4. Update Assets
    FOR v_assign IN 
        SELECT asset_id, id FROM public.reservation_assignments 
        WHERE reservation_id = p_reservation_id
    LOOP
        v_is_damaged := false;
        v_new_status := 'available';

        -- Check damage in JSONB
        SELECT (item ->> 'damaged')::boolean INTO v_is_damaged
        FROM jsonb_array_elements(p_damage_reports) AS item
        WHERE (item ->> 'asset_id')::uuid = v_assign.asset_id;
        
        IF v_is_damaged IS TRUE THEN 
            v_new_status := 'maintenance';
        END IF;

        UPDATE public.assets 
        SET status = v_new_status, location = 'Warehouse', updated_at = now()
        WHERE id = v_assign.asset_id AND provider_id = p_provider_id;

        UPDATE public.reservation_assignments
        SET returned_at = now(), checked_in_by = v_user_id
        WHERE id = v_assign.id;
    END LOOP;

    -- 5. Complete Reservation
    UPDATE public.reservations
    SET status = 'completed', updated_at = now()
    WHERE id = p_reservation_id;

    RETURN jsonb_build_object(
        'success', true, 
        'report_id', v_report_id,
        'provider_id', p_provider_id
    );
END;
$$;

-- 4. NEW RPC: attach_return_photos (Hardened)
CREATE OR REPLACE FUNCTION public.attach_return_photos(
    p_report_id UUID,
    p_photo_evidence JSONB -- Array of { asset_id: uuid, path: text }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_provider_id UUID;
    v_reservation_id UUID;
    v_user_id UUID := auth.uid();
    v_path TEXT;
    v_asset_id TEXT; -- from json, implicitly uuid
    v_item JSONB;
BEGIN
    -- 0. Get Context
    SELECT provider_id, reservation_id INTO v_provider_id, v_reservation_id
    FROM public.return_reports WHERE id = p_report_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;

    -- 1. Authorization
    IF NOT EXISTS (
        SELECT 1 FROM public.user_provider_memberships 
        WHERE user_id = v_user_id AND provider_id = v_provider_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.providers
        WHERE user_id = v_user_id AND id = v_provider_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- 2. Validate Evidence Paths
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_photo_evidence)
    LOOP
        v_path := v_item ->> 'path';
        v_asset_id := v_item ->> 'asset_id';
        
        IF v_path IS NULL OR v_asset_id IS NULL THEN
            RAISE EXCEPTION 'Invalid evidence format';
        END IF;

        IF v_path LIKE '%..%' THEN
             RAISE EXCEPTION 'Invalid path traversal';
        END IF;

        -- Check Segments: provider/res/report/file
        -- 1: provider, 2: res, 3: report
        IF split_part(v_path, '/', 1) != v_provider_id::text THEN
             RAISE EXCEPTION 'Path provider mismatch';
        END IF;
        
        IF split_part(v_path, '/', 2) != v_reservation_id::text THEN
             RAISE EXCEPTION 'Path reservation mismatch';
        END IF;

        IF split_part(v_path, '/', 3) != p_report_id::text THEN
             RAISE EXCEPTION 'Path report mismatch';
        END IF;
    END LOOP;

    -- 3. Update Evidence
    UPDATE public.return_reports
    SET photo_evidence = p_photo_evidence,
        photo_paths = array(
            SELECT jsonb_array_elements(p_photo_evidence) ->> 'path'
        )
    WHERE id = p_report_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
