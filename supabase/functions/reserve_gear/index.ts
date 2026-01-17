import { createClient } from "https://esm.sh/v135/@supabase/supabase-js@2.50.0";
import { Pool } from "https://deno.land/x/postgres@v0.17.1/mod.ts";
import { reservationRequestSchema } from "./validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const databaseUrl =
  Deno.env.get("SUPABASE_DB_URL") ?? Deno.env.get("DATABASE_URL") ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing required Supabase environment variables");
}

if (!databaseUrl) {
  throw new Error("Missing SUPABASE_DB_URL or DATABASE_URL for Postgres access");
}

const pool = new Pool(databaseUrl, 3, true);
const HOLD_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const jsonResponse = (
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const rawPayload = await req.json();
    const parseResult = reservationRequestSchema.safeParse(rawPayload);

    if (!parseResult.success) {
      return jsonResponse(
        {
          error: "Validation failed",
          details: parseResult.error.format(),
        },
        400,
      );
    }

    const {
      gear_id: gearId,
      provider_id: providerId,
      start_date: startDateISO,
      end_date: endDateISO,
      idempotency_key: idempotencyKey,
      quantity: requestedQuantity,
      customer,
      total_price: totalPrice,
      deposit_paid: depositPaid,
      notes,
      user_id: customerUserId,
    } = parseResult.data;

    const startDate = new Date(startDateISO);
    const endDate = new Date(endDateISO);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return jsonResponse({ error: "Invalid date range" }, 400);
    }

    if (!(startDate < endDate)) {
      return jsonResponse({ error: "end_date must be after start_date" }, 400);
    }

    const now = new Date();
    if (startDate < now) {
      return jsonResponse({ error: "Cannot reserve in the past" }, 400);
    }

    // Ensure provider exists and request comes from a valid owner
    const { data: provider, error: providerError } = await supabaseClient
      .from("providers")
      .select("id, user_id")
      .eq("id", providerId)
      .maybeSingle();

    if (providerError) {
      return jsonResponse(
        { error: "Failed to verify provider", details: providerError.message },
        400,
      );
    }

    const { data: isMember, error: memberError } = await supabaseClient.rpc(
      "is_provider_member",
      { pid: providerId },
    );

    if (memberError) {
      return jsonResponse(
        { error: "Failed to resolve membership", details: memberError.message },
        400,
      );
    }

    let isAdmin = false;
    if (!isMember) {
      const { data: adminFlag, error: adminError } = await supabaseClient.rpc(
        "is_admin",
      );
      if (adminError) {
        return jsonResponse(
          { error: "Failed to resolve admin role", details: adminError.message },
          400,
        );
      }
      isAdmin = adminFlag === true;
    }

    if (!provider || (!isMember && !isAdmin)) {
      return jsonResponse({ error: "Forbidden: provider membership required" }, 403);
    }

    const client = await pool.connect();

    try {
      await client.queryObject`BEGIN`;

      // Idempotency check
      const existingReservation = await client.queryObject<{
        id: string;
        status: string;
        expires_at: Date | null;
      }>`
        SELECT id, status, expires_at
        FROM public.reservations
        WHERE idempotency_key = ${idempotencyKey}
        FOR UPDATE
      `;

      if (existingReservation.rows.length > 0) {
        await client.queryObject`COMMIT`;
        const match = existingReservation.rows[0];
        return jsonResponse(
          {
            reservation_id: match.id,
            status: match.status,
            expires_at: match.expires_at,
            idempotent: true,
          },
          200,
        );
      }

      // Lock gear row to ensure consistent availability
      const gearRow = await client.queryObject<{
        provider_id: string;
        active: boolean | null;
        price_per_day: number | null;
        quantity: number | null;
      }>`
        SELECT provider_id, active, price_per_day, quantity
        FROM public.gear_items
        WHERE id = ${gearId}
        FOR UPDATE
      `;

      if (gearRow.rows.length === 0) {
        await client.queryObject`ROLLBACK`;
        return jsonResponse({ error: "Gear item not found" }, 400);
      }

      if (gearRow.rows[0].provider_id !== providerId) {
        await client.queryObject`ROLLBACK`;
        return jsonResponse(
          { error: "Gear does not belong to the specified provider" },
          400,
        );
      }

      if (gearRow.rows[0].active === false) {
        await client.queryObject`ROLLBACK`;
        return jsonResponse(
          { error: "Gear item is not currently active" },
          409,
        );
      }

      // Check quantity availability
      const totalQuantity = gearRow.rows[0].quantity ?? 1;

      // Get overlapping reservations and sum their quantities
      const overlapping = await client.queryObject<{
        quantity: number | null;
      }>`
        SELECT quantity
        FROM public.reservations
        WHERE gear_id = ${gearId}
          AND status IN ('hold', 'confirmed', 'active')
          AND start_date < ${endDate}
          AND end_date > ${startDate}
        FOR UPDATE
      `;

      const reservedQuantity = overlapping.rows.reduce(
        (sum, row) => sum + (row.quantity ?? 1),
        0
      );

      const availableQuantity = totalQuantity - reservedQuantity;

      if (availableQuantity < (requestedQuantity ?? 1)) {
        await client.queryObject`ROLLBACK`;
        return jsonResponse(
          {
            error: "insufficient_quantity",
            message: `Only ${availableQuantity} items available, but ${requestedQuantity ?? 1} requested`,
            available: availableQuantity,
            requested: requestedQuantity ?? 1,
            total: totalQuantity,
          },
          409,
        );
      }

      const pricePerDay =
        typeof gearRow.rows[0].price_per_day === "number"
          ? gearRow.rows[0].price_per_day
          : 0;
      const dailyRateCents = Math.max(0, Math.round(pricePerDay * 100));
      const diffMs = endDate.getTime() - startDate.getTime();
      const rentalDays = Math.max(
        1,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
      );
      const quantity = requestedQuantity ?? 1;
      const amountTotalCents = dailyRateCents * rentalDays * quantity;
      const currency = "CZK";

      const pricingSnapshot = JSON.stringify({
        daily_rate_cents: dailyRateCents,
        days: rentalDays,
        quantity: quantity,
        currency,
        subtotal_cents: amountTotalCents,
      });

      const normalizedTotalPrice =
        typeof totalPrice === "number"
          ? totalPrice
          : amountTotalCents / 100;

      const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);

      const insertResult = await client.queryObject<{
        id: string;
        expires_at: Date | null;
      }>`
        INSERT INTO public.reservations (
          provider_id,
          gear_id,
          user_id,
          customer_name,
          customer_email,
          customer_phone,
          start_date,
          end_date,
          status,
          quantity,
          notes,
          total_price,
          deposit_paid,
          amount_total_cents,
          currency,
          pricing_snapshot,
          idempotency_key,
          expires_at
        )
        VALUES (
          ${providerId},
          ${gearId},
          ${customerUserId ?? null},
          ${customer?.name ?? "Unnamed customer"},
          ${customer?.email ?? null},
          ${customer?.phone ?? null},
          ${startDate.toISOString()},
          ${endDate.toISOString()},
          'hold',
          ${quantity},
          ${notes ?? null},
          ${normalizedTotalPrice ?? null},
          ${depositPaid ?? false},
          ${amountTotalCents || null},
          ${currency},
          ${pricingSnapshot},
          ${idempotencyKey},
          ${expiresAt.toISOString()}
        )
        RETURNING id, expires_at
      `;

      await client.queryObject`COMMIT`;

      const reservation = insertResult.rows[0];

      return jsonResponse(
        {
          reservation_id: reservation.id,
          status: "hold",
          expires_at: reservation.expires_at,
          idempotent: false,
        },
        201,
      );
    } catch (error) {
      await client.queryObject`ROLLBACK`;

      if (
        error instanceof Error &&
        error.message.includes("reservations_idempotency_key_key")
      ) {
        return jsonResponse(
          { error: "Duplicate idempotency key", details: error.message },
          422,
        );
      }

      console.error("reserve_gear error:", error);
      return jsonResponse(
        { error: "Failed to create reservation hold" },
        500,
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Unhandled reserve_gear error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
