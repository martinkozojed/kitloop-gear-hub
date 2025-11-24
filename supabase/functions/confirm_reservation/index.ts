import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Pool } from "https://deno.land/x/postgres@v0.17.1/mod.ts";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EnvConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  databaseUrl: string;
};

function getEnv(): EnvConfig {
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

  return { supabaseUrl, supabaseAnonKey, databaseUrl };
}

let pool: Pool | null = null;
function getPool(databaseUrl: string) {
  if (!pool) {
    pool = new Pool(databaseUrl, 3, true);
  }
  return pool;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const confirmSchema = z.object({
  reservation_id: z.string().uuid(),
  payment_intent_id: z.string().max(255).nullable().optional(),
});

export function validateConfirmPayload(data: unknown) {
  return confirmSchema.parse(data);
}

export function ensureHoldActive(
  reservation: { status: string; expires_at: Date | null },
) {
  if (reservation.status !== "hold") {
    throw new HttpError(409, "Reservation is not in hold state");
  }
  if (!reservation.expires_at || reservation.expires_at <= new Date()) {
    throw new HttpError(410, "Reservation hold has expired");
  }
}

const jsonResponse = (
  body: unknown,
  status = 200,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { supabaseUrl, supabaseAnonKey, databaseUrl } = getEnv();

    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new HttpError(401, "Missing Authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new HttpError(401, "Unauthorized");
    }

    const parsed = validateConfirmPayload(await req.json());
    const paymentIntentId =
      parsed.payment_intent_id === undefined ? null : parsed.payment_intent_id;

    const client = await getPool(databaseUrl).connect();
    let transactionStarted = false;

    try {
      await client.queryObject`
        SELECT set_config('request.jwt.claim.sub', ${user.id}, true)
      `;
      await client.queryObject`BEGIN`;
      transactionStarted = true;

      const reservationResult = await client.queryObject<{
        id: string;
        provider_id: string;
        status: string;
        expires_at: Date | null;
        paid_at: Date | null;
      }>`
        SELECT id, provider_id, status, expires_at, paid_at
        FROM public.reservations
        WHERE id = ${parsed.reservation_id}
        FOR UPDATE
      `;

      if (reservationResult.rows.length === 0) {
        throw new HttpError(404, "Reservation not found");
      }

      const reservation = reservationResult.rows[0];

      const membershipResult = await client.queryObject<{ ok: boolean }>`
        SELECT public.is_provider_member(${reservation.provider_id}) AS ok
      `;
      const membershipOk = membershipResult.rows[0]?.ok === true;

      let adminOk = false;
      if (!membershipOk) {
        const adminResult = await client.queryObject<{ ok: boolean }>`
          SELECT public.is_admin() AS ok
        `;
        adminOk = adminResult.rows[0]?.ok === true;
      }

      if (!membershipOk && !adminOk) {
        throw new HttpError(403, "Forbidden");
      }

      ensureHoldActive(reservation);

      const updateResult = await client.queryObject<{
        id: string;
        status: string;
        paid_at: Date | null;
      }>`
        UPDATE public.reservations
        SET status = 'confirmed',
            paid_at = COALESCE(paid_at, now()),
            payment_intent_id = ${paymentIntentId},
            updated_at = now()
        WHERE id = ${reservation.id}
        RETURNING id, status, paid_at
      `;

      await client.queryObject`COMMIT`;

      const updated = updateResult.rows[0];
      return jsonResponse({
        reservation_id: updated.id,
        status: updated.status,
        paid_at: updated.paid_at,
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.queryObject`ROLLBACK`;
        } catch (_) {
          // ignore rollback failure when transaction was not started properly
        }
      }

      if (error instanceof HttpError) {
        throw error;
      }

      if (
        error instanceof Error &&
        error.message.includes("reservations_no_overlap")
      ) {
        throw new HttpError(409, "Reservation overlaps an active booking");
      }

      console.error("confirm_reservation error:", error);
      throw new HttpError(500, "Failed to confirm reservation");
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    console.error("Unhandled confirm_reservation error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handle);
}
