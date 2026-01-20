


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'moderator',
    'provider',
    'customer'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."asset_status_type" AS ENUM (
    'available',
    'reserved',
    'active',
    'maintenance',
    'quarantine',
    'retired',
    'lost'
);


ALTER TYPE "public"."asset_status_type" OWNER TO "postgres";


CREATE TYPE "public"."customer_risk_status" AS ENUM (
    'safe',
    'warning',
    'blacklist',
    'trusted',
    'verified'
);


ALTER TYPE "public"."customer_risk_status" OWNER TO "postgres";


CREATE TYPE "public"."maintenance_priority" AS ENUM (
    'critical',
    'high',
    'normal',
    'low',
    'cosmetic'
);


ALTER TYPE "public"."maintenance_priority" OWNER TO "postgres";


CREATE TYPE "public"."maintenance_type" AS ENUM (
    'cleaning',
    'repair',
    'inspection',
    'quality_hold'
);


ALTER TYPE "public"."maintenance_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_status" AS ENUM (
    'pending',
    'sent',
    'failed'
);


ALTER TYPE "public"."notification_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'confirmation',
    'pickup_reminder',
    'return_reminder',
    'review_request'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status_type" AS ENUM (
    'unpaid',
    'authorized',
    'paid',
    'refunded',
    'partially_refunded',
    'failed'
);


