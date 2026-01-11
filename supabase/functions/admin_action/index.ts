import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================
const adminActionSchema = z.object({
  action: z.enum(["approve_provider", "reject_provider"], {
    errorMap: () => ({ message: "Invalid action. Must be 'approve_provider' or 'reject_provider'" })
  }),
  target_id: z.string().uuid("Invalid provider ID format"),
  reason: z.string().max(500, "Reason must not exceed 500 characters").optional(),
});

type AdminActionPayload = z.infer<typeof adminActionSchema>;

// ============================================================================
// ENVIRONMENT
// ============================================================================
type EnvConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
};

function getEnv(): EnvConfig {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required Supabase environment variables");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });

// ============================================================================
// RATE LIMITING (DB-BASED)
// ============================================================================
async function checkRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  adminId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const windowMs = 60_000; // 1 minute
  const limit = 20;
  const now = new Date();

  try {
    // Call RPC function for atomic rate limit check
    const { data, error } = await supabaseAdmin.rpc("check_admin_rate_limit", {
      p_admin_id: adminId,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error) {
      console.error("Rate limit check failed:", error);
      // Fail-open in case of DB error (log and allow, but this is production concern)
      // Alternative: Fail-closed (throw error) - more secure but can block operations
      return { allowed: true, remaining: limit };
    }

    // FIX: Supabase RPC returns ARRAY for RETURNS TABLE
    const row = Array.isArray(data) ? data[0] : data;

    // Extra fail-open guard for null/undefined
    if (!row || typeof row.allowed !== "boolean") {
      console.error("Rate limit returned invalid data:", row);
      return { allowed: true, remaining: limit };
    }

    return {
      allowed: row.allowed,
      remaining: Number(row.remaining ?? 0),
    };
  } catch (error) {
    console.error("Rate limit exception:", error);
    return { allowed: true, remaining: limit };
  }
}

// ============================================================================
// HANDLER
// ============================================================================
async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const env = getEnv();

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // ========================================================================
    // 1. AUTHENTICATION
    // ========================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // ========================================================================
    // 2. ADMIN AUTHORIZATION (Server-side check)
    // ========================================================================
    const { data: isAdmin, error: adminCheckError } = await supabaseClient.rpc(
      "is_admin"
    );

    if (adminCheckError) {
      console.error("Admin check failed:", adminCheckError);
      return jsonResponse(
        { error: "Authorization check failed", code: "AUTH_CHECK_ERROR" },
        500
      );
    }

    if (!isAdmin) {
      console.warn(`Non-admin user ${user.id} attempted admin action`);
      return jsonResponse(
        { error: "Forbidden: Admin access required", code: "FORBIDDEN" },
        403
      );
    }

    // ========================================================================
    // 3. RATE LIMITING (Durable, DB-based)
    // ========================================================================
    const supabaseAdmin = createClient(
      env.supabaseUrl,
      env.supabaseServiceRoleKey
    );

    const rateLimitResult = await checkRateLimit(supabaseAdmin, user.id);

    if (!rateLimitResult.allowed) {
      return jsonResponse(
        {
          error: "Too many admin actions. Please wait before trying again.",
          code: "RATE_LIMIT_EXCEEDED",
          remaining: 0,
        },
        429
      );
    }

    // ========================================================================
    // 4. PAYLOAD VALIDATION (Zod)
    // ========================================================================
    let rawPayload: unknown;
    try {
      rawPayload = await req.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON payload", code: "INVALID_JSON" },
        400
      );
    }

    const parseResult = adminActionSchema.safeParse(rawPayload);

    if (!parseResult.success) {
      return jsonResponse(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parseResult.error.format(),
        },
        400
      );
    }

    const { action, target_id, reason }: AdminActionPayload = parseResult.data;

    // ========================================================================
    // 5. EXECUTE ATOMIC ADMIN ACTION (via RPC)
    // ========================================================================
    let rpcFunction: string;
    if (action === "approve_provider") {
      rpcFunction = "admin_approve_provider";
    } else if (action === "reject_provider") {
      rpcFunction = "admin_reject_provider";
    } else {
      return jsonResponse({ error: "Invalid action", code: "INVALID_ACTION" }, 400);
    }

    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      rpcFunction,
      {
        p_admin_id: user.id,
        p_target_id: target_id,
        p_reason: reason || null,
      }
    );

    if (rpcError) {
      console.error(`RPC ${rpcFunction} failed:`, rpcError);

      // Map common errors to user-friendly messages
      if (rpcError.code === "P0001") {
        return jsonResponse(
          { error: "Provider not found", code: "PROVIDER_NOT_FOUND" },
          404
        );
      }

      if (rpcError.code === "23503") {
        return jsonResponse(
          { error: "Invalid provider reference", code: "INVALID_REFERENCE" },
          400
        );
      }

      return jsonResponse(
        { error: "Admin action failed", code: "ACTION_FAILED" },
        500
      );
    }

    // ========================================================================
    // 6. SUCCESS RESPONSE
    // ========================================================================
    return jsonResponse({
      success: true,
      action,
      target_id,
      audit_log_id: result?.audit_log_id,
      message: `Provider ${action === "approve_provider" ? "approved" : "rejected"} successfully`,
    });

  } catch (error) {
    console.error("Unhandled admin_action error:", error);

    // NEVER expose internal error details to client in production
    return jsonResponse(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      500
    );
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================
Deno.serve(handle);
