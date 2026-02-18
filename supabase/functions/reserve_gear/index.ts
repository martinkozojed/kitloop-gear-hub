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
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const databaseUrl =
  Deno.env.get("SUPABASE_DB_URL") ?? Deno.env.get("DATABASE_URL") ?? "";

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
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
      const fields = parseResult.error.issues.map((i) => i.path.join(".")).filter(Boolean);
      return jsonResponse(
        {
          error: "Validation failed",
          invalid_fields: fields.length ? fields : undefined,
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
      console.error("Provider lookup error:", providerError.message);
      return jsonResponse({ error: "Failed to verify provider" }, 400);
    }

    const { data: isMember, error: memberError } = await supabaseClient.rpc(
      "is_provider_member",
      { pid: providerId },
    );

    if (memberError) {
      console.error("Membership check error:", memberError.message);
      return jsonResponse({ error: "Failed to resolve membership" }, 400);
    }

    let isAdmin = false;
    if (!isMember) {
      const { data: adminFlag, error: adminError } = await supabaseClient.rpc(
        "is_admin",
      );
      if (adminError) {
        console.error("Admin check error:", adminError.message);
        return jsonResponse({ error: "Failed to resolve admin role" }, 400);
      }
      isAdmin = adminFlag === true;
    }

    if (!provider || (!isMember && !isAdmin)) {
      return jsonResponse({ error: "Forbidden: provider membership required" }, 403);
    }

    // RPC via service_role client — SECURITY DEFINER function needs elevated caller.
    // The anon/user client is only used for auth + membership checks above.
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: reservation, error: rpcError } = await serviceClient.rpc("create_reservation", {
      p_provider_id: providerId,
      p_user_id: customerUserId || user.id,
      p_variant_id: gearId,
      p_quantity: requestedQuantity || 1,
      p_start_date: startDateISO,
      p_end_date: endDateISO,
      p_customer_name: customer?.name || "Unnamed customer",
      p_customer_email: customer?.email || null,
      p_customer_phone: customer?.phone || null,
      p_total_price_cents: Math.round((totalPrice || 0) * 100),
      p_idempotency_key: idempotencyKey,
      p_notes: notes || null,
    });

    if (rpcError) {
      console.error("create_reservation RPC error:", rpcError.code, rpcError.message);

      if (rpcError.code === "P0002" || rpcError.message?.includes("not found or deleted")) {
        return jsonResponse({ error: "variant_not_found" }, 404);
      }
      if (rpcError.code === "P0001" || rpcError.message?.includes("Insufficient availability")) {
        return jsonResponse({ error: "insufficient_availability" }, 409);
      }
      if (rpcError.message?.includes("Unauthorized") || rpcError.code === "42501") {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      return jsonResponse({ error: "Reservation failed" }, 500);
    }

    return jsonResponse(
      {
        reservation_id: reservation.reservation_id,
        status: reservation.status,
      },
      201,
    );

  } catch (error) {
    console.error("Unhandled reserve_gear error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
