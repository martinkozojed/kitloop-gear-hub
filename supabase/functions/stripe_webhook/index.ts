import { Pool } from "https://deno.land/x/postgres@v0.17.1/mod.ts";
import {
  assertMaxBodySize,
  createRateKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
  timingSafeEqual,
} from "../_shared/http.ts";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};
const TOLERANCE = 300;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getDatabaseUrl() {
  const url =
    Deno.env.get("SUPABASE_DB_URL") ?? Deno.env.get("DATABASE_URL") ?? "";
  if (!url) throw new Error("Missing SUPABASE_DB_URL");
  return url;
}

function requireStripeWebhookSecret() {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  if (!secret) throw new Error("Stripe webhook secret not configured");
  return secret;
}

function getSentryDsn() {
  return Deno.env.get("SENTRY_DSN") ?? "";
}

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new Pool(getDatabaseUrl(), 3, true);
  }
  return pool;
}

const respond = (msg: string, status: number) =>
  new Response(msg, { status, headers: HEADERS });

async function capture(err: unknown, sentryDsn: string) {
  if (!sentryDsn) {
    console.error("stripe_webhook error:", err);
    return;
  }
  try {
    const url = new URL(sentryDsn);
    const endpoint = `${url.protocol}//${url.host}/api/${url.pathname.replace("/", "")}/envelope/`;
    const auth = `Sentry sentry_key=${url.username}, sentry_version=7`;
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const payload = JSON.stringify({
      event_id: eventId,
      platform: "javascript",
      level: "error",
      timestamp: Date.now() / 1000,
      message:
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
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
        Authorization: auth,
      },
      body: envelope,
    });
  } catch (reportErr) {
    console.error("Sentry reporting failed:", reportErr, err);
  }
}

interface StripeDecisionInput {
  eventType: string;
  reservationStatus: string;
  expired: boolean;
  hasConflict: boolean;
  isReplay?: boolean;
}

interface StripeDecision {
  shouldUpdate: boolean;
  nextStatus: "confirmed" | "cancelled" | null;
  httpStatus: number;
  message: string;
  log: Record<string, unknown>;
}

export function decideStripeWebhookOutcome(input: StripeDecisionInput): StripeDecision {
  const baseLog = {
    event: "stripe_webhook.decision",
    event_type: input.eventType,
    reservation_status: input.reservationStatus,
    expired: input.expired,
    conflict: input.hasConflict,
    replay: !!input.isReplay,
  };

  if (input.isReplay) {
    return {
      shouldUpdate: false,
      nextStatus: null,
      httpStatus: 200,
      message: "Replay acknowledged",
      log: { ...baseLog, decision: "replay" },
    };
  }

  if (input.eventType === "payment_intent.succeeded") {
    if (input.reservationStatus === "confirmed") {
      return {
        shouldUpdate: false,
        nextStatus: null,
        httpStatus: 200,
        message: "Already confirmed",
        log: { ...baseLog, decision: "already_confirmed" },
      };
    }

    if (input.expired && input.hasConflict) {
      return {
        shouldUpdate: true,
        nextStatus: "cancelled",
        httpStatus: 409,
        message: "Hold conflict",
        log: { ...baseLog, decision: "cancelled_conflict" },
      };
    }

    return {
      shouldUpdate: true,
      nextStatus: "confirmed",
      httpStatus: 200,
      message: "Confirmed",
      log: { ...baseLog, decision: "confirmed" },
    };
  }

  if (input.eventType === "payment_intent.payment_failed") {
    return {
      shouldUpdate: true,
      nextStatus: "cancelled",
      httpStatus: 200,
      message: "Payment failed",
      log: { ...baseLog, decision: "cancelled_payment_failed" },
    };
  }

  return {
    shouldUpdate: false,
    nextStatus: null,
    httpStatus: 200,
    message: "Event ignored",
    log: { ...baseLog, decision: "ignored" },
  };
}

