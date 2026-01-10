-- =============================================================================
-- ADMIN ACTION HARDENING - P0 SECURITY FIX (FIXED)
-- =============================================================================
-- Date: 2026-01-10
-- Purpose: Atomic admin operations + durable rate limiting + audit trail
-- Security: DEFINER functions with fixed search_path
-- NOTE: This migration handles existing admin_audit_logs table
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ADMIN AUDIT LOGS TABLE (Handle existing table)
-- =============================================================================
-- Check if table exists and migrate schema
DO $$
BEGIN
  -- Create table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_audit_logs') THEN
    CREATE TABLE public.admin_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK (action IN ('approve_provider', 'reject_provider', 'other')),
      target_id UUID NOT NULL,
      target_type TEXT NOT NULL DEFAULT 'provider',
      reason TEXT CHECK (length(reason) <= 500),
      metadata JSONB DEFAULT '{}'::jsonb,
      ip_address TEXT,
      user_agent TEXT
    );
  ELSE
    -- Table exists - add missing columns
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_audit_logs' AND column_name='target_type') THEN
      ALTER TABLE public.admin_audit_logs ADD COLUMN target_type TEXT NOT NULL DEFAULT 'provider';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_audit_logs' AND column_name='reason') THEN
      ALTER TABLE public.admin_audit_logs ADD COLUMN reason TEXT CHECK (length(reason) <= 500);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_audit_logs' AND column_name='metadata') THEN
      -- If 'details' column exists, rename it to 'metadata'
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_audit_logs' AND column_name='details') THEN
        ALTER TABLE public.admin_audit_logs RENAME COLUMN details TO metadata;
      ELSE
        ALTER TABLE public.admin_audit_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
      END IF;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_audit_logs' AND column_name='ip_address') THEN
      ALTER TABLE public.admin_audit_logs ADD COLUMN ip_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_audit_logs' AND column_name='user_agent') THEN
      ALTER TABLE public.admin_audit_logs ADD COLUMN user_agent TEXT;
    END IF;
    
    -- Add constraint if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'admin_audit_logs_action_check'
      AND conrelid = 'public.admin_audit_logs'::regclass
    ) THEN
      ALTER TABLE public.admin_audit_logs ADD CONSTRAINT admin_audit_logs_action_check 
        CHECK (action IN ('approve_provider', 'reject_provider', 'other'));
    END IF;
  END IF;
END $$;

-- Index for admin activity queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id_created 
  ON public.admin_audit_logs(admin_id, created_at DESC);

-- Index for target lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target 
  ON public.admin_audit_logs(target_type, target_id, created_at DESC);

-- RLS: Only admins can read audit logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "admin_audit_logs_select_admin"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- No INSERT/UPDATE/DELETE policies - only via RPC functions (SECURITY DEFINER)

