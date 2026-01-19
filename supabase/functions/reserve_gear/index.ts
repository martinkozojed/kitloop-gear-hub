import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0?target=denonext&pin=v135";
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

    // Use RPC for atomic reservation creation (Inventory 2.0)
    // We map gear_id -> p_variant_id since legacy UI sends variant ID as gear_id
    const { data: reservation, error: rpcError } = await supabaseClient.rpc("create_reservation", {
      p_provider_id: providerId,
      p_user_id: customerUserId || user.id, // Use explicit user_id if provided (admin/provider flow), else token user
      p_variant_id: gearId,
      p_quantity: requestedQuantity || 1,
      p_start_date: startDateISO,
      p_end_date: endDateISO,
      p_customer_name: customer?.name || "Unnamed customer",
      p_customer_email: customer?.email || null,
      p_customer_phone: customer?.phone || null,
      p_total_price_cents: Math.round((totalPrice || 0) * 100), // Ensure cents
      p_idempotency_key: idempotencyKey,
      p_notes: notes || null
    });

    if (rpcError) {
      console.error("create_reservation RPC error:", rpcError);

      // Handle known errors
      if (rpcError.code === "P0001" || rpcError.message?.includes("Insufficient availability")) {
        return jsonResponse(
          {
            error: "insufficient_quantity",
            message: rpcError.message
          },
          409
        );
      }

      if (rpcError.message?.includes("Variant does not belong")) {
        return jsonResponse({ error: "Invalid variant/provider combination" }, 400);
      }

      return jsonResponse({ error: "Reservation failed", details: rpcError.message }, 500);
    }

    return jsonResponse(
      {
        reservation_id: reservation.reservation_id,
        status: reservation.status,
        expires_at: reservation.expires_at,
        idempotent: reservation.idempotent || false,
      },
      201 // Created
    );

  } catch (error) {
    console.error("Unhandled reserve_gear error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