ALTER TYPE "public"."payment_status_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_provider_member"("p_provider_id" "uuid", "p_user_id" "uuid", "p_role" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF p_role IS NULL OR p_role NOT IN ('owner','manager','staff','viewer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  -- Auth guard: allow service_role, trusted admin, or provider owner only
  IF NOT (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR public.is_admin_trusted()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = p_provider_id
        AND p.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Enforce owner constraint: only service_role or trusted admin can assign 'owner'
  IF p_role = 'owner' AND NOT (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR public.is_admin_trusted()
  ) THEN
    RAISE EXCEPTION 'Owner role requires service or admin';
  END IF;

  INSERT INTO public.user_provider_memberships (user_id, provider_id, role)
  VALUES (p_user_id, p_provider_id, p_role)
  ON CONFLICT (user_id, provider_id) DO UPDATE
    SET role = EXCLUDED.role;
END;
$$;


ALTER FUNCTION "public"."add_provider_member"("p_provider_id" "uuid", "p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_approve_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("success" boolean, "audit_log_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_catalog'
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


ALTER FUNCTION "public"."admin_approve_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_approve_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text") IS 'Atomically approve a provider: creates audit log and updates provider status in single transaction.';



CREATE OR REPLACE FUNCTION "public"."admin_reject_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("success" boolean, "audit_log_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_catalog'
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


ALTER FUNCTION "public"."admin_reject_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_reject_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text") IS 'Atomically reject a provider: creates audit log and updates provider status in single transaction.';



CREATE OR REPLACE FUNCTION "public"."approve_provider"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
BEGIN
    IF NOT public.is_admin_trusted() THEN
        RAISE EXCEPTION 'Access Denied: Only trusted admins can approve providers.';
    END IF;

    UPDATE public.profiles
    SET is_verified = true,
        updated_at = now()
    WHERE user_id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."approve_provider"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attach_return_photos"("p_report_id" "uuid", "p_photo_evidence" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
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


ALTER FUNCTION "public"."attach_return_photos"("p_report_id" "uuid", "p_photo_evidence" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_admin_rate_limit"("p_admin_id" "uuid", "p_limit" integer DEFAULT 20, "p_window_ms" integer DEFAULT 60000) RETURNS TABLE("allowed" boolean, "remaining" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_catalog'
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


ALTER FUNCTION "public"."check_admin_rate_limit"("p_admin_id" "uuid", "p_limit" integer, "p_window_ms" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_admin_rate_limit"("p_admin_id" "uuid", "p_limit" integer, "p_window_ms" integer) IS 'Atomic rate limit check for admin actions. Returns allowed=true if under limit, false otherwise.';



CREATE OR REPLACE FUNCTION "public"."check_asset_provider_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
  v_product_provider_id UUID;
BEGIN
  -- Get the provider_id from the parent variant -> product
  SELECT p.provider_id INTO v_product_provider_id
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = NEW.variant_id;

  IF v_product_provider_id IS DISTINCT FROM NEW.provider_id THEN
    RAISE EXCEPTION 'Asset provider_id (%) must match Product provider_id (%)', NEW.provider_id, v_product_provider_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_asset_provider_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;


ALTER FUNCTION "public"."check_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_member_safe"("p_provider_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_provider_memberships
    WHERE provider_id = p_provider_id
    AND user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."check_is_member_safe"("p_provider_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_owner_safe"("p_provider_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = p_provider_id
    AND user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."check_is_owner_safe"("p_provider_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_overbooking_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
  v_buffer_minutes INT;
  v_total_assets INT;
  v_reserved_count INT;
  v_variant_id UUID;
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only check if status is 'confirmed' or 'active' (blocking inventory)
  -- If status is 'pending', 'draft', 'cancelled', 'completed', we usually don't block or we have different rules.
  -- Pilot Rule: Only CONFIRMED/ACTIVE blocks inventory.
  
  IF NEW.status NOT IN ('confirmed', 'active') THEN
    RETURN NEW;
  END IF;

  v_variant_id := NEW.product_variant_id;
  v_start_date := NEW.start_date;
  v_end_date := NEW.end_date;

  -- 1. SERIALIZE ACCESS
  -- Lock the variant row to prevent concurrent bookings from racing past the check.
  PERFORM 1 FROM public.product_variants WHERE id = v_variant_id FOR SHARE; 
  -- Note: FOR SHARE allows others to read properties, but we might want FOR UPDATE to serialize strictly if we are writing reservation counts?
  -- Actually, to prevent "Write Skew" where two transactions read avail=1 and both book, we need to enforce order.
  -- Simple way: Lock the Parent Variant.
  PERFORM 1 FROM public.product_variants WHERE id = v_variant_id FOR UPDATE;

  -- 2. GET TOTAL CAPACITY
  -- Count assets that are NOT retired/lost
  SELECT COUNT(*) INTO v_total_assets
  FROM public.assets
  WHERE variant_id = v_variant_id
  AND status NOT IN ('retired', 'lost');

  -- 3. GET BUFFER (if any)
  SELECT COALESCE(attributes->>'buffer_minutes', '0')::int INTO v_buffer_minutes
  FROM public.product_variants
  WHERE id = v_variant_id;
  
  -- If null, default to 0
  v_buffer_minutes := COALESCE(v_buffer_minutes, 0);

  -- 4. COUNT OVERLAPPING RESERVATIONS
  -- Overlap logic: (StartA < EndB) and (EndA > StartB)
  -- We exclude the current reservation (NEW.id) to allow updates
  SELECT COUNT(*) INTO v_reserved_count
  FROM public.reservations r
  WHERE r.product_variant_id = v_variant_id
  AND r.status IN ('confirmed', 'active')
  AND r.id != NEW.id -- Exclude self
  AND r.start_date < v_end_date
  AND (r.end_date + (v_buffer_minutes || ' minutes')::interval) > v_start_date;

  -- 5. CHECK CAPACITY
  IF (v_reserved_count + 1) > v_total_assets THEN -- +1 for the current reservation
    RAISE EXCEPTION 'Availability Exceeded: Variant % has % assets, but % are already booked/overlapping.', v_variant_id, v_total_assets, v_reserved_count
      USING ERRCODE = 'P0001'; -- Custom code, or use standard '23000' integrity check
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_overbooking_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_reservation_pricing_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
  snapshot_total_cents integer;
BEGIN
  IF NEW.pricing_snapshot IS NULL THEN
    RETURN NEW;
  END IF;

  snapshot_total_cents := (NEW.pricing_snapshot->>'total_cents')::integer;

  IF snapshot_total_cents IS NOT NULL AND NEW.amount_total_cents IS DISTINCT FROM snapshot_total_cents THEN
    RAISE EXCEPTION 'Cena nesouhlasí se snapshotem.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_reservation_pricing_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_variant_availability"("p_variant_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    v_total_assets INT;
    v_reserved_count INT;
    v_buffer_minutes INT;
BEGIN
    -- 0. Get Buffer (default 1440 aka 24h if null)
    SELECT COALESCE(buffer_minutes, 1440) INTO v_buffer_minutes
    FROM public.product_variants
    WHERE id = p_variant_id;

    -- 1. Count total serviceable assets for this variant
    SELECT COUNT(*) INTO v_total_assets
    FROM public.assets
    WHERE variant_id = p_variant_id
    AND status IN ('available', 'active'); -- Exclude 'maintenance', 'retired', 'quarantine'

    -- 2. Count overlapping reservations INCLUDING BUFFER
    -- A reservation blocks the slot from [start_date] to [end_date + buffer]
    -- We seek overlap: (NewStart < OldEffectiveEnd) AND (NewEnd > OldStart)
    SELECT COUNT(*) INTO v_reserved_count
    FROM public.reservations
    WHERE product_variant_id = p_variant_id
    AND status IN ('hold', 'confirmed', 'active')
    AND start_date < p_end_date
    AND (end_date + (v_buffer_minutes || ' minutes')::interval) > p_start_date;

    -- 3. Return Availability
    IF (v_total_assets > v_reserved_count) THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;


ALTER FUNCTION "public"."check_variant_availability"("p_variant_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_rate_limits"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."cleanup_old_rate_limits"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_rate_limits"() IS 'Maintenance function to clean up old rate limit entries. Should be called periodically (e.g., via cron).';



CREATE OR REPLACE FUNCTION "public"."cleanup_reservation_holds_sql"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
  v_deleted int := 0;
  v_run_id uuid;
  v_started_at timestamptz := now();
  v_duration_ms int;
BEGIN
  -- Start log (best-effort)
  BEGIN
    INSERT INTO public.cron_runs (cron_name, status, started_at)
    VALUES ('cleanup_reservation_holds_cron', 'started', v_started_at)
    RETURNING id INTO v_run_id;
  EXCEPTION WHEN others THEN
    v_run_id := NULL;
  END;

  BEGIN
    WITH deleted AS (
      DELETE FROM public.reservations
      WHERE status = 'hold'
        AND expires_at IS NOT NULL
        AND expires_at < now()
      RETURNING 1
    )
    SELECT COALESCE(count(*), 0) INTO v_deleted FROM deleted;

    v_duration_ms := GREATEST(0, (EXTRACT(EPOCH FROM (now() - v_started_at)) * 1000)::int);

    IF v_run_id IS NOT NULL THEN
      UPDATE public.cron_runs
      SET status = 'success',
          finished_at = now(),
          duration_ms = v_duration_ms,
          metadata = jsonb_build_object('deleted_count', v_deleted)
      WHERE id = v_run_id;
    END IF;

    RETURN jsonb_build_object('deleted_count', v_deleted, 'cron_run_id', v_run_id);
  EXCEPTION WHEN others THEN
    v_duration_ms := GREATEST(0, (EXTRACT(EPOCH FROM (now() - v_started_at)) * 1000)::int);
    IF v_run_id IS NOT NULL THEN
      UPDATE public.cron_runs
      SET status = 'failed',
          finished_at = now(),
          duration_ms = v_duration_ms,
          error_message = SQLERRM
      WHERE id = v_run_id;
    END IF;
    RAISE;
  END;
END;
$$;


ALTER FUNCTION "public"."cleanup_reservation_holds_sql"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_return_report"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_damage_reports" "jsonb" DEFAULT '[]'::"jsonb", "p_general_notes" "text" DEFAULT ''::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
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


ALTER FUNCTION "public"."create_return_report"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_damage_reports" "jsonb", "p_general_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_stale_holds"("retention_minutes" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    v_expired_count int;
    v_deleted_ids uuid[];
    v_is_service boolean := current_setting('request.jwt.claim.role', true) = 'service_role';
BEGIN
    IF NOT v_is_service THEN
        RAISE EXCEPTION 'Service role required';
    END IF;

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

    RETURN jsonb_build_object(
        'success', true, 
        'expired_count', v_expired_count,
        'expired_ids', v_deleted_ids
    );
END;
$$;


ALTER FUNCTION "public"."expire_stale_holds"("retention_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_360"("p_customer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    v_customer JSONB;
    v_account JSONB;
    v_active_reservation_count INTEGER;
    v_total_spend INTEGER; -- In cents
BEGIN
    -- Check permissions
    PERFORM 1 FROM customers WHERE id = p_customer_id AND provider_id = (SELECT id FROM providers WHERE user_id = auth.uid());
    IF NOT FOUND THEN RAISE EXCEPTION 'Access denied or customer not found'; END IF;

    -- Get Customer Data
    SELECT row_to_json(c)::jsonb INTO v_customer FROM customers c WHERE id = p_customer_id;

    -- Get Account Data (if any)
    IF (v_customer->>'account_id') IS NOT NULL THEN
         SELECT row_to_json(a)::jsonb INTO v_account FROM accounts a WHERE id = (v_customer->>'account_id')::uuid;
    END IF;

    -- Mock/Simple Stats (To be expanded with Reservation logic)
    -- For now, just return 0 to prevent complex joins if reservations table isn't migrated to link customer_id yet.
    v_active_reservation_count := 0; 
    v_total_spend := 0;

    RETURN jsonb_build_object(
        'profile', v_customer,
        'account', v_account,
        'stats', jsonb_build_object(
            'active_reservations', v_active_reservation_count,
            'total_spend_cents', v_total_spend,
            'risk_score', 0
        )
    );
END;
$$;


ALTER FUNCTION "public"."get_customer_360"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"("limit_provider_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    role_text text;
BEGIN
    SELECT role INTO role_text
    FROM public.provider_members
    WHERE user_id = auth.uid()
      AND provider_id = limit_provider_id;
      
    RETURN role_text; -- Returns 'owner', 'staff', 'viewer', or NULL
END;
$$;


ALTER FUNCTION "public"."get_my_role"("limit_provider_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_reservation_confirmation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
BEGIN
    -- If status changed to 'confirmed' (or created as 'confirmed')
    -- AND no previous confirmation log exists
    IF (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed')) THEN
        PERFORM public.mock_send_notification(NEW.id, 'confirmation');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_reservation_confirmation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = _role 
      AND revoked_at IS NULL
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_trusted"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin_trusted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_available"("gear_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    total_quantity INTEGER;
    reserved_quantity INTEGER;
BEGIN
    SELECT quantity INTO total_quantity
    FROM gear_items
    WHERE id = gear_id;

    SELECT COALESCE(SUM(1), 0) INTO reserved_quantity
    FROM reservations
    WHERE gear_item_id = gear_id
      AND status IN ('hold', 'confirmed', 'active')
      AND (
        (start_date <= start_time AND end_date >= start_time) OR
        (start_date <= end_time AND end_date >= end_time) OR
        (start_date >= start_time AND end_date <= end_time)
      );

    RETURN (total_quantity - reserved_quantity) > 0;
END;
$$;


ALTER FUNCTION "public"."is_available"("gear_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_available"("p_gear" "uuid", "p_start" "date", "p_end" "date", "p_qty" integer) RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
  v_stock int;
  v_reserved int;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_qty IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_start >= p_end OR p_qty < 1 THEN
    RETURN FALSE;
  END IF;

  SELECT stock
    INTO v_stock
    FROM public.gear_items
    WHERE id = p_gear
      AND active = TRUE;

  IF v_stock IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(SUM(r.quantity), 0)
    INTO v_reserved
    FROM public.reservations r
    WHERE r.gear_id = p_gear
      AND r.status IN ('pending', 'paid')
      AND r.start_date < p_end
      AND r.end_date > p_start;

  RETURN (v_reserved + p_qty) <= v_stock;
END;
$$;


ALTER FUNCTION "public"."is_available"("p_gear" "uuid", "p_start" "date", "p_end" "date", "p_qty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_provider_member"("pid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.providers p
    WHERE p.id = pid
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_provider_memberships m
    WHERE m.provider_id = pid
      AND m.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_provider_member"("pid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."issue_reservation"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_override" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
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


ALTER FUNCTION "public"."issue_reservation"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_override" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."issue_reservation"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_override" boolean DEFAULT false, "p_override_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    v_reservation RECORD;
    v_asset_id UUID;
    v_quantity INT;
    v_assigned_count INT;
    v_needed_count INT;
    v_updated_count INT := 0;
    v_actor uuid;
    v_is_service boolean := current_setting('request.jwt.claim.role', true) = 'service_role';
BEGIN
    IF auth.uid() IS NULL AND NOT v_is_service THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_actor := COALESCE(auth.uid(), p_user_id);

    IF NOT (
      v_is_service
      OR public.is_admin_trusted()
      OR EXISTS (SELECT 1 FROM public.provider_members pm WHERE pm.provider_id = p_provider_id AND pm.user_id = v_actor)
      OR EXISTS (SELECT 1 FROM public.providers p WHERE p.id = p_provider_id AND p.user_id = v_actor)
    ) THEN
        RAISE EXCEPTION 'Access Denied: You are not a member/owner/admin of this provider.';
    END IF;

    -- 1. Lock and Get Reservation
    SELECT * INTO v_reservation 
    FROM public.reservations 
    WHERE id = p_reservation_id 
      AND provider_id = p_provider_id
    FOR UPDATE;

    IF v_reservation IS NULL THEN
        RAISE EXCEPTION 'Reservation not found or access denied (provider_id mismatch) %', p_reservation_id;
    END IF;

    -- 2. Validate Status
    IF v_reservation.status = 'active' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already active', 'status', 'active');
    END IF;

    IF v_reservation.status != 'confirmed' THEN
         RAISE EXCEPTION 'Reservation must be confirmed to be issued. Current status: %', v_reservation.status
         USING ERRCODE = 'P0002';
    END IF;

    -- 3. Validate Payment
    IF NOT (
        v_reservation.payment_status = 'paid' OR 
        v_reservation.deposit_paid = true OR
        p_override = true
    ) THEN
        RAISE EXCEPTION 'Payment Required: Reservation is not paid and no override provided.'
        USING ERRCODE = 'P0003';
    END IF;

    -- 4. Audit Log for Override
    IF p_override THEN
        IF p_override_reason IS NULL OR length(trim(p_override_reason)) < 3 THEN
             RAISE EXCEPTION 'Override Reason is required when bypassing payment checks.'
             USING ERRCODE = 'P0004';
        END IF;

        INSERT INTO public.audit_logs (
            provider_id,
            user_id,
            action,
            resource_id,
            metadata
        ) VALUES (
            p_provider_id,
            v_actor,
            'issue_override',
            p_reservation_id::text,
            jsonb_build_object(
                'reason', p_override_reason,
                'payment_status', v_reservation.payment_status
            )
        );
    END IF;

    -- 5. Auto-Assign Assets if needed
    v_quantity := v_reservation.quantity;
    SELECT count(*) INTO v_assigned_count 
    FROM public.reservation_assignments 
    WHERE reservation_id = p_reservation_id;

    v_needed_count := v_quantity - v_assigned_count;

    IF v_needed_count > 0 THEN
        FOR v_asset_id IN 
            SELECT id FROM public.assets 
            WHERE variant_id = v_reservation.product_variant_id
            AND status = 'available'
            AND provider_id = p_provider_id
            LIMIT v_needed_count
            FOR UPDATE SKIP LOCKED
        LOOP
            UPDATE public.reservation_assignments
            SET returned_at = NULL
            WHERE reservation_id = p_reservation_id
              AND asset_id = v_asset_id;

            UPDATE public.assets 
            SET status = 'active', 
                location = 'Customer'
            WHERE id = v_asset_id;

            INSERT INTO public.reservation_assignments (
                reservation_id, asset_id, assigned_at, checked_out_by
            ) VALUES (
                p_reservation_id, v_asset_id, now(), v_actor
            ) ON CONFLICT DO NOTHING;

            v_updated_count := v_updated_count + 1;
        END LOOP;
    END IF;

    -- 6. Update Reservation Status
    UPDATE public.reservations
    SET status = 'active',
        updated_at = NOW()
    WHERE id = p_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'active',
        'assets_issued', v_updated_count
    );
END;
$$;


ALTER FUNCTION "public"."issue_reservation"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_override" boolean, "p_override_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_reservation_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.audit_logs (provider_id, user_id, action, resource_id, metadata)
            VALUES (
                NEW.provider_id, 
                coalesce(auth.uid(), NEW.user_id), -- try to get actor, fallback to owner
                'reservation_status_change',
                NEW.id,
                jsonb_build_object('old', OLD.status, 'new', NEW.status)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_reservation_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mock_send_notification"("p_reservation_id" "uuid", "p_type" "public"."notification_type") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    v_res RECORD;
    v_email TEXT;
    v_subject TEXT;
    v_content TEXT;
    v_log_id UUID;
BEGIN
    -- Fetch Data
    SELECT r.*, c.email, p.rental_name 
    INTO v_res
    FROM reservations r
    JOIN customers c ON r.crm_customer_id = c.id
    JOIN providers p ON r.provider_id = p.id
    WHERE r.id = p_reservation_id;

    IF v_res IS NULL THEN
        RAISE WARNING 'Reservation % not found or missing customer', p_reservation_id;
        RETURN NULL;
    END IF;

    -- Template Logic (Simple strings for now)
    v_email := v_res.email;
    
    IF p_type = 'confirmation' THEN
        v_subject := '✅ Rezervace potvrzena: #' || substring(p_reservation_id::text, 1, 8);
        v_content := 'Dobrý den, vaše rezervace je potvrzena. Těšíme se na vás.';
    ELSIF p_type = 'pickup_reminder' THEN
        v_subject := '⏰ Zítra vás čekáme!';
        v_content := 'Nezapomeňte si doklady. Vyzvednutí je zítra.';
    ELSIF p_type = 'return_reminder' THEN
        v_subject := '↩️ Blíží se čas vrácení';
        v_content := 'Prosíme vrátit vybavení do ' || to_char(v_res.end_date, 'DD.MM HH:MI');
    END IF;

    -- "Send" (Insert Log)
    INSERT INTO public.notification_logs (
        reservation_id, provider_id, type, status, recipient_email, subject, content_preview
    ) VALUES (
        p_reservation_id, v_res.provider_id, p_type, 'sent', v_email, v_subject, v_content
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."mock_send_notification"("p_reservation_id" "uuid", "p_type" "public"."notification_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_daily_reminders"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    r RECORD;
BEGIN
    -- A. Pickup Reminders (Starts in 24h)
    -- Logic: start_date is tomorrow (ignoring time for simplicity, or specifically > now() and < now() + 30h)
    FOR r IN
        SELECT id FROM reservations 
        WHERE status = 'confirmed' 
        AND start_date::date = (current_date + interval '1 day')::date
        AND NOT EXISTS (
            SELECT 1 FROM notification_logs 
            WHERE reservation_id = reservations.id AND type = 'pickup_reminder'
        )
    LOOP
        PERFORM public.mock_send_notification(r.id, 'pickup_reminder');
    END LOOP;

    -- B. Return Reminders (Ends in 24h)
    FOR r IN
        SELECT id FROM reservations 
        WHERE status = 'active' -- Only active rentals need return reminders
        AND end_date::date = (current_date + interval '1 day')::date
        AND NOT EXISTS (
            SELECT 1 FROM notification_logs 
            WHERE reservation_id = reservations.id AND type = 'return_reminder'
        )
    LOOP
        PERFORM public.mock_send_notification(r.id, 'return_reminder');
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."process_daily_reminders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_has_damage" boolean DEFAULT false, "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    v_new_asset_status TEXT;
    v_affected_assets INT;
    v_reservation_status TEXT;
BEGIN
    -- 1. Determine new asset status
    IF p_has_damage THEN
        v_new_asset_status := 'maintenance';
        v_reservation_status := 'returned'; -- Could be 'needs_review' etc.
    ELSE
        v_new_asset_status := 'available';
        v_reservation_status := 'returned'; -- or 'completed'
    END IF;

    -- 2. Update Assignments (Mark as returned)
    UPDATE public.reservation_assignments
    SET returned_at = NOW()
    WHERE reservation_id = p_reservation_id
    AND returned_at IS NULL;

    -- 3. Update Assets Status
    -- We join assignments to find which assets to update
    WITH returned_assets AS (
        SELECT asset_id FROM public.reservation_assignments
        WHERE reservation_id = p_reservation_id
    )
    UPDATE public.assets
    SET status = v_new_asset_status::asset_status, -- Casting to enum if strictly typed
        location = 'Warehouse A' -- Default return location logic
    WHERE id IN (SELECT asset_id FROM returned_assets);

    GET DIAGNOSTICS v_affected_assets = ROW_COUNT;

    -- 4. Update Reservation Status
    UPDATE public.reservations
    SET status = v_reservation_status,
        updated_at = NOW()
    WHERE id = p_reservation_id;

    -- 5. Audit Log (Optional but good practice)
    -- Insert into admin_audit_logs via trigger or manually here if needed. 
    -- For now relying on table triggers.

    RETURN jsonb_build_object(
        'success', true,
        'assets_returned', v_affected_assets,
        'new_status', v_reservation_status
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_has_damage" boolean, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_damage_reports" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    v_assign RECORD;
    v_actor uuid;
    v_is_service boolean := current_setting('request.jwt.claim.role', true) = 'service_role';
BEGIN
    IF auth.uid() IS NULL AND NOT v_is_service THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_actor := COALESCE(auth.uid(), p_user_id);

    IF NOT (
      v_is_service
      OR public.is_admin_trusted()
      OR EXISTS (
        SELECT 1 FROM public.provider_members pm
        WHERE pm.provider_id = p_provider_id
          AND pm.user_id = v_actor
      )
      OR EXISTS (
        SELECT 1 FROM public.providers p
        WHERE p.id = p_provider_id
          AND p.user_id = v_actor
      )
    ) THEN
        RAISE EXCEPTION 'Access Denied: You are not a member/owner/admin of this provider.';
    END IF;

    PERFORM 1 FROM public.reservations 
    WHERE id = p_reservation_id 
      AND provider_id = p_provider_id
      AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active reservation not found';
    END IF;

    FOR v_assign IN 
        SELECT asset_id, id FROM public.reservation_assignments 
        WHERE reservation_id = p_reservation_id
    LOOP
        UPDATE public.assets 
        SET status = 'available',
            location = 'Warehouse',
            updated_at = now()
        WHERE id = v_assign.asset_id;

        UPDATE public.reservation_assignments
        SET returned_at = now(),
            checked_in_by = v_actor
        WHERE id = v_assign.id;
    END LOOP;

    UPDATE public.reservations
    SET status = 'completed',
        updated_at = now()
    WHERE id = p_reservation_id;

    RETURN jsonb_build_object('success', true, 'status', 'completed');
END;
$$;


ALTER FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_damage_reports" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_damage_reports" "jsonb" DEFAULT '[]'::"jsonb", "p_photo_paths" "text"[] DEFAULT '{}'::"text"[], "p_general_notes" "text" DEFAULT ''::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
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


ALTER FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_damage_reports" "jsonb", "p_photo_paths" "text"[], "p_general_notes" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gear_id" "uuid",
    "provider_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "quantity" integer DEFAULT 1,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "payment_provider" "text" DEFAULT 'offline'::"text" NOT NULL,
    "payment_intent_id" "text",
    "expires_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancel_reason" "text",
    "total_price" numeric(12,2),
    "currency" "text" DEFAULT 'CZK'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid",
    "notes" "text",
    "pricing_snapshot" "jsonb",
    "amount_total_cents" integer DEFAULT 0,
    "customer_name" "text" DEFAULT ''::"text" NOT NULL,
    "customer_email" "text",
    "customer_phone" "text",
    "deposit_paid" boolean DEFAULT false,
    "deposit_amount" numeric DEFAULT 0,
    "pickup_time" timestamp with time zone,
    "return_time" timestamp with time zone,
    "actual_pickup_time" timestamp with time zone,
    "actual_return_time" timestamp with time zone,
    "idempotency_key" "text",
    "product_variant_id" "uuid",
    "documents_status" "jsonb" DEFAULT '{"waiver": "pending"}'::"jsonb",
    "deleted_at" timestamp with time zone,
    "crm_customer_id" "uuid",
    "external_key" "text",
    CONSTRAINT "check_date_range" CHECK (("end_date" > "start_date")),
    CONSTRAINT "check_reservation_status" CHECK (("status" = ANY (ARRAY['hold'::"text", 'pending'::"text", 'confirmed'::"text", 'checked_out'::"text", 'returned'::"text", 'inspected_closed'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text", 'no_show'::"text"]))),
    CONSTRAINT "check_total_price" CHECK (("total_price" >= (0)::numeric)),
    CONSTRAINT "reservations_amount_total_cents_check" CHECK (("amount_total_cents" >= 0)),
    CONSTRAINT "reservations_check" CHECK (("end_date" > "start_date")),
    CONSTRAINT "reservations_payment_provider_check" CHECK (("payment_provider" = ANY (ARRAY['offline'::"text", 'stripe'::"text", 'gopay'::"text", 'comgate'::"text", 'adyen'::"text"]))),
    CONSTRAINT "reservations_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['unpaid'::"text", 'paid'::"text", 'refunded'::"text"]))),
    CONSTRAINT "reservations_quantity_check" CHECK (("quantity" >= 1))
);

ALTER TABLE ONLY "public"."reservations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."reservations"."currency" IS 'ISO 4217 currency code for totals (defaults to CZK).';



COMMENT ON COLUMN "public"."reservations"."pricing_snapshot" IS 'Stored calculation details (e.g. days, rates, taxes) captured at the time of payment intent creation.';



COMMENT ON COLUMN "public"."reservations"."amount_total_cents" IS 'Total amount in minor units (cents). Edge functions are responsible for keeping it in sync with pricing_snapshot.';



CREATE OR REPLACE FUNCTION "public"."reserve_if_available"("p_gear_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_quantity" integer, "p_customer_id" "uuid") RETURNS "public"."reservations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_gear public.gear_items%ROWTYPE;
  v_provider public.providers%ROWTYPE;
  v_days int;
  v_total numeric(12, 2);
  v_reservation public.reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_customer_id THEN
    RAISE EXCEPTION 'Neni dovoleno vytvorit rezervaci pro jineho uzivatele.' USING ERRCODE = '42501';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL OR p_quantity IS NULL THEN
    RAISE EXCEPTION 'Neplatne udaje rezervace.' USING ERRCODE = '22023';
  END IF;

  IF p_start_date >= p_end_date THEN
    RAISE EXCEPTION 'Datum ukonceni musi byt pozdeji nez datum zacatku.' USING ERRCODE = '22007';
  END IF;

  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Mnozstvi musi byt alespon 1.' USING ERRCODE = '22013';
  END IF;

  SELECT *
    INTO v_gear
    FROM public.gear_items
    WHERE id = p_gear_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vybaveni nebylo nalezeno.' USING ERRCODE = 'P0002';
  END IF;

  IF v_gear.active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Vybaveni neni aktivni.' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_provider
    FROM public.providers
    WHERE id = v_gear.provider_id
    FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poskytovatel nebyl nalezen.' USING ERRCODE = 'P0002';
  END IF;

  IF v_provider.deleted_at IS NOT NULL OR v_provider.verified IS DISTINCT FROM TRUE OR v_provider.approved_at IS NULL THEN
    RAISE EXCEPTION 'Poskytovatel neni schvaleny nebo overeny.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_available(p_gear_id, p_start_date, p_end_date, p_quantity) THEN
    RAISE EXCEPTION 'Vybaveni neni pro zvoleny termin dostupne.' USING ERRCODE = 'P0001';
  END IF;

  v_days := GREATEST(1, (p_end_date - p_start_date));
  v_total := v_days * v_gear.price_per_day * p_quantity;

  INSERT INTO public.reservations (
      gear_id,
      provider_id,
      customer_id,
      start_date,
      end_date,
      quantity,
      status,
      payment_status,
      payment_provider,
      expires_at,
      total_price,
      currency
  )
  VALUES (
      v_gear.id,
      v_provider.id,
      p_customer_id,
      p_start_date,
      p_end_date,
      p_quantity,
      'pending',
      'unpaid',
      'offline',
      timezone('utc', now()) + interval '15 minutes',
      v_total,
      'CZK'
  )
  RETURNING * INTO v_reservation;

  RETURN v_reservation;
END;
$$;


ALTER FUNCTION "public"."reserve_if_available"("p_gear_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_quantity" integer, "p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_customer_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE public.customers
        SET 
            completed_rentals_count = completed_rentals_count + 1,
            lifetime_value_cents = lifetime_value_cents + NEW.amount_total_cents
        WHERE id = NEW.crm_customer_id;
        
        -- Auto-promote to TRUSTED if > 3 rentals
        UPDATE public.customers
        SET risk_status = 'trusted'
        WHERE id = NEW.crm_customer_id 
          AND completed_rentals_count >= 3 
          AND risk_status = 'safe'; -- Only promote if currently neutral/safe
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_customer_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_gear_last_rented"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
  last_use timestamptz;
  should_update boolean := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    should_update := TRUE;
  ELSIF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') <> NEW.status THEN
    should_update := TRUE;
  END IF;

  IF should_update AND NEW.status IN ('confirmed', 'active', 'completed') THEN
    last_use := COALESCE(
      NEW.actual_return_time,
      NEW.return_time,
      NEW.end_date,
      NEW.start_date,
      NEW.created_at
    );

    IF last_use IS NOT NULL THEN
      UPDATE public.gear_items
      SET last_rented_at = GREATEST(
        COALESCE(last_rented_at, TIMESTAMP 'epoch'),
        last_use
      )
      WHERE id = NEW.gear_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_gear_last_rented"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_crm_customer"("p_full_name" "text", "p_email" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT NULL::"text"[], "p_account_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
DECLARE
    v_provider_id UUID;
    v_customer_id UUID;
BEGIN
    -- Get provider_id
    SELECT id INTO v_provider_id FROM providers WHERE user_id = auth.uid();
    IF v_provider_id IS NULL THEN
        RAISE EXCEPTION 'User is not a provider';
    END IF;

    -- Normalize inputs
    IF p_email = '' THEN p_email := NULL; END IF;
    IF p_phone = '' THEN p_phone := NULL; END IF;

    -- 1. Try to find by Email
    IF p_email IS NOT NULL THEN
        SELECT id INTO v_customer_id FROM customers 
        WHERE provider_id = v_provider_id AND lower(email) = lower(p_email) LIMIT 1;
    END IF;

    -- 2. Try to find by Phone (if not found yet)
    IF v_customer_id IS NULL AND p_phone IS NOT NULL THEN
        SELECT id INTO v_customer_id FROM customers 
        WHERE provider_id = v_provider_id AND phone = p_phone LIMIT 1;
    END IF;

    IF v_customer_id IS NOT NULL THEN
        -- UPDATE existing
        UPDATE customers SET
            full_name = p_full_name,
            email = COALESCE(p_email, email),
            phone = COALESCE(p_phone, phone),
            notes = COALESCE(p_notes, notes), -- Only update if new note provided? Or overwrite? 
            -- Logic: If p_notes is provided, append/overwrite. Let's allow overwrite for MVP editor.
            tags = CASE WHEN p_tags IS NOT NULL THEN p_tags ELSE tags END,
            account_id = COALESCE(p_account_id, account_id),
            updated_at = now()
        WHERE id = v_customer_id;
    ELSE
        -- INSERT new
        INSERT INTO customers (provider_id, full_name, email, phone, notes, tags, account_id)
        VALUES (v_provider_id, p_full_name, p_email, p_phone, p_notes, COALESCE(p_tags, '{}'), p_account_id)
        RETURNING id INTO v_customer_id;
        
        -- Log creation event
        INSERT INTO customer_events (provider_id, customer_id, type, title, created_by)
        VALUES (v_provider_id, v_customer_id, 'system', 'Customer Profile Created', auth.uid());
    END IF;

    RETURN v_customer_id;
END;
$$;


ALTER FUNCTION "public"."upsert_crm_customer"("p_full_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text", "p_tags" "text"[], "p_account_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "tax_id" "text",
    "billing_address" "jsonb",
    "contact_email" "text",
    "contact_phone" "text",
    "status" "text" DEFAULT 'active'::"text",
    "risk_score" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "target_type" "text" DEFAULT 'provider'::"text" NOT NULL,
    "reason" "text",
    "ip_address" "text",
    "user_agent" "text",
    CONSTRAINT "admin_audit_logs_action_check" CHECK (("action" = ANY (ARRAY['approve_provider'::"text", 'reject_provider'::"text", 'other'::"text"]))),
    CONSTRAINT "admin_audit_logs_reason_check" CHECK (("length"("reason") <= 500))
);

ALTER TABLE ONLY "public"."admin_audit_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_rate_limits" (
    "admin_id" "uuid" NOT NULL,
    "action_count" integer DEFAULT 0 NOT NULL,
    "window_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_action_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."admin_rate_limits" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gear_items_legacy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "description" "text",
    "price_per_day" numeric,
    "image_url" "text",
    "location" "text",
    "rating" numeric,
    "provider_id" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text",
    "geom" "public"."geography"(Point,4326),
    "active" boolean DEFAULT true NOT NULL,
    "quantity_total" integer DEFAULT 0 NOT NULL,
    "quantity_available" integer DEFAULT 0,
    "item_state" "text" DEFAULT 'available'::"text",
    "sku" "text",
    "condition" "text" DEFAULT 'good'::"text",
    "notes" "text",
    "last_serviced" "date",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_rented_at" timestamp with time zone,
    CONSTRAINT "gear_items_condition_check" CHECK (("condition" = ANY (ARRAY['new'::"text", 'good'::"text", 'fair'::"text", 'poor'::"text"]))),
    CONSTRAINT "gear_items_item_state_check" CHECK (("item_state" = ANY (ARRAY['available'::"text", 'reserved'::"text", 'maintenance'::"text", 'retired'::"text"]))),
    CONSTRAINT "quantity_total_gte_available" CHECK (("quantity_total" >= "quantity_available"))
);

ALTER TABLE ONLY "public"."gear_items_legacy" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."gear_items_legacy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_provider_memberships" (
    "user_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "external_key" "text",
    CONSTRAINT "user_provider_memberships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'staff'::"text", 'viewer'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."user_provider_memberships" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."analytics_provider_activity_feed" WITH ("security_invoker"='true') AS
 SELECT "r"."id" AS "reservation_id",
    "r"."status",
    "r"."end_date",
    "r"."start_date",
    "g"."name" AS "gear_name",
    "r"."customer_name",
    "r"."provider_id",
    "r"."updated_at",
    "r"."created_at"
   FROM ("public"."reservations" "r"
     LEFT JOIN "public"."gear_items_legacy" "g" ON (("r"."gear_id" = "g"."id")))
  WHERE (("r"."provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
           FROM "public"."user_provider_memberships"
          WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));


ALTER TABLE "public"."analytics_provider_activity_feed" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."analytics_provider_category_revenue" WITH ("security_invoker"='true') AS
 SELECT "g"."provider_id",
    "sum"("r"."amount_total_cents") AS "revenue_cents",
    "g"."category",
    "count"("r"."id") AS "reservation_count"
   FROM ("public"."reservations" "r"
     JOIN "public"."gear_items_legacy" "g" ON (("r"."gear_id" = "g"."id")))
  WHERE (("r"."status" = ANY (ARRAY['completed'::"text", 'active'::"text"])) AND (("g"."provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
           FROM "public"."user_provider_memberships"
          WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")))
  GROUP BY "g"."provider_id", "g"."category";


ALTER TABLE "public"."analytics_provider_category_revenue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."analytics_provider_daily_utilisation" WITH ("security_invoker"='true') AS
 SELECT "r"."provider_id",
    "count"(DISTINCT "r"."id") AS "active_units",
    ( SELECT "sum"("gear_items_legacy"."quantity_total") AS "sum"
           FROM "public"."gear_items_legacy"
          WHERE ("gear_items_legacy"."provider_id" = "r"."provider_id")) AS "total_units",
    "r"."start_date" AS "usage_date"
   FROM "public"."reservations" "r"
  WHERE (("r"."status" = ANY (ARRAY['active'::"text", 'completed'::"text"])) AND (("r"."provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
           FROM "public"."user_provider_memberships"
          WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")))
  GROUP BY "r"."provider_id", "r"."start_date";


ALTER TABLE "public"."analytics_provider_daily_utilisation" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."analytics_provider_item_performance" WITH ("security_invoker"='true') AS
 SELECT "g"."id" AS "gear_id",
    "g"."name" AS "gear_name",
    "g"."provider_id",
    "g"."category",
    "g"."quantity_available",
    "g"."last_rented_at",
    "count"("r"."id") AS "reservation_count",
    "sum"("r"."amount_total_cents") AS "revenue_cents"
   FROM ("public"."gear_items_legacy" "g"
     LEFT JOIN "public"."reservations" "r" ON ((("r"."gear_id" = "g"."id") AND ("r"."status" = ANY (ARRAY['completed'::"text", 'active'::"text"])))))
  WHERE (("g"."provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
           FROM "public"."user_provider_memberships"
          WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))
  GROUP BY "g"."id", "g"."name", "g"."provider_id", "g"."category", "g"."quantity_available", "g"."last_rented_at";


ALTER TABLE "public"."analytics_provider_item_performance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asset_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "p_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "old_status" "text",
    "new_status" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "actor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."asset_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "asset_tag" "text" NOT NULL,
    "serial_number" "text",
    "status" "public"."asset_status_type" DEFAULT 'available'::"public"."asset_status_type",
    "condition_score" smallint DEFAULT 100,
    "condition_note" "text",
    "location" "text" DEFAULT 'Warehouse'::"text",
    "purchase_date" "date",
    "purchase_price_cents" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "deleted_at" timestamp with time zone,
    "external_key" "text",
    CONSTRAINT "assets_status_check" CHECK (("status" = ANY (ARRAY['available'::"public"."asset_status_type", 'active'::"public"."asset_status_type", 'maintenance'::"public"."asset_status_type", 'retired'::"public"."asset_status_type", 'lost'::"public"."asset_status_type"])))
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" character varying(255) NOT NULL,
    "resource_id" character varying(255) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cron_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cron_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "duration_ms" integer,
    "error_message" "text",
    "metadata" "jsonb",
    CONSTRAINT "cron_runs_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'success'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."cron_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "data" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "account_id" "uuid",
    "is_contact_person" boolean DEFAULT false,
    "full_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "consents" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "risk_status" "public"."customer_risk_status" DEFAULT 'safe'::"public"."customer_risk_status",
    "risk_notes" "text",
    "lifetime_value_cents" bigint DEFAULT 0,
    "completed_rentals_count" integer DEFAULT 0
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."featured_gear" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "provider" "text",
    "price" numeric,
    "rating" numeric,
    "reviews" integer,
    "image_url" "text",
    "is_new" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."featured_gear" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gear_availability_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gear_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "gear_availability_blocks_check" CHECK (("end_date" >= "start_date"))
);

ALTER TABLE ONLY "public"."gear_availability_blocks" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."gear_availability_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gear_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gear_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);

ALTER TABLE ONLY "public"."gear_images" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."gear_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sku" "text",
    "attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "price_override_cents" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "is_active" boolean DEFAULT true,
    "buffer_minutes" integer DEFAULT 1440,
    "deleted_at" timestamp with time zone,
    "external_key" "text"
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "base_price_cents" integer,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "is_active" boolean DEFAULT true,
    "deleted_at" timestamp with time zone,
    "external_key" "text",
    CONSTRAINT "products_price_check" CHECK (("base_price_cents" >= 0))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."gear_items" WITH ("security_invoker"='true') AS
 SELECT "pv"."id",
    ((("p"."name" || ' ('::"text") || "pv"."name") || ')'::"text") AS "name",
    "p"."description",
    (("p"."base_price_cents")::numeric / (100)::numeric) AS "price_per_day",
    "p"."image_url",
    'Prague'::"text" AS "location",
    5.0 AS "rating",
    "p"."provider_id",
    "pv"."created_at",
    "p"."category",
    NULL::"public"."geography" AS "geom",
    "p"."is_active" AS "active",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."assets" "a"
          WHERE (("a"."variant_id" = "pv"."id") AND ("a"."status" <> 'retired'::"public"."asset_status_type"))) AS "quantity_total",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."assets" "a"
          WHERE (("a"."variant_id" = "pv"."id") AND ("a"."status" = 'available'::"public"."asset_status_type"))) AS "quantity_available",
    'available'::"text" AS "item_state",
    "pv"."sku",
    'good'::"text" AS "condition",
    ''::"text" AS "notes",
    NULL::"date" AS "last_serviced",
    "pv"."created_at" AS "updated_at",
    NULL::timestamp with time zone AS "last_rented_at"
   FROM ("public"."product_variants" "pv"
     JOIN "public"."products" "p" ON (("p"."id" = "pv"."product_id")));


ALTER TABLE "public"."gear_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "type" "public"."maintenance_type" NOT NULL,
    "priority" "public"."maintenance_priority" DEFAULT 'normal'::"public"."maintenance_priority",
    "status" "text" DEFAULT 'open'::"text",
    "notes" "text",
    "cost_cents" integer,
    "created_by" "uuid",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."maintenance_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_resets" (
    "user_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "role" "text",
    "revoked_at" timestamp with time zone DEFAULT "now"(),
    "reason" "text"
);


ALTER TABLE "public"."membership_resets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid",
    "provider_id" "uuid",
    "type" "public"."notification_type" NOT NULL,
    "status" "public"."notification_status" DEFAULT 'pending'::"public"."notification_status",
    "recipient_email" "text",
    "subject" "text",
    "content_preview" "text",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "error_message" "text",
    "meta_data" "jsonb"
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "provider_payment_id" "text",
    "status" "text" NOT NULL,
    "raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "payments_provider_check" CHECK (("provider" = ANY (ARRAY['offline'::"text", 'stripe'::"text", 'gopay'::"text", 'comgate'::"text", 'adyen'::"text"]))),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['created'::"text", 'succeeded'::"text", 'failed'::"text", 'refunded'::"text"])))
);

ALTER TABLE ONLY "public"."payments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'customer'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_verified" boolean DEFAULT false,
    "is_admin" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'provider'::"text", 'admin'::"text"])))
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "provider_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'staff'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."provider_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."providers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "rental_name" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "website" "text",
    "company_id" "text",
    "location" "text",
    "category" "text",
    "availability_notes" "text",
    "logo_url" "text",
    "status" "text" DEFAULT 'approved'::"text",
    "created_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "verified" boolean DEFAULT true NOT NULL,
    "approved_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "country" "text",
    "time_zone" "text" DEFAULT 'Europe/Prague'::"text" NOT NULL,
    "name" "text",
    "address" "text",
    "contact_person" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "onboarding_completed" boolean DEFAULT false,
    "onboarding_step" integer DEFAULT 0,
    "business_hours" "jsonb" DEFAULT '{"friday": {"open": "09:00", "close": "17:00"}, "monday": {"open": "09:00", "close": "17:00"}, "sunday": null, "tuesday": {"open": "09:00", "close": "17:00"}, "saturday": {"open": "09:00", "close": "17:00"}, "thursday": {"open": "09:00", "close": "17:00"}, "wednesday": {"open": "09:00", "close": "17:00"}}'::"jsonb",
    "currency" "text" DEFAULT 'CZK'::"text",
    "seasonal_mode" boolean DEFAULT false,
    "current_season" "text" DEFAULT 'all-year'::"text",
    "tax_id" "text",
    "terms_text" "text",
    "external_key" "text"
);

ALTER TABLE ONLY "public"."providers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "returned_at" timestamp with time zone,
    "checked_out_by" "uuid",
    "checked_in_by" "uuid",
    "condition_out_score" smallint,
    "condition_in_score" smallint,
    "condition_note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."reservation_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "product_variant_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "price_per_item_cents" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."reservation_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."return_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "damage_reports" "jsonb" DEFAULT '[]'::"jsonb",
    "photo_paths" "text"[] DEFAULT '{}'::"text"[],
    "notes" "text",
    "photo_evidence" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."return_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rpc_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rpc_name" "text" NOT NULL,
    "duration_ms" integer,
    "success" boolean DEFAULT true,
    "error_details" "text",
    "params" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rpc_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_profile_resets" (
    "user_id" "uuid" NOT NULL,
    "old_role" "text",
    "old_is_admin" boolean,
    "old_is_verified" boolean,
    "reset_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."security_profile_resets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "revoked_at" timestamp with time zone
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_rate_limits"
    ADD CONSTRAINT "admin_rate_limits_pkey" PRIMARY KEY ("admin_id");



ALTER TABLE ONLY "public"."asset_events"
    ADD CONSTRAINT "asset_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_provider_id_asset_tag_key" UNIQUE ("provider_id", "asset_tag");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_provider_tag_key" UNIQUE ("provider_id", "asset_tag");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cron_runs"
    ADD CONSTRAINT "cron_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_events"
    ADD CONSTRAINT "customer_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."featured_gear"
    ADD CONSTRAINT "featured_gear_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gear_availability_blocks"
    ADD CONSTRAINT "gear_availability_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gear_images"
    ADD CONSTRAINT "gear_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gear_items_legacy"
    ADD CONSTRAINT "gear_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_log"
    ADD CONSTRAINT "maintenance_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_resets"
    ADD CONSTRAINT "membership_resets_pkey" PRIMARY KEY ("user_id", "provider_id");



ALTER TABLE ONLY "public"."reservation_assignments"
    ADD CONSTRAINT "no_overlapping_assignments" EXCLUDE USING "gist" ("asset_id" WITH =, "tstzrange"("assigned_at", COALESCE("returned_at", 'infinity'::timestamp with time zone), '[)'::"text") WITH &&);



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_name_unique" UNIQUE ("product_id", "name");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_provider_name_unique" UNIQUE ("provider_id", "name");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."provider_members"
    ADD CONSTRAINT "provider_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_members"
    ADD CONSTRAINT "provider_members_provider_id_user_id_key" UNIQUE ("provider_id", "user_id");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_assignments"
    ADD CONSTRAINT "reservation_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_lines"
    ADD CONSTRAINT "reservation_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_no_overlap_gear" EXCLUDE USING "gist" ("gear_id" WITH =, "daterange"("start_date", "end_date", '[)'::"text") WITH &&) WHERE ((("status" = ANY (ARRAY['hold'::"text", 'confirmed'::"text", 'active'::"text"])) AND ("deleted_at" IS NULL) AND ("product_variant_id" IS NULL) AND ("gear_id" IS NOT NULL)));



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_no_overlap_variant" EXCLUDE USING "gist" ("product_variant_id" WITH =, "daterange"("start_date", "end_date", '[)'::"text") WITH &&) WHERE ((("status" = ANY (ARRAY['hold'::"text", 'confirmed'::"text", 'active'::"text"])) AND ("deleted_at" IS NULL) AND ("product_variant_id" IS NOT NULL)));



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_reports"
    ADD CONSTRAINT "return_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rpc_logs"
    ADD CONSTRAINT "rpc_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_profile_resets"
    ADD CONSTRAINT "security_profile_resets_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_provider_memberships"
    ADD CONSTRAINT "user_provider_memberships_user_id_provider_id_key" UNIQUE ("user_id", "provider_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE UNIQUE INDEX "assets_external_key_provider_key" ON "public"."assets" USING "btree" ("provider_id", "external_key");



CREATE INDEX "cron_runs_name_started_at_idx" ON "public"."cron_runs" USING "btree" ("cron_name", "started_at" DESC);



CREATE UNIQUE INDEX "gear_images_unique_order_idx" ON "public"."gear_images" USING "btree" ("gear_id", "sort_order");



CREATE INDEX "gear_items_description_trgm_idx" ON "public"."gear_items_legacy" USING "gin" ("description" "public"."gin_trgm_ops");



CREATE INDEX "gear_items_geom_idx" ON "public"."gear_items_legacy" USING "gist" ("geom");



CREATE INDEX "gear_items_name_trgm_idx" ON "public"."gear_items_legacy" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_admin_audit_logs_admin_id_created" ON "public"."admin_audit_logs" USING "btree" ("admin_id", "created_at" DESC);



CREATE INDEX "idx_admin_audit_logs_target" ON "public"."admin_audit_logs" USING "btree" ("target_type", "target_id", "created_at" DESC);



CREATE INDEX "idx_admin_rate_limits_window" ON "public"."admin_rate_limits" USING "btree" ("window_start");



CREATE INDEX "idx_assets_deleted_at" ON "public"."assets" USING "btree" ("deleted_at");



CREATE INDEX "idx_assets_status" ON "public"."assets" USING "btree" ("status");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_provider_date" ON "public"."audit_logs" USING "btree" ("provider_id", "created_at" DESC);



CREATE INDEX "idx_customers_account" ON "public"."customers" USING "btree" ("account_id");



CREATE INDEX "idx_customers_provider_email" ON "public"."customers" USING "btree" ("provider_id", "email");



CREATE INDEX "idx_customers_provider_phone" ON "public"."customers" USING "btree" ("provider_id", "phone");



CREATE INDEX "idx_customers_risk_status" ON "public"."customers" USING "btree" ("risk_status");



CREATE INDEX "idx_events_customer" ON "public"."customer_events" USING "btree" ("customer_id");



CREATE INDEX "idx_gear_availability_blocks_gear_id" ON "public"."gear_availability_blocks" USING "btree" ("gear_id");



CREATE INDEX "idx_gear_images_gear_id" ON "public"."gear_images" USING "btree" ("gear_id");



CREATE INDEX "idx_notification_logs_provider" ON "public"."notification_logs" USING "btree" ("provider_id");



CREATE INDEX "idx_notification_logs_reservation" ON "public"."notification_logs" USING "btree" ("reservation_id");



CREATE INDEX "idx_payments_provider_id" ON "public"."payments" USING "btree" ("provider_id");



CREATE INDEX "idx_payments_reservation_id" ON "public"."payments" USING "btree" ("reservation_id");



CREATE INDEX "idx_products_deleted_at" ON "public"."products" USING "btree" ("deleted_at");



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_providers_user_id" ON "public"."providers" USING "btree" ("user_id");



CREATE INDEX "idx_reservation_assignments_active" ON "public"."reservation_assignments" USING "btree" ("reservation_id") WHERE ("returned_at" IS NULL);



CREATE INDEX "idx_reservation_assignments_asset_id" ON "public"."reservation_assignments" USING "btree" ("asset_id");



CREATE INDEX "idx_reservation_assignments_reservation_id" ON "public"."reservation_assignments" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservation_availability" ON "public"."reservations" USING "btree" ("gear_id", "status", "start_date", "end_date") WHERE ("status" = ANY (ARRAY['confirmed'::"text", 'active'::"text"]));



CREATE INDEX "idx_reservation_created" ON "public"."reservations" USING "btree" ("created_at");



CREATE INDEX "idx_reservation_customer" ON "public"."reservations" USING "btree" ("customer_name");



CREATE INDEX "idx_reservation_dates" ON "public"."reservations" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_reservation_gear" ON "public"."reservations" USING "btree" ("gear_id");



CREATE INDEX "idx_reservation_lines_reservation_id" ON "public"."reservation_lines" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservation_provider" ON "public"."reservations" USING "btree" ("provider_id");



CREATE INDEX "idx_reservation_status" ON "public"."reservations" USING "btree" ("status");



CREATE INDEX "idx_reservations_active_hold" ON "public"."reservations" USING "btree" ("gear_id", "start_date", "end_date") WHERE ("status" = ANY (ARRAY['hold'::"text", 'confirmed'::"text", 'active'::"text"]));



CREATE INDEX "idx_reservations_crm_customer" ON "public"."reservations" USING "btree" ("crm_customer_id");



CREATE INDEX "idx_reservations_deleted_at" ON "public"."reservations" USING "btree" ("deleted_at");



CREATE INDEX "idx_reservations_gear_id" ON "public"."reservations" USING "btree" ("gear_id");



CREATE INDEX "idx_reservations_product_variant_id" ON "public"."reservations" USING "btree" ("product_variant_id");



CREATE INDEX "idx_reservations_provider_id" ON "public"."reservations" USING "btree" ("provider_id");



CREATE INDEX "idx_reservations_provider_status_dates" ON "public"."reservations" USING "btree" ("provider_id", "status", "start_date" DESC);



CREATE UNIQUE INDEX "idx_unique_active_assignment" ON "public"."reservation_assignments" USING "btree" ("asset_id") WHERE ("returned_at" IS NULL);



CREATE INDEX "idx_upm_provider" ON "public"."user_provider_memberships" USING "btree" ("provider_id");



CREATE INDEX "idx_variants_deleted_at" ON "public"."product_variants" USING "btree" ("deleted_at");



CREATE UNIQUE INDEX "product_variants_external_key_product_key" ON "public"."product_variants" USING "btree" ("product_id", "external_key");



CREATE UNIQUE INDEX "products_external_key_provider_key" ON "public"."products" USING "btree" ("provider_id", "external_key");



CREATE INDEX "providers_country_idx" ON "public"."providers" USING "btree" ("country");



CREATE UNIQUE INDEX "providers_external_key_key" ON "public"."providers" USING "btree" ("external_key");



CREATE INDEX "providers_verified_idx" ON "public"."providers" USING "btree" ("verified", "approved_at");



CREATE INDEX "reservations_customer_idx" ON "public"."reservations" USING "btree" ("customer_id");



CREATE UNIQUE INDEX "reservations_external_key_provider_key" ON "public"."reservations" USING "btree" ("provider_id", "external_key");



CREATE INDEX "reservations_gear_date_idx" ON "public"."reservations" USING "btree" ("gear_id", "start_date", "end_date", "status");



CREATE INDEX "reservations_provider_idx" ON "public"."reservations" USING "btree" ("provider_id");



CREATE UNIQUE INDEX "user_provider_memberships_external_key_key" ON "public"."user_provider_memberships" USING "btree" ("external_key");



CREATE OR REPLACE TRIGGER "enforce_pricing_consistency" BEFORE INSERT OR UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."check_reservation_pricing_consistency"();



CREATE OR REPLACE TRIGGER "gear_items_set_updated_at" BEFORE UPDATE ON "public"."gear_items_legacy" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_updated_at_accounts" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_updated_at_customers" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "payments_set_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "providers_set_updated_at" BEFORE UPDATE ON "public"."providers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "reservations_set_updated_at" BEFORE UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tr_log_reservation_changes" AFTER UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."log_reservation_changes"();



CREATE OR REPLACE TRIGGER "trg_check_asset_provider" BEFORE INSERT OR UPDATE OF "variant_id", "provider_id" ON "public"."assets" FOR EACH ROW EXECUTE FUNCTION "public"."check_asset_provider_consistency"();



CREATE OR REPLACE TRIGGER "trg_overbooking_guard" BEFORE INSERT OR UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."check_overbooking_guard"();



CREATE OR REPLACE TRIGGER "trigger_send_confirmation" AFTER INSERT OR UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_reservation_confirmation"();



CREATE OR REPLACE TRIGGER "trigger_update_customer_trust" AFTER UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."update_customer_stats"();



CREATE OR REPLACE TRIGGER "update_gear_items_updated_at" BEFORE UPDATE ON "public"."gear_items_legacy" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reservation_updated_at" BEFORE UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_rate_limits"
    ADD CONSTRAINT "admin_rate_limits_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_events"
    ADD CONSTRAINT "asset_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."asset_events"
    ADD CONSTRAINT "asset_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_events"
    ADD CONSTRAINT "asset_events_p_id_fkey" FOREIGN KEY ("p_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_events"
    ADD CONSTRAINT "customer_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_events"
    ADD CONSTRAINT "customer_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_events"
    ADD CONSTRAINT "customer_events_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gear_availability_blocks"
    ADD CONSTRAINT "gear_availability_blocks_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear_items_legacy"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gear_images"
    ADD CONSTRAINT "gear_images_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear_items_legacy"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_log"
    ADD CONSTRAINT "maintenance_log_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_log"
    ADD CONSTRAINT "maintenance_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."maintenance_log"
    ADD CONSTRAINT "maintenance_log_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_members"
    ADD CONSTRAINT "provider_members_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_members"
    ADD CONSTRAINT "provider_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_assignments"
    ADD CONSTRAINT "reservation_assignments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_assignments"
    ADD CONSTRAINT "reservation_assignments_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reservation_assignments"
    ADD CONSTRAINT "reservation_assignments_checked_out_by_fkey" FOREIGN KEY ("checked_out_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reservation_assignments"
    ADD CONSTRAINT "reservation_assignments_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_lines"
    ADD CONSTRAINT "reservation_lines_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."reservation_lines"
    ADD CONSTRAINT "reservation_lines_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_crm_customer_id_fkey" FOREIGN KEY ("crm_customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear_items_legacy"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_reports"
    ADD CONSTRAINT "return_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."return_reports"
    ADD CONSTRAINT "return_reports_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id");



ALTER TABLE ONLY "public"."return_reports"
    ADD CONSTRAINT "return_reports_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id");



ALTER TABLE ONLY "public"."user_provider_memberships"
    ADD CONSTRAINT "user_provider_memberships_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_provider_memberships"
    ADD CONSTRAINT "user_provider_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage roles" ON "public"."user_roles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all providers" ON "public"."providers" FOR SELECT TO "authenticated" USING ("public"."is_admin_trusted"());



CREATE POLICY "Allow provider owner to DELETE their data" ON "public"."providers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow provider owner to INSERT their data" ON "public"."providers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow provider owner to SELECT their data" ON "public"."providers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow provider owner to UPDATE their data" ON "public"."providers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Anyone can view gear images" ON "public"."gear_images" FOR SELECT USING (true);



CREATE POLICY "Assets: Provider Delete" ON "public"."assets" FOR DELETE USING (((( SELECT "profiles"."is_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = true) OR ("public"."get_my_role"("provider_id") = 'owner'::"text")));



CREATE POLICY "Assets: Provider Read" ON "public"."assets" FOR SELECT USING ((("deleted_at" IS NULL) AND (("provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
   FROM "public"."user_provider_memberships"
  WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))) OR (( SELECT "profiles"."is_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = true) OR ("public"."get_my_role"("provider_id") IS NOT NULL))));



CREATE POLICY "Assets: Provider Update" ON "public"."assets" FOR UPDATE USING ((("provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
   FROM "public"."user_provider_memberships"
  WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))) OR (( SELECT "profiles"."is_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = true) OR ("public"."get_my_role"("provider_id") = ANY (ARRAY['owner'::"text", 'staff'::"text"]))));



CREATE POLICY "Assets: Provider Write" ON "public"."assets" FOR INSERT WITH CHECK ((("provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
   FROM "public"."user_provider_memberships"
  WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))) OR (( SELECT "profiles"."is_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = true) OR ("public"."get_my_role"("provider_id") = ANY (ARRAY['owner'::"text", 'staff'::"text"]))));



CREATE POLICY "Authenticated users can insert" ON "public"."gear_items_legacy" FOR INSERT WITH CHECK (("auth"."uid"() = "provider_id"));



CREATE POLICY "Members see own membership" ON "public"."provider_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Owners can view their own provider" ON "public"."providers" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Owners manage members" ON "public"."provider_members" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."provider_members" "pm"
  WHERE (("pm"."provider_id" = "provider_members"."provider_id") AND ("pm"."user_id" = "auth"."uid"()) AND ("pm"."role" = 'owner'::"text")))));



CREATE POLICY "Products: Provider Write" ON "public"."products" USING ((("provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
   FROM "public"."user_provider_memberships"
  WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))) OR (( SELECT "profiles"."is_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = true)));



CREATE POLICY "Products: Public Read" ON "public"."products" FOR SELECT USING (("deleted_at" IS NULL));



CREATE POLICY "Provider can delete own gear" ON "public"."gear_items_legacy" FOR DELETE USING (("auth"."uid"() = "provider_id"));



CREATE POLICY "Provider can update own gear" ON "public"."gear_items_legacy" FOR UPDATE USING (("auth"."uid"() = "provider_id"));



CREATE POLICY "Providers can create reservations" ON "public"."reservations" FOR INSERT WITH CHECK (("provider_id" IN ( SELECT "providers"."id"
   FROM "public"."providers"
  WHERE ("providers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can insert audit logs" ON "public"."audit_logs" FOR INSERT WITH CHECK (("provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
   FROM "public"."user_provider_memberships"
  WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can insert events" ON "public"."customer_events" FOR INSERT WITH CHECK (("provider_id" IN ( SELECT "providers"."id"
   FROM "public"."providers"
  WHERE ("providers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can insert own reservations" ON "public"."reservations" FOR INSERT WITH CHECK (("provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
   FROM "public"."user_provider_memberships"
  WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can manage own accounts" ON "public"."accounts" USING (("provider_id" IN ( SELECT "providers"."id"
   FROM "public"."providers"
  WHERE ("providers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can manage own customers" ON "public"."customers" USING (("provider_id" IN ( SELECT "providers"."id"
   FROM "public"."providers"
  WHERE ("providers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can manage own gear images" ON "public"."gear_images" USING (("gear_id" IN ( SELECT "gi"."id"
   FROM ("public"."gear_items_legacy" "gi"
     JOIN "public"."providers" "p" ON (("gi"."provider_id" = "p"."id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can update own onboarding status" ON "public"."providers" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Providers can update own reservations" ON "public"."reservations" FOR UPDATE USING (("provider_id" IN ( SELECT "providers"."id"
   FROM "public"."providers"
  WHERE ("providers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can view events" ON "public"."customer_events" FOR SELECT USING (("provider_id" IN ( SELECT "providers"."id"
   FROM "public"."providers"
  WHERE ("providers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can view own accounts" ON "public"."accounts" FOR SELECT USING (("provider_id" IN ( SELECT "providers"."id"
   FROM "public"."providers"
  WHERE ("providers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can view own audit logs" ON "public"."audit_logs" FOR SELECT USING (("provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
   FROM "public"."user_provider_memberships"
  WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can view own customers" ON "public"."customers" FOR SELECT USING (("provider_id" IN ( SELECT "providers"."id"
   FROM "public"."providers"
  WHERE ("providers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers: Insert own record" ON "public"."providers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Providers: Read own record" ON "public"."providers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Providers: Update own record" ON "public"."providers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Public can view approved providers" ON "public"."providers" FOR SELECT TO "authenticated", "anon" USING ((("status" = 'approved'::"text") AND ("verified" = true)));



CREATE POLICY "Public read access" ON "public"."gear_items_legacy" FOR SELECT USING (true);



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Variants: Provider Write" ON "public"."product_variants" USING ((("product_id" IN ( SELECT "products"."id"
   FROM "public"."products"
  WHERE ("products"."provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
           FROM "public"."user_provider_memberships"
          WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))))) OR (( SELECT "profiles"."is_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = true)));



CREATE POLICY "Variants: Public Read" ON "public"."product_variants" FOR SELECT USING (("deleted_at" IS NULL));



CREATE POLICY "Verified Providers can insert their own gear." ON "public"."gear_items_legacy" FOR INSERT WITH CHECK ((("auth"."uid"() = "provider_id") AND (( SELECT "profiles"."is_verified"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = true)));



CREATE POLICY "Verified Providers can insert their own reservations." ON "public"."reservations" FOR INSERT WITH CHECK ((("auth"."uid"() = "provider_id") AND (( SELECT "profiles"."is_verified"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = true)));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_logs_select_admin" ON "public"."admin_audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."admin_rate_limits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow public read" ON "public"."featured_gear" FOR SELECT USING (true);



ALTER TABLE "public"."asset_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assignments_customer_read" ON "public"."reservation_assignments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."reservations" "r"
  WHERE (("r"."id" = "reservation_assignments"."reservation_id") AND ("r"."user_id" = "auth"."uid"())))));



CREATE POLICY "assignments_member_access" ON "public"."reservation_assignments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."reservations" "r"
  WHERE (("r"."id" = "reservation_assignments"."reservation_id") AND ("r"."deleted_at" IS NULL) AND ("public"."is_admin_trusted"() OR (EXISTS ( SELECT 1
           FROM "public"."provider_members" "pm"
          WHERE (("pm"."provider_id" = "r"."provider_id") AND ("pm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."providers" "p"
          WHERE (("p"."id" = "r"."provider_id") AND ("p"."user_id" = "auth"."uid"()))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."reservations" "r"
  WHERE (("r"."id" = "reservation_assignments"."reservation_id") AND ("r"."deleted_at" IS NULL) AND ("public"."is_admin_trusted"() OR (EXISTS ( SELECT 1
           FROM "public"."provider_members" "pm"
          WHERE (("pm"."provider_id" = "r"."provider_id") AND ("pm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."providers" "p"
          WHERE (("p"."id" = "r"."provider_id") AND ("p"."user_id" = "auth"."uid"())))))))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "availability_admin_all" ON "public"."gear_availability_blocks" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "availability_owner_all" ON "public"."gear_availability_blocks" USING ((EXISTS ( SELECT 1
   FROM ("public"."gear_items_legacy" "gi"
     JOIN "public"."providers" "p" ON (("p"."id" = "gi"."provider_id")))
  WHERE (("gi"."id" = "gear_availability_blocks"."gear_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."gear_items_legacy" "gi"
     JOIN "public"."providers" "p" ON (("p"."id" = "gi"."provider_id")))
  WHERE (("gi"."id" = "gear_availability_blocks"."gear_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."cron_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cron_runs_insert_service" ON "public"."cron_runs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "cron_runs_select_admin_trusted" ON "public"."cron_runs" FOR SELECT TO "authenticated" USING ("public"."is_admin_trusted"());



CREATE POLICY "cron_runs_select_service" ON "public"."cron_runs" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "cron_runs_update_service" ON "public"."cron_runs" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."customer_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."featured_gear" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gear_all_admin" ON "public"."gear_items_legacy" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."gear_availability_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gear_delete_provider_member" ON "public"."gear_items_legacy" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "gear_items_legacy"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "m"."provider_id") AND ("m"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."gear_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gear_images_admin_all" ON "public"."gear_images" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "gear_images_owner_all" ON "public"."gear_images" USING ((EXISTS ( SELECT 1
   FROM ("public"."gear_items_legacy" "gi"
     JOIN "public"."providers" "p" ON (("p"."id" = "gi"."provider_id")))
  WHERE (("gi"."id" = "gear_images"."gear_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."gear_items_legacy" "gi"
     JOIN "public"."providers" "p" ON (("p"."id" = "gi"."provider_id")))
  WHERE (("gi"."id" = "gear_images"."gear_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "gear_images_public_select" ON "public"."gear_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."gear_items_legacy" "gi"
     JOIN "public"."providers" "p" ON (("p"."id" = "gi"."provider_id")))
  WHERE (("gi"."id" = "gear_images"."gear_id") AND ("gi"."active" = true) AND ("p"."verified" = true) AND ("p"."approved_at" IS NOT NULL) AND ("p"."deleted_at" IS NULL)))));



CREATE POLICY "gear_insert_provider_member" ON "public"."gear_items_legacy" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "gear_items_legacy"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "m"."provider_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "gear_items_admin_all" ON "public"."gear_items_legacy" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."gear_items_legacy" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gear_items_owner_delete" ON "public"."gear_items_legacy" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items_legacy"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "gear_items_owner_insert" ON "public"."gear_items_legacy" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items_legacy"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "gear_items_owner_select" ON "public"."gear_items_legacy" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items_legacy"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "gear_items_owner_update" ON "public"."gear_items_legacy" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items_legacy"."provider_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items_legacy"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "gear_items_public_select" ON "public"."gear_items_legacy" FOR SELECT USING ((("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items_legacy"."provider_id") AND ("p"."verified" = true) AND ("p"."approved_at" IS NOT NULL) AND ("p"."deleted_at" IS NULL))))));



CREATE POLICY "gear_select_provider_member" ON "public"."gear_items_legacy" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "gear_items_legacy"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "m"."provider_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "gear_select_public" ON "public"."gear_items_legacy" FOR SELECT USING ((("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items_legacy"."provider_id") AND ("p"."verified" = true))))));



CREATE POLICY "gear_update_provider_member" ON "public"."gear_items_legacy" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "gear_items_legacy"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "m"."provider_id") AND ("m"."user_id" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "gear_items_legacy"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "m"."provider_id") AND ("m"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."maintenance_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "membership_delete_admin" ON "public"."user_provider_memberships" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "membership_delete_own" ON "public"."user_provider_memberships" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "membership_insert_admin" ON "public"."user_provider_memberships" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "membership_manage_owner_or_admin" ON "public"."user_provider_memberships" TO "authenticated" USING (("public"."is_admin_trusted"() OR (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "user_provider_memberships"."provider_id") AND ("p"."user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin_trusted"() OR (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "user_provider_memberships"."provider_id") AND ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "membership_manage_service" ON "public"."user_provider_memberships" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."membership_resets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "membership_resets_insert_service" ON "public"."membership_resets" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "membership_resets_select_admin" ON "public"."membership_resets" FOR SELECT TO "authenticated" USING ("public"."is_admin_trusted"());



CREATE POLICY "membership_select_admin" ON "public"."user_provider_memberships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "membership_select_own" ON "public"."user_provider_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "membership_select_self" ON "public"."user_provider_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "membership_update_admin" ON "public"."user_provider_memberships" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "membership_update_own" ON "public"."user_provider_memberships" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_admin_all" ON "public"."payments" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "payments_provider_select" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "payments"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_admin_trusted" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin_trusted"());



CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_update_admin_trusted" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin_trusted"()) WITH CHECK ("public"."is_admin_trusted"());



CREATE POLICY "profiles_update_self_nonprivileged" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND ("role" = ( SELECT "p"."role"
   FROM "public"."profiles" "p"
  WHERE ("p"."user_id" = "auth"."uid"()))) AND (COALESCE("is_admin", false) = COALESCE(( SELECT "p"."is_admin"
   FROM "public"."profiles" "p"
  WHERE ("p"."user_id" = "auth"."uid"())), false)) AND (COALESCE("is_verified", false) = COALESCE(( SELECT "p"."is_verified"
   FROM "public"."profiles" "p"
  WHERE ("p"."user_id" = "auth"."uid"())), false))));



CREATE POLICY "provider_delete_admin" ON "public"."providers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "provider_delete_owner" ON "public"."providers" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "provider_insert_admin" ON "public"."providers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "provider_insert_owner" ON "public"."providers" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."provider_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_select_admin" ON "public"."providers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "provider_select_member" ON "public"."providers" FOR SELECT TO "authenticated" USING ("public"."check_is_member_safe"("id", "auth"."uid"()));



CREATE POLICY "provider_select_owner" ON "public"."providers" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "provider_select_public" ON "public"."providers" FOR SELECT USING (("verified" = true));



CREATE POLICY "provider_update_admin" ON "public"."providers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "provider_update_member_owner" ON "public"."providers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "providers"."id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = 'owner'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "providers"."id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = 'owner'::"text")))));



CREATE POLICY "provider_update_owner" ON "public"."providers" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."providers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "providers_admin_all" ON "public"."providers" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "providers_owner_delete" ON "public"."providers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "providers_owner_insert" ON "public"."providers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "providers_owner_modify" ON "public"."providers" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "providers_owner_select" ON "public"."providers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "providers_public_select" ON "public"."providers" FOR SELECT USING ((("verified" = true) AND ("approved_at" IS NOT NULL) AND ("deleted_at" IS NULL)));



CREATE POLICY "reservation_all_admin" ON "public"."reservations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."reservation_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reservation_lines_customer_read" ON "public"."reservation_lines" FOR SELECT USING (("reservation_id" IN ( SELECT "reservations"."id"
   FROM "public"."reservations"
  WHERE ("reservations"."user_id" = "auth"."uid"()))));



CREATE POLICY "reservation_lines_provider_access" ON "public"."reservation_lines" USING ((("reservation_id" IN ( SELECT "reservations"."id"
   FROM "public"."reservations"
  WHERE ("reservations"."provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
           FROM "public"."user_provider_memberships"
          WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))))) OR "public"."is_admin"())) WITH CHECK ((("reservation_id" IN ( SELECT "reservations"."id"
   FROM "public"."reservations"
  WHERE ("reservations"."provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
           FROM "public"."user_provider_memberships"
          WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))))) OR "public"."is_admin"()));



CREATE POLICY "reservation_select_customer" ON "public"."reservations" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reservations_admin_all" ON "public"."reservations" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "reservations_admin_select" ON "public"."reservations" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "reservations_customer_select" ON "public"."reservations" FOR SELECT USING (("customer_id" = "auth"."uid"()));



CREATE POLICY "reservations_customer_update" ON "public"."reservations" FOR UPDATE USING (("customer_id" = "auth"."uid"())) WITH CHECK ((("customer_id" = "auth"."uid"()) AND ("status" = ANY (ARRAY['pending'::"text", 'cancelled'::"text"]))));



CREATE POLICY "reservations_insert_member" ON "public"."reservations" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin_trusted"() OR (EXISTS ( SELECT 1
   FROM "public"."provider_members" "pm"
  WHERE (("pm"."provider_id" = "pm"."provider_id") AND ("pm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "reservations"."provider_id") AND ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "reservations_provider_select" ON "public"."reservations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "reservations"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "reservations_provider_update" ON "public"."reservations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "reservations"."provider_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "reservations"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "reservations_select_member" ON "public"."reservations" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("public"."is_admin_trusted"() OR (EXISTS ( SELECT 1
   FROM "public"."provider_members" "pm"
  WHERE (("pm"."provider_id" = "reservations"."provider_id") AND ("pm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "reservations"."provider_id") AND ("p"."user_id" = "auth"."uid"())))))));



CREATE POLICY "reservations_update_member" ON "public"."reservations" FOR UPDATE TO "authenticated" USING (("public"."is_admin_trusted"() OR (EXISTS ( SELECT 1
   FROM "public"."provider_members" "pm"
  WHERE (("pm"."provider_id" = "reservations"."provider_id") AND ("pm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "reservations"."provider_id") AND ("p"."user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin_trusted"() OR (EXISTS ( SELECT 1
   FROM "public"."provider_members" "pm"
  WHERE (("pm"."provider_id" = "reservations"."provider_id") AND ("pm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "reservations"."provider_id") AND ("p"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."return_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "return_reports_member_select" ON "public"."return_reports" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."provider_members" "pm"
  WHERE (("pm"."provider_id" = "return_reports"."provider_id") AND ("pm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "return_reports"."provider_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin_trusted"()));



CREATE POLICY "return_reports_member_update" ON "public"."return_reports" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."provider_members" "pm"
  WHERE (("pm"."provider_id" = "return_reports"."provider_id") AND ("pm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "return_reports"."provider_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin_trusted"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."provider_members" "pm"
  WHERE (("pm"."provider_id" = "return_reports"."provider_id") AND ("pm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "return_reports"."provider_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin_trusted"()));



CREATE POLICY "return_reports_member_write" ON "public"."return_reports" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."provider_members" "pm"
  WHERE (("pm"."provider_id" = "return_reports"."provider_id") AND ("pm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "return_reports"."provider_id") AND ("p"."user_id" = "auth"."uid"())))) OR "public"."is_admin_trusted"()));



ALTER TABLE "public"."rpc_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rpc_logs_insert_service" ON "public"."rpc_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "rpc_logs_select_admin_trusted" ON "public"."rpc_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin_trusted"());



CREATE POLICY "rpc_logs_select_service" ON "public"."rpc_logs" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "public"."security_profile_resets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "security_profile_resets_insert_service" ON "public"."security_profile_resets" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "security_profile_resets_select_admin" ON "public"."security_profile_resets" FOR SELECT TO "authenticated" USING ("public"."is_admin_trusted"());



ALTER TABLE "public"."user_provider_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_provider_member"("p_provider_id" "uuid", "p_user_id" "uuid", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_provider_member"("p_provider_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_provider_member"("p_provider_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_provider_member"("p_provider_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_approve_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_approve_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_approve_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_reject_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_reject_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_reject_provider"("p_admin_id" "uuid", "p_target_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_provider"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_provider"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."attach_return_photos"("p_report_id" "uuid", "p_photo_evidence" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."attach_return_photos"("p_report_id" "uuid", "p_photo_evidence" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."attach_return_photos"("p_report_id" "uuid", "p_photo_evidence" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_admin_rate_limit"("p_admin_id" "uuid", "p_limit" integer, "p_window_ms" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_admin_rate_limit"("p_admin_id" "uuid", "p_limit" integer, "p_window_ms" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_admin_rate_limit"("p_admin_id" "uuid", "p_limit" integer, "p_window_ms" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_asset_provider_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_asset_provider_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_asset_provider_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_member_safe"("p_provider_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_member_safe"("p_provider_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_member_safe"("p_provider_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_owner_safe"("p_provider_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_owner_safe"("p_provider_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_owner_safe"("p_provider_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_overbooking_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_overbooking_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_overbooking_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_reservation_pricing_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_reservation_pricing_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_reservation_pricing_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_variant_availability"("p_variant_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."check_variant_availability"("p_variant_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_variant_availability"("p_variant_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_rate_limits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_reservation_holds_sql"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_reservation_holds_sql"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_return_report"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_damage_reports" "jsonb", "p_general_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_return_report"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_damage_reports" "jsonb", "p_general_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_return_report"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_damage_reports" "jsonb", "p_general_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."expire_stale_holds"("retention_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_stale_holds"("retention_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_360"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_360"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_360"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"("limit_provider_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"("limit_provider_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"("limit_provider_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_reservation_confirmation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_reservation_confirmation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_reservation_confirmation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin_trusted"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_trusted"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_trusted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_trusted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_available"("gear_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."is_available"("gear_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_available"("gear_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_available"("p_gear" "uuid", "p_start" "date", "p_end" "date", "p_qty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."is_available"("p_gear" "uuid", "p_start" "date", "p_end" "date", "p_qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_available"("p_gear" "uuid", "p_start" "date", "p_end" "date", "p_qty" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_provider_member"("pid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_provider_member"("pid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_provider_member"("pid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."issue_reservation"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_override" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."issue_reservation"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_override" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."issue_reservation"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_override" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."issue_reservation"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_override" boolean, "p_override_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."issue_reservation"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_override" boolean, "p_override_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_reservation_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_reservation_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_reservation_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mock_send_notification"("p_reservation_id" "uuid", "p_type" "public"."notification_type") TO "anon";
GRANT ALL ON FUNCTION "public"."mock_send_notification"("p_reservation_id" "uuid", "p_type" "public"."notification_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mock_send_notification"("p_reservation_id" "uuid", "p_type" "public"."notification_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_daily_reminders"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_daily_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_daily_reminders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_has_damage" boolean, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_has_damage" boolean, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_has_damage" boolean, "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_damage_reports" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_damage_reports" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_damage_reports" "jsonb", "p_photo_paths" "text"[], "p_general_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_damage_reports" "jsonb", "p_photo_paths" "text"[], "p_general_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_return"("p_reservation_id" "uuid", "p_provider_id" "uuid", "p_user_id" "uuid", "p_damage_reports" "jsonb", "p_photo_paths" "text"[], "p_general_notes" "text") TO "service_role";



GRANT ALL ON TABLE "public"."reservations" TO "anon";
GRANT ALL ON TABLE "public"."reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations" TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_if_available"("p_gear_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_quantity" integer, "p_customer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_if_available"("p_gear_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_quantity" integer, "p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_if_available"("p_gear_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_quantity" integer, "p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_if_available"("p_gear_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_quantity" integer, "p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_customer_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_customer_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_customer_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_gear_last_rented"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_gear_last_rented"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_gear_last_rented"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_crm_customer"("p_full_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text", "p_tags" "text"[], "p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_crm_customer"("p_full_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text", "p_tags" "text"[], "p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_crm_customer"("p_full_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text", "p_tags" "text"[], "p_account_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."gear_items_legacy" TO "anon";
GRANT ALL ON TABLE "public"."gear_items_legacy" TO "authenticated";
GRANT ALL ON TABLE "public"."gear_items_legacy" TO "service_role";



GRANT ALL ON TABLE "public"."user_provider_memberships" TO "anon";
GRANT ALL ON TABLE "public"."user_provider_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."user_provider_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_provider_activity_feed" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_provider_activity_feed" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_provider_category_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_provider_category_revenue" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_provider_daily_utilisation" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_provider_daily_utilisation" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_provider_item_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_provider_item_performance" TO "service_role";



GRANT ALL ON TABLE "public"."asset_events" TO "anon";
GRANT ALL ON TABLE "public"."asset_events" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_events" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cron_runs" TO "anon";
GRANT ALL ON TABLE "public"."cron_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."cron_runs" TO "service_role";



GRANT ALL ON TABLE "public"."customer_events" TO "anon";
GRANT ALL ON TABLE "public"."customer_events" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_events" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."featured_gear" TO "anon";
GRANT ALL ON TABLE "public"."featured_gear" TO "authenticated";
GRANT ALL ON TABLE "public"."featured_gear" TO "service_role";



GRANT ALL ON TABLE "public"."gear_availability_blocks" TO "anon";
GRANT ALL ON TABLE "public"."gear_availability_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."gear_availability_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."gear_images" TO "anon";
GRANT ALL ON TABLE "public"."gear_images" TO "authenticated";
GRANT ALL ON TABLE "public"."gear_images" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."gear_items" TO "service_role";
GRANT SELECT ON TABLE "public"."gear_items" TO "anon";
GRANT SELECT ON TABLE "public"."gear_items" TO "authenticated";



GRANT ALL ON TABLE "public"."maintenance_log" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_log" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_log" TO "service_role";



GRANT ALL ON TABLE "public"."membership_resets" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."membership_resets" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_resets" TO "service_role";



GRANT ALL ON TABLE "public"."notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."provider_members" TO "anon";
GRANT ALL ON TABLE "public"."provider_members" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_members" TO "service_role";



GRANT ALL ON TABLE "public"."providers" TO "anon";
GRANT ALL ON TABLE "public"."providers" TO "authenticated";
GRANT ALL ON TABLE "public"."providers" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_assignments" TO "anon";
GRANT ALL ON TABLE "public"."reservation_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_lines" TO "anon";
GRANT ALL ON TABLE "public"."reservation_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_lines" TO "service_role";



GRANT ALL ON TABLE "public"."return_reports" TO "anon";
GRANT ALL ON TABLE "public"."return_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."return_reports" TO "service_role";



GRANT ALL ON TABLE "public"."rpc_logs" TO "anon";
GRANT ALL ON TABLE "public"."rpc_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."rpc_logs" TO "service_role";



GRANT ALL ON TABLE "public"."security_profile_resets" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."security_profile_resets" TO "authenticated";
GRANT ALL ON TABLE "public"."security_profile_resets" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";







