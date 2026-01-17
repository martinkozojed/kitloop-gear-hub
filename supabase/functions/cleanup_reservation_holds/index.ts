import { Pool } from "https://deno.land/x/postgres@v0.17.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function getDatabaseUrl() {
  const url =
    Deno.env.get("SUPABASE_DB_URL") ?? Deno.env.get("DATABASE_URL") ?? "";
  if (!url) {
    throw new Error("Missing SUPABASE_DB_URL or DATABASE_URL for Postgres access");
  }
  return url;
}

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new Pool(getDatabaseUrl(), 2, true);
  }
  return pool;
}

export function summarizeCleanupResult(deleted: number) {
  return { deleted_count: deleted };
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

function isAuthorized(req: Request) {
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const headerSecret = req.headers.get("x-cron-secret") ?? "";
  if (cronSecret && headerSecret === cronSecret) return true;

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const [, token] = auth.split(" ");
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (!isAuthorized(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const client = await getPool().connect();

    try {
      await client.queryObject`BEGIN`;

      const { rows } = await client.queryObject<{ id: string }>`
        DELETE FROM public.reservations
        WHERE status = 'hold'
          AND expires_at IS NOT NULL
          AND expires_at < now()
        RETURNING id
      `;

      await client.queryObject`COMMIT`;

      const payload = summarizeCleanupResult(rows.length);
      console.log(JSON.stringify({ event: "cleanup_reservation_holds", ...payload }));

      return jsonResponse(payload);
    } catch (error) {
      await client.queryObject`ROLLBACK`;
      console.error("cleanup_reservation_holds error:", error);
      return jsonResponse({ error: "Failed to cleanup holds" }, 500);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Unhandled cleanup_reservation_holds error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handle);
}

