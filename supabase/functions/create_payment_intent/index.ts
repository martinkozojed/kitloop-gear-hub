import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0?target=denonext&pin=v135";
import { Pool } from "https://deno.land/x/postgres@v0.17.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import {
  assertMaxBodySize,
  rateLimit,
  rateLimitHeaders,
} from "../_shared/http.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EnvConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  databaseUrl: string;
  stripeSecret: string;
  sentryDsn: string;
};

function getEnv(): EnvConfig {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const databaseUrl =
    Deno.env.get("SUPABASE_DB_URL") ?? Deno.env.get("DATABASE_URL") ?? "";
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const sentryDsn = Deno.env.get("SENTRY_DSN") ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required Supabase environment variables");
  }

  if (!databaseUrl) {
    throw new Error("Missing SUPABASE_DB_URL or DATABASE_URL for Postgres access");
  }

  return { supabaseUrl, supabaseAnonKey, databaseUrl, stripeSecret, sentryDsn };
}

let pool: Pool | null = null;
function getPool(databaseUrl: string) {
  if (!pool) {
    pool = new Pool(databaseUrl, 3, true);
  }
  return pool;
}

const requestSchema = z.object({
  reservation_id: z.string().uuid(),
});

export const createPaymentIntentRequestSchema = requestSchema;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });

async function reportError(error: unknown, sentryDsn: string) {
  if (!sentryDsn) {
    console.error("create_payment_intent error:", error);
    return;
  }

  try {
    const url = new URL(sentryDsn);
    const projectId = url.pathname.replace("/", "");
    const endpoint = `${url.protocol}//${url.host}/api/${projectId}/envelope/`;
    const authHeader = `Sentry sentry_key=${url.username}, sentry_version=7`;

    const eventId = crypto.randomUUID().replace(/-/g, "");
    const payload = JSON.stringify({
      event_id: eventId,
      platform: "javascript",
      level: "error",
      timestamp: Date.now() / 1000,
      message:
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Unknown error",
    });

    const envelope = `${JSON.stringify({
      event_id: eventId,
      sent_at: new Date().toISOString(),
      sdk: { name: "kitloop-edge", version: "0.1.0" },
    })}\n${payload}`;

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "Authorization": authHeader,
      },
      body: envelope,
    });
  } catch (reportErr) {
    console.error("Sentry reporting failed:", reportErr, error);
  }
}

function getRequestIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("cf-connecting-ip") || "unknown";
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const {
    supabaseUrl,
    supabaseAnonKey,
    databaseUrl,
    stripeSecret,
    sentryDsn,
  } = getEnv();

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    try {
      rateLimit(`create_payment_intent_ip:${getRequestIp(req)}`, 60, 60_000);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 429;
      const headers = rateLimitHeaders(
        (error as { remaining?: number }).remaining ?? 0,
        (error as { resetMs?: number }).resetMs ?? 60_000,
      );
      return new Response(
        JSON.stringify({ error: "Too Many Requests" }),
        { status, headers: { ...corsHeaders, ...headers } },
      );
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

    try {
      rateLimit(`create_payment_intent_user:${user.id}`, 10, 60_000);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 429;
      const headers = rateLimitHeaders(
        (error as { remaining?: number }).remaining ?? 0,
        (error as { resetMs?: number }).resetMs ?? 60_000,
      );
      return new Response(
        JSON.stringify({ error: "Too Many Requests" }),
        { status, headers: { ...corsHeaders, ...headers } },
      );
    }

    if (!stripeSecret) {
      return jsonResponse({ error: "Stripe secret not configured" }, 500);
    }

    const rawBody = await req.text();
    assertMaxBodySize(rawBody.length);

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Invalid JSON payload" }, 400);
    }

    const { reservation_id } = requestSchema.parse(parsedBody);

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
        amount_total_cents: number | null;
        currency: string | null;
        payment_intent_id: string | null;
      }>`
        SELECT id,
               provider_id,
               status,
               expires_at,
               amount_total_cents,
               currency,
               payment_intent_id
        FROM public.reservations
        WHERE id = ${reservation_id}
        FOR UPDATE
      `;

      if (reservationResult.rows.length === 0) {
        throw new Error("Reservation not found");
      }

      const reservation = reservationResult.rows[0];

      if (reservation.status !== "hold") {
        return jsonResponse({ error: "Reservation not in hold status" }, 409);
      }

      if (!reservation.expires_at || reservation.expires_at <= new Date()) {
        return jsonResponse({ error: "Reservation hold expired" }, 410);
      }

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
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const amount = reservation.amount_total_cents ?? 0;
      if (amount <= 0) {
        return jsonResponse({ error: "Reservation amount missing" }, 400);
      }

      const currency = reservation.currency ?? "CZK";

      let stripeIntentId = reservation.payment_intent_id;
      let clientSecret: string | undefined;

      if (stripeIntentId) {
        const retrieveResp = await fetch(
          `https://api.stripe.com/v1/payment_intents/${stripeIntentId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${stripeSecret}`,
            },
          },
        );

        if (!retrieveResp.ok) {
          throw new Error("Failed to retrieve Stripe PaymentIntent");
        }

        const data = await retrieveResp.json();
        clientSecret = data.client_secret;
      } else {
        const payload = new URLSearchParams({
          amount: amount.toString(),
          currency,
          "metadata[reservation_id]": reservation.id,
          "metadata[provider_id]": reservation.provider_id,
        });

        const stripeResponse = await fetch(
          "https://api.stripe.com/v1/payment_intents",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${stripeSecret}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: payload.toString(),
          },
        );

        if (!stripeResponse.ok) {
          const errorPayload = await stripeResponse.text();
          throw new Error(`Stripe error: ${errorPayload}`);
        }

        const data = await stripeResponse.json();
        stripeIntentId = data.id;
        clientSecret = data.client_secret;

        await client.queryObject`
          UPDATE public.reservations
          SET payment_intent_id = ${stripeIntentId},
              updated_at = now()
          WHERE id = ${reservation.id}
        `;
      }

      await client.queryObject`COMMIT`;

      return jsonResponse({
        reservation_id,
        payment_intent_id: stripeIntentId,
        client_secret: clientSecret,
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.queryObject`ROLLBACK`;
        } catch {
          // ignore rollback failures
        }
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: "Invalid payload", details: error.flatten() }, 400);
    }

    if (error instanceof Error && error.message === "Reservation not found") {
      return jsonResponse({ error: "Reservation not found" }, 404);
    }

    const status = (error as { status?: number }).status ?? 500;
    if (status >= 500) {
      await reportError(error, sentryDsn);
    } else {
      console.error("create_payment_intent error:", error);
    }

    return jsonResponse(
      {
        error: status >= 500
          ? "Internal server error"
          : error instanceof Error
            ? error.message
            : "Request failed",
      },
      status,
    );
  }
}

if (import.meta.main) {
  Deno.serve(handle);
}
