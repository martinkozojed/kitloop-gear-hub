-- =====================================================================================
-- Migration: PR 2 - Provider DB Audit Logs
-- Purpose: Create append-only audit trace for core rental operations 
-- Scope: 'reservations', 'gear_items'
-- Author: Kitloop Foundation Audit
-- =====================================================================================
-- 1. Create the Audit Logs Table
CREATE TABLE IF NOT EXISTS public.provider_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth.users(id) ON DELETE
    SET NULL,
        -- who made the change
        entity_table text NOT NULL,
        entity_id uuid NOT NULL,
        action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
        old_data jsonb,
        new_data jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
);
-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_audit_provider_created ON public.provider_audit_logs(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.provider_audit_logs(entity_table, entity_id);
-- 3. RLS Policies
ALTER TABLE public.provider_audit_logs ENABLE ROW LEVEL SECURITY;
-- Deny all by default (Append-only by triggers, read-only by providers)
-- Providers can only read their own logs. No one can update/delete.
CREATE POLICY "Providers can view own audit logs" ON public.provider_audit_logs FOR
SELECT TO authenticated USING (
        provider_id IN (
            SELECT provider_id
            FROM public.provider_members
            WHERE user_id = auth.uid()
        )
        OR auth.uid() IN (
            SELECT user_id
            FROM public.user_roles
            WHERE role = 'superadmin'
        )
    );
-- 4. Trigger Function
CREATE OR REPLACE FUNCTION public.fn_audit_trigger() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER -- Needs to bypass RLS to write the log reliably
SET search_path = public AS $$
DECLARE v_provider_id uuid;
v_actor_id uuid;
v_entity_id text;
BEGIN -- 4a. Find provider_id depending on the table
IF TG_TABLE_NAME = 'reservations' THEN v_provider_id := COALESCE(NEW.provider_id, OLD.provider_id);
v_entity_id := COALESCE(NEW.id, OLD.id);
ELSIF TG_TABLE_NAME = 'gear_items' THEN v_provider_id := COALESCE(NEW.provider_id, OLD.provider_id);
v_entity_id := COALESCE(NEW.id, OLD.id);
ELSE -- Fallback if used on other tables later
BEGIN EXECUTE 'SELECT provider_id FROM ' || quote_ident(TG_TABLE_NAME) || ' WHERE id = $1' INTO v_provider_id USING COALESCE(NEW.id, OLD.id);
EXCEPTION
WHEN OTHERS THEN v_provider_id := NULL;
-- Could not resolve
END;
v_entity_id := COALESCE(NEW.id, OLD.id);
END IF;
-- 4b. Find actor
v_actor_id := auth.uid();
-- 4c. Insert Log
IF TG_OP = 'INSERT' THEN
INSERT INTO public.provider_audit_logs (
        provider_id,
        actor_id,
        entity_table,
        entity_id,
        action,
        old_data,
        new_data
    )
VALUES (
        v_provider_id,
        v_actor_id,
        TG_TABLE_NAME,
        v_entity_id::uuid,
        TG_OP,
        NULL,
        row_to_json(NEW)::jsonb
    );
RETURN NEW;
ELSIF TG_OP = 'UPDATE' THEN -- Only log if row actually changed (prevent empty bloat)
IF row_to_json(OLD)::jsonb != row_to_json(NEW)::jsonb THEN
INSERT INTO public.provider_audit_logs (
        provider_id,
        actor_id,
        entity_table,
        entity_id,
        action,
        old_data,
        new_data
    )
VALUES (
        v_provider_id,
        v_actor_id,
        TG_TABLE_NAME,
        v_entity_id::uuid,
        TG_OP,
        row_to_json(OLD)::jsonb,
        row_to_json(NEW)::jsonb
    );
END IF;
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
INSERT INTO public.provider_audit_logs (
        provider_id,
        actor_id,
        entity_table,
        entity_id,
        action,
        old_data,
        new_data
    )
VALUES (
        v_provider_id,
        v_actor_id,
        TG_TABLE_NAME,
        v_entity_id::uuid,
        TG_OP,
        row_to_json(OLD)::jsonb,
        NULL
    );
RETURN OLD;
END IF;
RETURN NULL;
END;
$$;
-- 5. Attach Triggers to Target Tables
DROP TRIGGER IF EXISTS trg_audit_reservations ON public.reservations;
CREATE TRIGGER trg_audit_reservations
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
DROP TRIGGER IF EXISTS trg_audit_gear_items ON public.gear_items;
CREATE TRIGGER trg_audit_gear_items
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.gear_items FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
-- Grants
GRANT SELECT ON public.provider_audit_logs TO authenticated;
-- Do not grant insert/update/delete to authenticated directly