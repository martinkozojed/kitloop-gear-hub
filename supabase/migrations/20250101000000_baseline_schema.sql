


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

SET search_path TO public;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'customer');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_available"("gear_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gear_id" "uuid" NOT NULL,
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
    CONSTRAINT "check_date_range" CHECK (("end_date" > "start_date")),
    CONSTRAINT "check_reservation_status" CHECK (("status" = ANY (ARRAY['hold'::"text", 'pending'::"text", 'confirmed'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"]))),
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


CREATE OR REPLACE FUNCTION "public"."update_gear_last_rented"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gear_items" (
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
    "quantity_total" integer DEFAULT 1,
    "quantity_available" integer DEFAULT 1,
    "item_state" "text" DEFAULT 'available'::"text",
    "sku" "text",
    "condition" "text" DEFAULT 'good'::"text",
    "notes" "text",
    "last_serviced" "date",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_rented_at" timestamp with time zone,
    CONSTRAINT "gear_items_condition_check" CHECK (("condition" = ANY (ARRAY['new'::"text", 'good'::"text", 'fair'::"text", 'poor'::"text"]))),
    CONSTRAINT "gear_items_item_state_check" CHECK (("item_state" = ANY (ARRAY['available'::"text", 'reserved'::"text", 'maintenance'::"text", 'retired'::"text"])))
);

ALTER TABLE ONLY "public"."gear_items" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."gear_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."analytics_provider_activity_feed" AS
 SELECT "r"."provider_id",
    "r"."id" AS "reservation_id",
    "gi"."name" AS "gear_name",
    "r"."customer_name",
    "r"."status",
    "r"."created_at",
    "r"."updated_at",
    COALESCE(("r"."start_date")::timestamp with time zone, "r"."created_at") AS "start_date",
    "r"."end_date"
   FROM ("public"."reservations" "r"
     LEFT JOIN "public"."gear_items" "gi" ON (("gi"."id" = "r"."gear_id")));


ALTER TABLE "public"."analytics_provider_activity_feed" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."analytics_provider_category_revenue" AS
 SELECT "gi"."provider_id",
    COALESCE("gi"."category", 'Uncategorized'::"text") AS "category",
    "count"(*) FILTER (WHERE ("r"."status" = ANY (ARRAY['confirmed'::"text", 'active'::"text", 'completed'::"text"]))) AS "reservation_count",
    COALESCE("sum"(
        CASE
            WHEN ("r"."status" = ANY (ARRAY['confirmed'::"text", 'active'::"text", 'completed'::"text"])) THEN COALESCE(("r"."amount_total_cents")::bigint, (("r"."total_price" * (100)::numeric))::bigint)
            ELSE (0)::bigint
        END), (0)::numeric) AS "revenue_cents"
   FROM ("public"."gear_items" "gi"
     LEFT JOIN "public"."reservations" "r" ON (("r"."gear_id" = "gi"."id")))
  GROUP BY "gi"."provider_id", COALESCE("gi"."category", 'Uncategorized'::"text");


ALTER TABLE "public"."analytics_provider_category_revenue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."analytics_provider_daily_utilisation" AS
 WITH "expanded" AS (
         SELECT "r"."provider_id",
            "r"."gear_id",
            ("generate_series"("date_trunc"('day'::"text", ("r"."start_date")::timestamp with time zone), "date_trunc"('day'::"text", (COALESCE("r"."end_date", "r"."start_date"))::timestamp with time zone), '1 day'::interval))::"date" AS "usage_date",
            1 AS "units"
           FROM "public"."reservations" "r"
          WHERE (("r"."status" = ANY (ARRAY['hold'::"text", 'confirmed'::"text", 'active'::"text"])) AND ("r"."start_date" IS NOT NULL))
        ), "gear_totals" AS (
         SELECT "gear_items"."provider_id",
            "sum"(COALESCE("gear_items"."quantity_available", 0)) AS "total_units"
           FROM "public"."gear_items"
          WHERE ("gear_items"."active" IS DISTINCT FROM false)
          GROUP BY "gear_items"."provider_id"
        )
 SELECT "e"."provider_id",
    "e"."usage_date",
    "sum"("e"."units") AS "active_units",
    "gt"."total_units"
   FROM ("expanded" "e"
     JOIN "gear_totals" "gt" ON (("gt"."provider_id" = "e"."provider_id")))
  GROUP BY "e"."provider_id", "e"."usage_date", "gt"."total_units";


ALTER TABLE "public"."analytics_provider_daily_utilisation" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."analytics_provider_item_performance" AS
 SELECT "gi"."provider_id",
    "gi"."id" AS "gear_id",
    "gi"."name" AS "gear_name",
    "gi"."category",
    "gi"."quantity_available",
    "gi"."last_rented_at",
    COALESCE("sum"(
        CASE
            WHEN ("r"."status" = ANY (ARRAY['confirmed'::"text", 'active'::"text", 'completed'::"text"])) THEN COALESCE(("r"."amount_total_cents")::bigint, (("r"."total_price" * (100)::numeric))::bigint)
            ELSE (0)::bigint
        END), (0)::numeric) AS "revenue_cents",
    "count"(*) FILTER (WHERE ("r"."status" = ANY (ARRAY['confirmed'::"text", 'active'::"text", 'completed'::"text"]))) AS "reservation_count"
   FROM ("public"."gear_items" "gi"
     LEFT JOIN "public"."reservations" "r" ON (("r"."gear_id" = "gi"."id")))
  GROUP BY "gi"."provider_id", "gi"."id", "gi"."name", "gi"."category", "gi"."quantity_available", "gi"."last_rented_at";


ALTER TABLE "public"."analytics_provider_item_performance" OWNER TO "postgres";


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
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'provider'::"text", 'admin'::"text"])))
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


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
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "verified" boolean DEFAULT false NOT NULL,
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
    "current_season" "text" DEFAULT 'all-year'::"text"
);

