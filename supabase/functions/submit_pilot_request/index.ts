/**
 * PR#12: Pilot request-only. No auth; stores in pilot_requests table.
 * Abuse guard: honeypot (_hp) + optional IP rate limit.
 * CORS: ALLOWED_ORIGINS (CSV) — if set, Origin must be in list or 403. OPTIONS same.
 * Rate limit policy: PILOT_RATE_LIMIT req per PILOT_RATE_WINDOW_MS per IP (default 5 / 60_000).
 * PR#14: Sends request_confirmation email (immediate) when Resend is configured.
 */
import { createClient } from "https://esm.sh/v135/@supabase/supabase-js@2.50.0";

const baseCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const resendFrom = Deno.env.get("RESEND_FROM") ?? "";
const rateLimitSalt = Deno.env.get("RATE_LIMIT_SALT") ?? "";
const allowedOriginsRaw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
const allowedOrigins = allowedOriginsRaw
  ? allowedOriginsRaw.split(",").map((o) => normalizeOrigin(o)).filter(Boolean)
  : [];

const isProduction = Deno.env.get("ENVIRONMENT") === "production";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

function normalizeOrigin(o: string): string {
  return o.trim().replace(/\/$/, "");
}

// Rate limit policy: N requests per window per bucket (tune via env; document in verification doc).
// WARNING: State is in-memory per instance. With multiple edge/serverless instances, protection is "soft"
// (attack can be spread across instances). For production-grade protection use a central store (KV/Redis/DB).
const PILOT_RATE_LIMIT = Math.max(1, parseInt(Deno.env.get("PILOT_RATE_LIMIT") ?? "5", 10));
const PILOT_RATE_WINDOW_MS = Math.max(10_000, parseInt(Deno.env.get("PILOT_RATE_WINDOW_MS") ?? "60000", 10));
const ipCounts = new Map<string, { count: number; expires: number }>();

function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return realIp ?? cfIp ?? forwarded ?? "unknown";
}

async function checkRateLimit(req: Request): Promise<{ ok: boolean; retryAfter?: number }> {
  if (!rateLimitSalt || rateLimitSalt.length < 16) return { ok: true };
  const ip = getClientIp(req);
  const ua = (req.headers.get("User-Agent") ?? "").slice(0, 80);
  const key = await hashSha256(ip + rateLimitSalt + ua);
  const now = Date.now();
  const entry = ipCounts.get(key);
  if (entry) {
    if (entry.expires < now) {
      ipCounts.delete(key);
    } else if (entry.count >= PILOT_RATE_LIMIT) {
      return { ok: false, retryAfter: Math.ceil((entry.expires - now) / 1000) };
    }
  }
  if (!ipCounts.has(key)) {
    ipCounts.set(key, { count: 0, expires: now + PILOT_RATE_WINDOW_MS });
  }
  const e = ipCounts.get(key)!;
  e.count += 1;
  return { ok: true };
}

async function hashSha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// When ALLOWED_ORIGINS is set: Origin must be present and in list. Missing Origin → 403 (safest default; browser POST usually sends it).
function checkOrigin(req: Request): { allowed: boolean; corsHeaders: Record<string, string> } {
  if (allowedOrigins.length === 0) {
    return { allowed: true, corsHeaders: { ...baseCorsHeaders, "Access-Control-Allow-Origin": "*" } };
  }
  const rawOrigin = req.headers.get("Origin")?.trim() ?? "";
  if (!rawOrigin) return { allowed: false, corsHeaders: baseCorsHeaders };
  const origin = normalizeOrigin(rawOrigin);
  const allowed = origin && allowedOrigins.includes(origin);
  const corsHeaders = allowed
    ? { ...baseCorsHeaders, "Access-Control-Allow-Origin": rawOrigin }
    : baseCorsHeaders;
  return { allowed, corsHeaders };
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
  cors: Record<string, string> = { ...baseCorsHeaders, "Access-Control-Allow-Origin": "*" }
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors, ...headers },
  });
}

function trim(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

Deno.serve(async (req) => {
  if (isProduction && allowedOrigins.length === 0) {
    console.error("RELEASE GATE: ALLOWED_ORIGINS must be set in production (ENVIRONMENT=production)");
    return jsonResponse({ error: "Server misconfiguration" }, 500, {}, baseCorsHeaders);
  }
  if (isProduction && (!rateLimitSalt || rateLimitSalt.length < 16)) {
    console.error("RELEASE GATE: RATE_LIMIT_SALT must be set in production (min 16 chars)");
    return jsonResponse({ error: "Server misconfiguration" }, 500, {}, baseCorsHeaders);
  }

  const { allowed: originOk, corsHeaders } = checkOrigin(req);
  if (req.method === "OPTIONS") {
    if (allowedOrigins.length > 0 && !originOk) {
      return new Response(null, { status: 403, headers: baseCorsHeaders });
    }
    return new Response("ok", { headers: corsHeaders });
  }

  if (allowedOrigins.length > 0 && !originOk) {
    return jsonResponse({ error: "Forbidden" }, 403, {}, baseCorsHeaders);
  }

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, {}, corsHeaders);

    const raw = await req.json();

    // Honeypot: enforce server-side; do not save or log the value (no per-request log to avoid spam)
    const hp = raw._hp != null ? String(raw._hp).trim() : "";
    if (hp.length > 0) return jsonResponse({ error: "Invalid request" }, 422, {}, corsHeaders);

    const rl = await checkRateLimit(req);
    if (!rl.ok) {
      return jsonResponse(
        { error: "Too many requests", retry_after_seconds: rl.retryAfter },
        429,
        rl.retryAfter ? { "Retry-After": String(rl.retryAfter) } : {},
        corsHeaders
      );
    }

    const rental_shop_name = trim(raw.rental_shop_name);
    const contact_name = trim(raw.contact_name);
    const work_email = trim(raw.work_email).toLowerCase();
    const city = trim(raw.city);
    const inventory_size = trim(raw.inventory_size);
    const phone = raw.phone != null ? trim(raw.phone) : null;

    if (
      rental_shop_name.length < 1 ||
      contact_name.length < 1 ||
      work_email.length < 3 ||
      city.length < 1 ||
      inventory_size.length < 1
    ) {
      return jsonResponse({ error: "Missing or invalid required fields" }, 400, {}, corsHeaders);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(work_email)) {
      return jsonResponse({ error: "Invalid email" }, 400, {}, corsHeaders);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data, error } = await supabase.rpc("submit_pilot_request", {
      p_rental_shop_name: rental_shop_name,
      p_contact_name: contact_name,
      p_work_email: work_email,
      p_city: city,
      p_inventory_size: inventory_size,
      p_phone: phone || null,
    });

    if (error) {
      console.error("submit_pilot_request RPC error:", error.message);
      return jsonResponse({ error: "Failed to submit request" }, 500, {}, corsHeaders);
    }

    const requestId = data as string;

    return jsonResponse({ request_id: requestId }, 201, {}, corsHeaders);
  } catch (e) {
    console.error("submit_pilot_request error:", e);
    return jsonResponse({ error: "Internal server error" }, 500, {}, corsHeaders);
  }
});
