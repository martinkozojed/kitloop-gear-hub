-- Migration: P2 Foundation (Hold TTL & Observability)
-- Goal: Automated cleanup of stale holds + Performance logging for critical RPCs.

BEGIN;

-- 1. Create RPC Logs Table
CREATE TABLE IF NOT EXISTS public.rpc_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    rpc_name text NOT NULL,
    duration_ms integer,
    success boolean DEFAULT true,
    error_details text,
    params jsonb,
    created_at timestamptz DEFAULT now()
);

-- RLS for Logs: Only Admin can view
ALTER TABLE public.rpc_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view logs" ON public.rpc_logs
    FOR SELECT TO authenticated
    USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin');

-- 2. Hold TTL Function (Expire Stale Holds)
CREATE OR REPLACE FUNCTION public.expire_stale_holds(retention_minutes int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expired_count int;
    v_deleted_ids uuid[];
BEGIN
    -- Select IDs to expire (locking them to prevent race conditions)
    -- We use status='hold' and updated_at check
    WITH expired_rows AS (
        SELECT id 
        FROM public.reservations
        WHERE status = 'hold'
          AND updated_at < (now() - (retention_minutes || ' minutes')::interval)
        FOR UPDATE SKIP LOCKED
    ),
    updated_rows AS (
        UPDATE public.reservations
        SET status = 'cancelled',
            cancellation_reason = 'ttl_expired',
            updated_at = now()
        WHERE id IN (SELECT id FROM expired_rows)
        RETURNING id
    )
    SELECT count(*), array_agg(id) INTO v_expired_count, v_deleted_ids
    FROM updated_rows;

    -- Optional: Log this heavy operation if it did something
    IF v_expired_count > 0 THEN
        INSERT INTO public.admin_audit_logs (
            id, created_at, provider_id, user_id, action, resource_id, details
        )
        -- We don't have a provider_id/user_id easily here as it's a system job.
        -- We'll use NULL or a system user ID if available. Using NULL for now.
        VALUES (
            gen_random_uuid(),
            now(),
            NULL, 
            NULL, -- System Action
            'system.expire_holds',
            NULL,
            jsonb_build_object('count', v_expired_count, 'retention_minutes', retention_minutes)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'expired_count', v_expired_count,
        'expired_ids', v_deleted_ids
    );
END;
$$;

-- 3. Update `issue_reservation` with Logging
CREATE OR REPLACE FUNCTION public.issue_reservation(
    p_reservation_id UUID,
    p_provider_id UUID,
    p_user_id UUID,
    p_override BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time timestamptz := clock_timestamp();
    v_end_time timestamptz;
    v_duration_ms int;
    
    v_reservation RECORD;
    v_assignment RECORD;
    v_affected_assets INT := 0;
BEGIN
    -- 1. Lock and Get Reservation
    SELECT * INTO v_reservation 
    FROM public.reservations 
    WHERE id = p_reservation_id 
    AND provider_id = p_provider_id
    FOR UPDATE;

    IF v_reservation IS NULL THEN
        RAISE EXCEPTION 'Reservation not found or access denied';
    END IF;

    -- 2. Validate Status
    IF v_reservation.status = 'active' THEN
        v_end_time := clock_timestamp();
        v_duration_ms := (EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000)::int;
        
        -- Log Success (Idempotent)
        INSERT INTO public.rpc_logs (rpc_name, duration_ms, success, params)
        VALUES ('issue_reservation', v_duration_ms, true, jsonb_build_object('id', p_reservation_id, 'warn', 'already_active'));
        
        RETURN jsonb_build_object('success', true, 'message', 'Already active', 'status', 'active');
    END IF;

    IF v_reservation.status NOT IN ('confirmed', 'pending') AND NOT p_override THEN
         RAISE EXCEPTION 'Reservation must be confirmed to be issued. Current status: %', v_reservation.status;
    END IF;

    -- 3. Get Assignments and Lock Assets
    FOR v_assignment IN 
        SELECT asset_id 
        FROM public.reservation_assignments 
        WHERE reservation_id = p_reservation_id AND returned_at IS NULL
    LOOP
        -- Lock Asset
        PERFORM 1 FROM public.assets WHERE id = v_assignment.asset_id FOR UPDATE;
        
        -- Update Asset Status
        UPDATE public.assets 
        SET status = 'active'::asset_status_type, 
            location = 'Customer' 
        WHERE id = v_assignment.asset_id;
        
        v_affected_assets := v_affected_assets + 1;
    END LOOP;

    IF v_affected_assets = 0 AND NOT p_override THEN
        RAISE EXCEPTION 'No assets assigned. Cannot issue empty reservation.';
    END IF;

    -- 4. Update Reservation Status
    UPDATE public.reservations
    SET status = 'active',
        updated_at = NOW()
    WHERE id = p_reservation_id;

    -- 5. Audit Log (Business Logic Log)
    INSERT INTO public.admin_audit_logs (
        id, created_at, provider_id, user_id, action, resource_id, details
    ) VALUES (
        gen_random_uuid(), NOW(), p_provider_id, p_user_id, 'reservation.issue', p_reservation_id,
        jsonb_build_object('override', p_override, 'assets_issued', v_affected_assets)
    );

    -- 6. Performance Log (System Log)
    v_end_time := clock_timestamp();
    v_duration_ms := (EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000)::int;
    
    INSERT INTO public.rpc_logs (rpc_name, duration_ms, success, params)
    VALUES ('issue_reservation', v_duration_ms, true, jsonb_build_object('id', p_reservation_id, 'override', p_override));

    RETURN jsonb_build_object(
        'success', true,
        'status', 'active',
        'assets_issued', v_affected_assets
    );

EXCEPTION WHEN OTHERS THEN
    -- Capture Failure Log
    v_end_time := clock_timestamp();
    v_duration_ms := (EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000)::int;

    INSERT INTO public.rpc_logs (rpc_name, duration_ms, success, error_details, params)
    VALUES ('issue_reservation', v_duration_ms, false, SQLERRM, jsonb_build_object('id', p_reservation_id));

    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

COMMIT;