ALTER TABLE ONLY "public"."providers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_provider_memberships" (
    "user_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_provider_memberships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."user_provider_memberships" OWNER TO "postgres";


ALTER TABLE ONLY "public"."featured_gear"
    ADD CONSTRAINT "featured_gear_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gear_availability_blocks"
    ADD CONSTRAINT "gear_availability_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gear_images"
    ADD CONSTRAINT "gear_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gear_items"
    ADD CONSTRAINT "gear_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_provider_memberships"
    ADD CONSTRAINT "user_provider_memberships_user_id_provider_id_key" UNIQUE ("user_id", "provider_id");



CREATE UNIQUE INDEX "gear_images_unique_order_idx" ON "public"."gear_images" USING "btree" ("gear_id", "sort_order");



CREATE INDEX "gear_items_description_trgm_idx" ON "public"."gear_items" USING "gin" ("description" "public"."gin_trgm_ops");



CREATE INDEX "gear_items_geom_idx" ON "public"."gear_items" USING "gist" ("geom");



CREATE INDEX "gear_items_name_trgm_idx" ON "public"."gear_items" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gear_images_gear_id" ON "public"."gear_images" USING "btree" ("gear_id");



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_providers_user_id" ON "public"."providers" USING "btree" ("user_id");



CREATE INDEX "idx_reservation_availability" ON "public"."reservations" USING "btree" ("gear_id", "status", "start_date", "end_date") WHERE ("status" = ANY (ARRAY['confirmed'::"text", 'active'::"text"]));



CREATE INDEX "idx_reservation_created" ON "public"."reservations" USING "btree" ("created_at");



CREATE INDEX "idx_reservation_customer" ON "public"."reservations" USING "btree" ("customer_name");



CREATE INDEX "idx_reservation_dates" ON "public"."reservations" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_reservation_gear" ON "public"."reservations" USING "btree" ("gear_id");



CREATE INDEX "idx_reservation_provider" ON "public"."reservations" USING "btree" ("provider_id");



CREATE INDEX "idx_reservation_status" ON "public"."reservations" USING "btree" ("status");



CREATE INDEX "idx_reservations_active_hold" ON "public"."reservations" USING "btree" ("gear_id", "start_date", "end_date") WHERE ("status" = ANY (ARRAY['hold'::"text", 'confirmed'::"text", 'active'::"text"]));



CREATE INDEX "idx_reservations_gear_id" ON "public"."reservations" USING "btree" ("gear_id");



CREATE INDEX "idx_reservations_provider_id" ON "public"."reservations" USING "btree" ("provider_id");



CREATE INDEX "idx_reservations_provider_status_dates" ON "public"."reservations" USING "btree" ("provider_id", "status", "start_date" DESC);



CREATE INDEX "idx_upm_provider" ON "public"."user_provider_memberships" USING "btree" ("provider_id");



CREATE INDEX "providers_country_idx" ON "public"."providers" USING "btree" ("country");



CREATE INDEX "providers_verified_idx" ON "public"."providers" USING "btree" ("verified", "approved_at");



CREATE INDEX "reservations_customer_idx" ON "public"."reservations" USING "btree" ("customer_id");



CREATE INDEX "reservations_gear_date_idx" ON "public"."reservations" USING "btree" ("gear_id", "start_date", "end_date", "status");



CREATE INDEX "reservations_provider_idx" ON "public"."reservations" USING "btree" ("provider_id");



CREATE OR REPLACE TRIGGER "gear_items_set_updated_at" BEFORE UPDATE ON "public"."gear_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "payments_set_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "providers_set_updated_at" BEFORE UPDATE ON "public"."providers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "reservations_set_updated_at" BEFORE UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_update_gear_last_rented" AFTER INSERT OR UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."update_gear_last_rented"();



CREATE OR REPLACE TRIGGER "update_gear_items_updated_at" BEFORE UPDATE ON "public"."gear_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reservation_updated_at" BEFORE UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."gear_availability_blocks"
    ADD CONSTRAINT "gear_availability_blocks_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gear_images"
    ADD CONSTRAINT "gear_images_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_provider_memberships"
    ADD CONSTRAINT "user_provider_memberships_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_provider_memberships"
    ADD CONSTRAINT "user_provider_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins and owners can delete memberships" ON "public"."user_provider_memberships" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "user_provider_memberships"."provider_id") AND ("pr"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Admins and owners can insert memberships" ON "public"."user_provider_memberships" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "user_provider_memberships"."provider_id") AND ("pr"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Admins and owners can update memberships" ON "public"."user_provider_memberships" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "user_provider_memberships"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "user_provider_memberships"."provider_id") AND ("pr"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Allow provider owner to DELETE their data" ON "public"."providers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow provider owner to INSERT their data" ON "public"."providers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow provider owner to SELECT their data" ON "public"."providers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow provider owner to UPDATE their data" ON "public"."providers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Anyone can view gear images" ON "public"."gear_images" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can insert" ON "public"."gear_items" FOR INSERT WITH CHECK (("auth"."uid"() = "provider_id"));



CREATE POLICY "Provider can delete own gear" ON "public"."gear_items" FOR DELETE USING (("auth"."uid"() = "provider_id"));



CREATE POLICY "Provider can update own gear" ON "public"."gear_items" FOR UPDATE USING (("auth"."uid"() = "provider_id"));



CREATE POLICY "Providers can insert own reservations" ON "public"."reservations" FOR INSERT WITH CHECK (("provider_id" IN ( SELECT "user_provider_memberships"."provider_id"
   FROM "public"."user_provider_memberships"
  WHERE ("user_provider_memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can manage own gear images" ON "public"."gear_images" USING (("gear_id" IN ( SELECT "gi"."id"
   FROM ("public"."gear_items" "gi"
     JOIN "public"."providers" "p" ON (("gi"."provider_id" = "p"."id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can manage own reservations" ON "public"."reservations" TO "authenticated" USING (("provider_id" IN ( SELECT "providers"."id"
   FROM "public"."providers"
  WHERE ("providers"."user_id" = "auth"."uid"())))) WITH CHECK (("provider_id" IN ( SELECT "providers"."id"
   FROM "public"."providers"
  WHERE ("providers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Providers can update own onboarding status" ON "public"."providers" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Providers: Insert own record" ON "public"."providers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Providers: Read own record" ON "public"."providers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Providers: Update own record" ON "public"."providers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Public read access" ON "public"."gear_items" FOR SELECT USING (true);



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own memberships" ON "public"."user_provider_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow public read" ON "public"."featured_gear" FOR SELECT USING (true);



CREATE POLICY "availability_admin_all" ON "public"."gear_availability_blocks" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "availability_owner_all" ON "public"."gear_availability_blocks" USING ((EXISTS ( SELECT 1
   FROM ("public"."gear_items" "gi"
     JOIN "public"."providers" "p" ON (("p"."id" = "gi"."provider_id")))
  WHERE (("gi"."id" = "gear_availability_blocks"."gear_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."gear_items" "gi"
     JOIN "public"."providers" "p" ON (("p"."id" = "gi"."provider_id")))
  WHERE (("gi"."id" = "gear_availability_blocks"."gear_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."featured_gear" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gear_all_admin" ON "public"."gear_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "gear_all_provider_member" ON "public"."gear_items" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "gear_items"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "m"."provider_id") AND ("m"."user_id" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "gear_items"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "m"."provider_id") AND ("m"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."gear_availability_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gear_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gear_images_admin_all" ON "public"."gear_images" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "gear_images_owner_all" ON "public"."gear_images" USING ((EXISTS ( SELECT 1
   FROM ("public"."gear_items" "gi"
     JOIN "public"."providers" "p" ON (("p"."id" = "gi"."provider_id")))
  WHERE (("gi"."id" = "gear_images"."gear_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."gear_items" "gi"
     JOIN "public"."providers" "p" ON (("p"."id" = "gi"."provider_id")))
  WHERE (("gi"."id" = "gear_images"."gear_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "gear_images_public_select" ON "public"."gear_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."gear_items" "gi"
     JOIN "public"."providers" "p" ON (("p"."id" = "gi"."provider_id")))
  WHERE (("gi"."id" = "gear_images"."gear_id") AND ("gi"."active" = true) AND ("p"."verified" = true) AND ("p"."approved_at" IS NOT NULL) AND ("p"."deleted_at" IS NULL)))));



ALTER TABLE "public"."gear_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gear_items_admin_all" ON "public"."gear_items" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "gear_items_owner_delete" ON "public"."gear_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "gear_items_owner_insert" ON "public"."gear_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "gear_items_owner_select" ON "public"."gear_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "gear_items_owner_update" ON "public"."gear_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items"."provider_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "gear_items_public_select" ON "public"."gear_items" FOR SELECT USING ((("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items"."provider_id") AND ("p"."verified" = true) AND ("p"."approved_at" IS NOT NULL) AND ("p"."deleted_at" IS NULL))))));



CREATE POLICY "gear_select_public" ON "public"."gear_items" FOR SELECT USING ((("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "gear_items"."provider_id") AND ("p"."verified" = true))))));



CREATE POLICY "membership_delete_admin" ON "public"."user_provider_memberships" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "membership_delete_own" ON "public"."user_provider_memberships" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "membership_delete_provider_owner" ON "public"."user_provider_memberships" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "user_provider_memberships"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))));



CREATE POLICY "membership_insert_admin" ON "public"."user_provider_memberships" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "membership_insert_own" ON "public"."user_provider_memberships" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "membership_select_admin" ON "public"."user_provider_memberships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "membership_select_own" ON "public"."user_provider_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "membership_update_admin" ON "public"."user_provider_memberships" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "membership_update_own" ON "public"."user_provider_memberships" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_admin_all" ON "public"."payments" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "payments_provider_select" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "payments"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_all" ON "public"."profiles" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_select_owner" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "provider_delete_admin" ON "public"."providers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "provider_delete_owner" ON "public"."providers" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "provider_insert_admin" ON "public"."providers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "provider_insert_owner" ON "public"."providers" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "provider_select_admin" ON "public"."providers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "provider_select_member" ON "public"."providers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "providers"."id") AND ("m"."user_id" = "auth"."uid"())))));



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



CREATE POLICY "reservation_all_provider_member" ON "public"."reservations" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "reservations"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "m"."provider_id") AND ("m"."user_id" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."providers" "pr"
  WHERE (("pr"."id" = "reservations"."provider_id") AND ("pr"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_provider_memberships" "m"
  WHERE (("m"."provider_id" = "m"."provider_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "reservation_select_customer" ON "public"."reservations" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reservations_admin_all" ON "public"."reservations" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "reservations_admin_select" ON "public"."reservations" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "reservations_customer_select" ON "public"."reservations" FOR SELECT USING (("customer_id" = "auth"."uid"()));



CREATE POLICY "reservations_customer_update" ON "public"."reservations" FOR UPDATE USING (("customer_id" = "auth"."uid"())) WITH CHECK ((("customer_id" = "auth"."uid"()) AND ("status" = ANY (ARRAY['pending'::"text", 'cancelled'::"text"]))));



CREATE POLICY "reservations_provider_select" ON "public"."reservations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "reservations"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "reservations_provider_update" ON "public"."reservations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "reservations"."provider_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."providers" "p"
  WHERE (("p"."id" = "reservations"."provider_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."user_provider_memberships" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_available"("gear_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."is_available"("gear_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_available"("gear_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_available"("p_gear" "uuid", "p_start" "date", "p_end" "date", "p_qty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."is_available"("p_gear" "uuid", "p_start" "date", "p_end" "date", "p_qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_available"("p_gear" "uuid", "p_start" "date", "p_end" "date", "p_qty" integer) TO "service_role";



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



GRANT ALL ON FUNCTION "public"."update_gear_last_rented"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_gear_last_rented"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_gear_last_rented"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."gear_items" TO "anon";
GRANT ALL ON TABLE "public"."gear_items" TO "authenticated";
GRANT ALL ON TABLE "public"."gear_items" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_provider_activity_feed" TO "anon";
GRANT ALL ON TABLE "public"."analytics_provider_activity_feed" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_provider_activity_feed" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_provider_category_revenue" TO "anon";
GRANT ALL ON TABLE "public"."analytics_provider_category_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_provider_category_revenue" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_provider_daily_utilisation" TO "anon";
GRANT ALL ON TABLE "public"."analytics_provider_daily_utilisation" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_provider_daily_utilisation" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_provider_item_performance" TO "anon";
GRANT ALL ON TABLE "public"."analytics_provider_item_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_provider_item_performance" TO "service_role";



GRANT ALL ON TABLE "public"."featured_gear" TO "anon";
GRANT ALL ON TABLE "public"."featured_gear" TO "authenticated";
GRANT ALL ON TABLE "public"."featured_gear" TO "service_role";



GRANT ALL ON TABLE "public"."gear_availability_blocks" TO "anon";
GRANT ALL ON TABLE "public"."gear_availability_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."gear_availability_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."gear_images" TO "anon";
GRANT ALL ON TABLE "public"."gear_images" TO "authenticated";
GRANT ALL ON TABLE "public"."gear_images" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."providers" TO "anon";
GRANT ALL ON TABLE "public"."providers" TO "authenticated";
GRANT ALL ON TABLE "public"."providers" TO "service_role";



GRANT ALL ON TABLE "public"."user_provider_memberships" TO "anon";
GRANT ALL ON TABLE "public"."user_provider_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."user_provider_memberships" TO "service_role";



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



-- (Just updating the walkthrough file below via write/append, not the baseline schema)
