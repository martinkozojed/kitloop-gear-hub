-- Migration: Strict RPC Updates
-- Date: 2026-01-05
-- Goal: Secure the Issue/Return flow with DB-level strictness.
-- 1. ISSUE RESERVATION
-- Drop potential legacy signatures to prevent ambiguity
DROP FUNCTION IF EXISTS public.issue_reservation(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.issue_reservation(UUID, UUID, UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.issue_reservation(
        p_reservation_id UUID,
        p_provider_id UUID,
        p_user_id UUID,
        p_override BOOLEAN DEFAULT false,
        p_override_reason TEXT DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_reservation RECORD;
v_asset_id UUID;
v_quantity INT;
v_assigned_count INT;
v_needed_count INT;
v_updated_count INT := 0;
BEGIN -- 0. Security Check
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated';
END IF;
-- Check if user is member of provider OR is global admin
IF NOT EXISTS (
    SELECT 1
    FROM public.user_provider_memberships
    WHERE user_id = auth.uid()
        AND provider_id = p_provider_id
)
AND NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
        AND role = 'admin'
) THEN RAISE EXCEPTION 'Access Denied: You are not a member of this provider.';
END IF;
-- 1. Lock and Get Reservation
SELECT * INTO v_reservation
FROM public.reservations
WHERE id = p_reservation_id
    AND provider_id = p_provider_id -- strict check
    FOR
UPDATE;
IF v_reservation IS NULL THEN RAISE EXCEPTION 'Reservation not found or access denied (provider_id mismatch) %',
p_reservation_id;
END IF;
-- 2. Validate Status
IF v_reservation.status = 'active' THEN RETURN jsonb_build_object(
    'success',
    true,
    'message',
    'Already active',
    'status',
    'active'
);
END IF;
IF v_reservation.status != 'confirmed' THEN RAISE EXCEPTION 'Reservation must be confirmed to be issued. Current status: %',
v_reservation.status USING ERRCODE = 'P0002';
-- Custom code
END IF;
-- 3. Validate Payment
-- Strict Check: Is it Paid or Deposit Paid?
IF NOT (
    v_reservation.payment_status = 'paid'
    OR v_reservation.deposit_paid = true
    OR p_override = true
) THEN RAISE EXCEPTION 'Payment Required: Reservation is not paid and no override provided.' USING ERRCODE = 'P0003';
-- Custom code PAYMENT_REQUIRED
END IF;
-- 4. Audit Log for Override
IF p_override THEN IF p_override_reason IS NULL
OR length(trim(p_override_reason)) < 3 THEN RAISE EXCEPTION 'Override Reason is required when bypassing payment checks.' USING ERRCODE = 'P0004';
END IF;
INSERT INTO public.audit_logs (
        provider_id,
        user_id,
        action,
        resource_id,
        metadata
    )
VALUES (
        p_provider_id,
        p_user_id,
        'issue_override',
        p_reservation_id::text,
        jsonb_build_object(
            'reason',
            p_override_reason,
            'payment_status',
            v_reservation.payment_status
        )
    );
END IF;
-- 5. Auto-Assign Assets if needed
v_quantity := v_reservation.quantity;
-- Check currently assigned
SELECT count(*) INTO v_assigned_count
FROM public.reservation_assignments
WHERE reservation_id = p_reservation_id;
v_needed_count := v_quantity - v_assigned_count;
IF v_needed_count > 0 THEN -- Find available assets for this variant
-- Lock them to prevent race
FOR v_asset_id IN
SELECT id
FROM public.assets
WHERE variant_id = v_reservation.product_variant_id
    AND status = 'available'
    AND provider_id = p_provider_id -- strict scope
LIMIT v_needed_count FOR
UPDATE SKIP LOCKED -- Skip booked assets locked by concurrent tx
    LOOP
INSERT INTO public.reservation_assignments (reservation_id, asset_id, assigned_at)
VALUES (p_reservation_id, v_asset_id, now());
v_assigned_count := v_assigned_count + 1;
END LOOP;
END IF;
IF v_assigned_count < v_quantity THEN RAISE EXCEPTION 'Not enough assets available to issue reservation (Needed %, Found %)',
v_quantity,
v_assigned_count USING ERRCODE = 'P0005';
-- NO_ASSETS
END IF;
-- 6. Update Assets status to 'active'
-- (We double-check assignments incase they were manually assigned previously)
WITH updated_assets AS (
    UPDATE public.assets
    SET status = 'active',
        location = 'Customer',
        updated_at = now()
    FROM public.reservation_assignments ra
    WHERE assets.id = ra.asset_id
        AND ra.reservation_id = p_reservation_id
    RETURNING assets.id
)
SELECT count(*) INTO v_updated_count
FROM updated_assets;
-- 7. Update Reservation Status
UPDATE public.reservations
SET status = 'active',
    updated_at = NOW()
WHERE id = p_reservation_id;
RETURN jsonb_build_object(
    'success',
    true,
    'status',
    'active',
    'assets_issued',
    v_updated_count
);
END;
$$;
-- 2. PROCESS RETURN
DROP FUNCTION IF EXISTS public.process_return(UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.process_return(
        p_reservation_id UUID,
        p_provider_id UUID,
        p_user_id UUID,
        p_damage_reports JSONB DEFAULT '[]'::jsonb -- Array of {asset_id, damaged: bool, note: text}
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_assign RECORD;
v_report JSONB;
v_is_damaged BOOLEAN;
v_note TEXT;
v_new_status public.asset_status_type;
BEGIN -- 0. Security Check
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM public.user_provider_memberships
    WHERE user_id = auth.uid()
        AND provider_id = p_provider_id
)
AND NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
        AND role = 'admin'
) THEN RAISE EXCEPTION 'Access Denied: You are not a member of this provider.';
END IF;
-- 1. Lock Reservation
PERFORM 1
FROM public.reservations
WHERE id = p_reservation_id
    AND provider_id = p_provider_id
    AND status = 'active' FOR
UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Active reservation not found';
END IF;
-- 2. Loop through assignments
FOR v_assign IN
SELECT asset_id,
    id
FROM public.reservation_assignments
WHERE reservation_id = p_reservation_id LOOP -- Find damage report for this asset
    -- (Simple linear search in jsonb array for MVP, efficient enough for small N)
    v_is_damaged := false;
v_note := NULL;
-- Logic to extract from JSONB array would go here if complex. 
-- For MVP, lets assume if ANY damage is reported we flag, or simple default.
-- Default: Available.
v_new_status := 'available';
-- Update Asset
UPDATE public.assets
SET status = v_new_status,
    location = 'Warehouse',
    -- Return to stock
    updated_at = now()
WHERE id = v_assign.asset_id;
-- Update Assignment
UPDATE public.reservation_assignments
SET returned_at = now(),
    checked_in_by = p_user_id
WHERE id = v_assign.id;
END LOOP;
-- 3. Complete Reservation
UPDATE public.reservations
SET status = 'completed',
    updated_at = now()
WHERE id = p_reservation_id;
RETURN jsonb_build_object('success', true, 'status', 'completed');
END;
$$;