-- =============================================================================
-- 2. ADMIN RATE LIMIT TABLE (Durable)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_rate_limits (
  admin_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  action_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_action_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_admin_rate_limits_window 
  ON public.admin_rate_limits(window_start);

-- RLS: Table is internal, no direct access
ALTER TABLE public.admin_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies - only accessed via SECURITY DEFINER functions

-- =============================================================================
-- 3. RATE LIMIT CHECK FUNCTION (Atomic)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.check_admin_rate_limit(
  p_admin_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_window_ms INTEGER DEFAULT 60000
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
  v_window_duration INTERVAL;
BEGIN
  -- Convert milliseconds to interval
  v_window_duration := (p_window_ms || ' milliseconds')::INTERVAL;
  
  -- Lock the row for this admin (or create if doesn't exist)
  INSERT INTO public.admin_rate_limits (admin_id, action_count, window_start, last_action_at)
  VALUES (p_admin_id, 0, v_now, v_now)
  ON CONFLICT (admin_id) DO NOTHING;
  
  -- Get current state with lock
  SELECT action_count, window_start
  INTO v_count, v_window_start
  FROM public.admin_rate_limits
  WHERE admin_id = p_admin_id
  FOR UPDATE;
  
  -- Check if window expired
  IF (v_now - v_window_start) > v_window_duration THEN
    -- Reset window
    UPDATE public.admin_rate_limits
    SET action_count = 1,
        window_start = v_now,
        last_action_at = v_now
    WHERE admin_id = p_admin_id;
    
    RETURN QUERY SELECT TRUE, (p_limit - 1);
    RETURN;
  END IF;
  
  -- Check if limit exceeded
  IF v_count >= p_limit THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;
  
  -- Increment counter
  UPDATE public.admin_rate_limits
  SET action_count = action_count + 1,
      last_action_at = v_now
  WHERE admin_id = p_admin_id;
  
  RETURN QUERY SELECT TRUE, (p_limit - v_count - 1);
END;
$$;

COMMENT ON FUNCTION public.check_admin_rate_limit IS 
'Atomic rate limit check for admin actions. Returns allowed=true if under limit, false otherwise.';

-- =============================================================================
-- 4. ADMIN APPROVE PROVIDER (Atomic)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_approve_provider(
  p_admin_id UUID,
  p_target_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, audit_log_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_audit_log_id UUID;
  v_provider_exists BOOLEAN;
BEGIN
  -- Verify admin permission (defensive check)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required'
      USING ERRCODE = '42501';
  END IF;
  
  -- Check if provider exists
  SELECT EXISTS (
    SELECT 1 FROM public.providers WHERE id = p_target_id
  ) INTO v_provider_exists;
  
  IF NOT v_provider_exists THEN
    RAISE EXCEPTION 'Provider not found'
      USING ERRCODE = 'P0001';
  END IF;
  
  -- ATOMIC OPERATION: Insert audit log + Update provider
  -- 1. Create audit log FIRST (if anything fails, nothing is committed)
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    target_id,
    target_type,
    reason,
    metadata
  )
  VALUES (
    p_admin_id,
    'approve_provider',
    p_target_id,
    'provider',
    p_reason,
    jsonb_build_object(
      'timestamp', now(),
      'previous_status', (SELECT status FROM public.providers WHERE id = p_target_id)
    )
  )
  RETURNING id INTO v_audit_log_id;
  
  -- 2. Update provider status
  UPDATE public.providers
  SET 
    status = 'approved',
    verified = TRUE,
    updated_at = now()
  WHERE id = p_target_id;
  
  -- 3. Return success
  RETURN QUERY SELECT 
    TRUE,
    v_audit_log_id,
    'Provider approved successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.admin_approve_provider IS 
'Atomically approve a provider: creates audit log and updates provider status in single transaction.';

-- =============================================================================
-- 5. ADMIN REJECT PROVIDER (Atomic)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_reject_provider(
  p_admin_id UUID,
  p_target_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, audit_log_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_audit_log_id UUID;
  v_provider_exists BOOLEAN;
BEGIN
  -- Verify admin permission (defensive check)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required'
      USING ERRCODE = '42501';
  END IF;
  
  -- Check if provider exists
  SELECT EXISTS (
    SELECT 1 FROM public.providers WHERE id = p_target_id
  ) INTO v_provider_exists;
  
  IF NOT v_provider_exists THEN
    RAISE EXCEPTION 'Provider not found'
      USING ERRCODE = 'P0001';
  END IF;
  
  -- ATOMIC OPERATION: Insert audit log + Update provider
  -- 1. Create audit log FIRST
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    target_id,
    target_type,
    reason,
    metadata
  )
  VALUES (
    p_admin_id,
    'reject_provider',
    p_target_id,
    'provider',
    p_reason,
    jsonb_build_object(
      'timestamp', now(),
      'previous_status', (SELECT status FROM public.providers WHERE id = p_target_id)
    )
  )
  RETURNING id INTO v_audit_log_id;
  
  -- 2. Update provider status
  UPDATE public.providers
  SET 
    status = 'rejected',
    verified = FALSE,
    updated_at = now()
  WHERE id = p_target_id;
  
  -- 3. Return success
  RETURN QUERY SELECT 
    TRUE,
    v_audit_log_id,
    'Provider rejected successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.admin_reject_provider IS 
'Atomically reject a provider: creates audit log and updates provider status in single transaction.';

-- =============================================================================
-- 6. CLEANUP OLD RATE LIMIT ENTRIES (Maintenance)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Delete entries older than 1 hour
  DELETE FROM public.admin_rate_limits
  WHERE window_start < (now() - INTERVAL '1 hour');
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_rate_limits IS 
'Maintenance function to clean up old rate limit entries. Should be called periodically (e.g., via cron).';

-- =============================================================================
-- 7. GRANT EXECUTE PERMISSIONS
-- =============================================================================
-- These functions are SECURITY DEFINER, so they run with creator privileges
-- Grant execute to authenticated users (authorization checked inside function)
GRANT EXECUTE ON FUNCTION public.check_admin_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_provider TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_provider TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits TO postgres;

COMMIT;
