import { createClient } from "https://esm.sh/v135/@supabase/supabase-js@2.50.0";
import { submitRequestSchema } from "./validation.ts";

/** SHA256(utf8(token)) as 64-char hex. Canonical for DB lookup. */
async function tokenHashHex(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * IPv4: four octets. IPv6: permissive (hex + colons; edge cases like compressed/mapped not fully validated).
 * When validation fails we use "unknown" so token-only rate limit still applies and we don't block legit users.
 */
function isValidIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (!trimmed || trimmed.length > 45) return false;
  const v4 = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;
  if (v4.test(trimmed)) {
    return trimmed.split(".").every((oct) => parseInt(oct, 10) <= 255);
  }
  const v6 = /^[0-9a-fA-F:.]+$/;
  if (v6.test(trimmed) && trimmed.length >= 2) return true;
  return false;
}

/** Client IP: prefer x-real-ip / cf-connecting-ip, then first from x-forwarded-for. Hash for DB (no PII). RATE_LIMIT_SALT required (secret). */
async function getClientIpHash(req: Request): Promise<string | null> {
  const salt = Deno.env.get("RATE_LIMIT_SALT");
  if (!salt || salt.length < 16) {
    console.error("RATE_LIMIT_SALT is not set or too short. Set a secret (e.g. 32+ chars) in Edge env.");
    return null;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const raw = realIp ?? cfIp ?? forwarded ?? "unknown";
  const ip = isValidIp(raw) ? raw : "unknown";
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip + salt),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

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

    const rawPayload = await req.json();
    const parseResult = submitRequestSchema.safeParse(rawPayload);

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

    const data = parseResult.data;
    const startDate = new Date(data.requested_start_date);
    const endDate = new Date(data.requested_end_date);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return jsonResponse({ error: "Invalid date range" }, 400);
    }
    if (!(startDate < endDate)) {
      return jsonResponse({ error: "End date must be after start date" }, 400);
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (startDate < now) {
      return jsonResponse({ error: "Start date cannot be in the past" }, 400);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const tokenHash = await tokenHashHex(data.token);
    const ipHash = await getClientIpHash(req);
    if (ipHash === null) {
      return jsonResponse({ error: "Service temporarily unavailable" }, 503);
    }

    const { data: rpcResult, error: rpcError } = await serviceClient.rpc(
      "submit_request_public",
      {
        p_ip_hash: ipHash,
        p_token_hash: tokenHash,
        p_customer_name: data.customer_name.trim(),
        p_customer_email: data.customer_email?.trim() || null,
        p_customer_phone: data.customer_phone?.trim() || null,
        p_requested_start_date: data.requested_start_date,
        p_requested_end_date: data.requested_end_date,
        p_product_variant_id: data.product_variant_id || null,
        p_requested_gear_text: data.requested_gear_text?.trim() || null,
        p_notes: data.notes?.trim() || null,
      },
    );

    if (rpcError) {
      console.error("submit_request_public RPC error:", rpcError.message);
      return jsonResponse({ error: "Failed to submit request" }, 500);
    }

    if (rpcResult?.rate_limited === true) {
      const retryAfter = Math.max(1, Number(rpcResult.retry_after_seconds) || 60);
      return jsonResponse(
        { error: "Too many requests", retry_after_seconds: retryAfter },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }

    if (rpcResult?.error === "invalid_token") {
      return jsonResponse({ error: "Invalid or expired link" }, 404);
    }
    if (rpcResult?.error === "invalid_payload") {
      return jsonResponse({ error: "Invalid request data" }, 400);
    }

    if (rpcResult?.request_id) {
      return jsonResponse(
        { request_id: rpcResult.request_id, message: "Request submitted" },
        201,
      );
    }

    return jsonResponse({ error: "Unexpected response" }, 500);
  } catch (error) {
    console.error("Unhandled submit_request error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