export async function verifyStripeSignature(
  body: string,
  header: string,
  secretOverride?: string,
) {
  const stripeWebhookSecret = secretOverride ?? requireStripeWebhookSecret();
  const entries = new Map(
    header.split(",").map((chunk) => {
      const [key, value] = chunk.split("=");
      return [key, value];
    }),
  );
  const timestamp = Number(entries.get("t"));
  const signature = entries.get("v1")?.trim();
  if (!Number.isFinite(timestamp) || !signature) {
    throw new Error("Invalid Stripe-Signature header");
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > TOLERANCE) {
    throw new Error("Stripe signature timestamp outside tolerance");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(stripeWebhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${body}`),
  );
  const expected = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (!timingSafeEqual(expected, signature)) {
    throw new Error("Invalid Stripe signature");
  }
}

async function handle(
  req: Request,
  sentryDsn: string,
): Promise<Response> {
  if (req.method !== "POST") return respond("Method not allowed", 405);

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) return respond("Missing Stripe-Signature", 400);

  const rawBuffer = await req.arrayBuffer();
  assertMaxBodySize(rawBuffer.byteLength);
  const rawBody = decoder.decode(rawBuffer);

  try {
    const secret = requireStripeWebhookSecret();
    await verifyStripeSignature(rawBody, signature, secret);
  } catch (error) {
    await capture(error, sentryDsn);
    return respond("Invalid signature", 403);
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return respond("Invalid JSON payload", 400);
  }

  const eventId = event.id as string | undefined;
  const eventType = event.type as string | undefined;
  const intent = (event.data as Record<string, unknown> | undefined)
    ?.object as Record<string, unknown> | undefined;
  const intentId = intent?.id as string | undefined;
  const metadata = intent?.metadata as Record<string, unknown> | undefined;
  const reservationId = metadata?.reservation_id as string | undefined;
  const providerId = metadata?.provider_id as string | undefined;

  if (!eventId || !eventType || !intentId || !reservationId) {
    return respond("Missing metadata", 400);
  }

  try {
    const info = rateLimit(
      createRateKeyFromRequest(req, "stripe_webhook", eventId.slice(0, 16)),
      50,
      60_000,
    );
    // optionally surface remaining in logs
    console.log(JSON.stringify({
      event: "stripe_webhook.rate_limit",
      event_id: eventId,
      remaining: info.remaining,
      reset_ms: info.resetMs,
    }));
  } catch (error) {
    const status = (error as { status?: number }).status ?? 429;
    const headers = rateLimitHeaders(
      (error as { remaining?: number }).remaining ?? 0,
      (error as { resetMs?: number }).resetMs ?? 60_000,
    );
    return new Response(
      "Too Many Requests",
      { status, headers: { ...HEADERS, ...headers } },
    );
  }

  const client = await getPool().connect();
  let inTxn = false;
  try {
    await client.queryObject`BEGIN`;
    inTxn = true;

    const inserted = await client.queryObject`
      INSERT INTO public.stripe_webhook_events(id, type, reservation_id, provider_id)
      VALUES (${eventId}, ${eventType}, ${reservationId}, ${providerId ?? null})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    if (inserted.rows.length === 0) {
      const decision = decideStripeWebhookOutcome({
        eventType,
        reservationStatus: "unknown",
        expired: false,
        hasConflict: false,
        isReplay: true,
      });
      await client.queryObject`COMMIT`;
      inTxn = false;
      console.log(JSON.stringify({ ...decision.log, event_id: eventId }));
      return respond(decision.message, decision.httpStatus);
    }

    const reservationResult = await client.queryObject<{
      id: string;
      gear_id: string;
      status: string;
      expires_at: Date | null;
      payment_intent_id: string | null;
    }>`
      SELECT id, gear_id, status, expires_at, payment_intent_id
      FROM public.reservations
      WHERE id = ${reservationId}
      FOR UPDATE
    `;
    if (reservationResult.rows.length === 0) {
      await client.queryObject`ROLLBACK`;
      inTxn = false;
      return respond("Reservation not found", 404);
    }
    const reservation = reservationResult.rows[0];

    if (
      reservation.payment_intent_id &&
      reservation.payment_intent_id !== intentId
    ) {
      await client.queryObject`COMMIT`;
      inTxn = false;
      console.warn(
        `stripe_webhook: mismatched intent ${reservation.payment_intent_id} vs ${intentId}`,
      );
      return respond("Ignored mismatched intent", 200);
    }

    if (!reservation.payment_intent_id) {
      await client.queryObject`
        UPDATE public.reservations
        SET payment_intent_id = ${intentId},
            updated_at = now()
        WHERE id = ${reservation.id}
      `;
      reservation.payment_intent_id = intentId;
    }

    const expired =
      reservation.expires_at !== null && reservation.expires_at <= new Date();

    let hasConflict = false;
    if (eventType === "payment_intent.succeeded" && expired) {
      const conflicts = await client.queryObject`
        SELECT 1
        FROM public.reservations
        WHERE id <> ${reservation.id}
          AND gear_id = ${reservation.gear_id}
          AND status IN ('hold','confirmed','active')
          AND period && (SELECT period FROM public.reservations WHERE id = ${reservation.id})
        LIMIT 1
      `;
      hasConflict = conflicts.rows.length > 0;
    }

    const decision = decideStripeWebhookOutcome({
      eventType,
      reservationStatus: reservation.status,
      expired,
      hasConflict,
    });

    if (!decision.shouldUpdate) {
      await client.queryObject`COMMIT`;
      inTxn = false;
      console.log(JSON.stringify({ ...decision.log, event_id: eventId }));
      return respond(decision.message, decision.httpStatus);
    }

    if (decision.nextStatus === "confirmed") {
      await client.queryObject`
        UPDATE public.reservations
        SET status = 'confirmed',
            paid_at = COALESCE(paid_at, now()),
            payment_intent_id = COALESCE(payment_intent_id, ${intentId}),
            updated_at = now()
        WHERE id = ${reservation.id}
      `;
    } else if (decision.nextStatus === "cancelled") {
      await client.queryObject`
        UPDATE public.reservations
        SET status = 'cancelled',
            payment_intent_id = COALESCE(payment_intent_id, ${intentId}),
            updated_at = now()
        WHERE id = ${reservation.id}
      `;
    }

    await client.queryObject`COMMIT`;
    inTxn = false;
    console.log(JSON.stringify({ ...decision.log, event_id: eventId }));
    return respond(decision.message, decision.httpStatus);
  } finally {
    if (inTxn) {
      try {
        await client.queryObject`ROLLBACK`;
      } catch {
        /* ignore */
      }
    }
    client.release();
  }
}

if (import.meta.main) {
  Deno.serve(async (req) => {
    const sentryDsn = getSentryDsn();
    if (req.method === "OPTIONS") return respond("ok", 200);
    try {
      return await handle(req, sentryDsn);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      if (status >= 500) await capture(error, sentryDsn);
      const message = status >= 500
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Request failed";
      return respond(message, status);
    }
  });
}
