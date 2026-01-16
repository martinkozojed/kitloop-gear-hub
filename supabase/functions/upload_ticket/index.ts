import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import { handleUploadTicket, type UploadTicketDeps } from "./handler.ts";

type EnvConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getEnv(overrides?: Partial<EnvConfig>): EnvConfig {
  const supabaseUrl = overrides?.supabaseUrl ?? (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_URL") ?? "" : "");
  const supabaseAnonKey = overrides?.supabaseAnonKey ?? (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_ANON_KEY") ?? "" : "");
  const supabaseServiceRoleKey = overrides?.supabaseServiceRoleKey ?? (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" : "");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

function buildDefaultDeps(env: EnvConfig, authHeader: string | null): UploadTicketDeps {
  const supabaseUser = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: authHeader ?? "" } },
  });
  const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

  const checkMembership = async (providerId: string, userId: string) => {
    const { data: membership, error } = await supabaseAdmin
      .from("user_provider_memberships")
      .select("provider_id")
      .eq("provider_id", providerId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("membership check failed", error);
      return false;
    }

    if (membership) return true;

    const { data: provider } = await supabaseAdmin
      .from("providers")
      .select("id, user_id")
      .eq("id", providerId)
      .maybeSingle();

    return provider?.user_id === userId;
  };

  return {
    getUser: async () => {
      const { data, error } = await supabaseUser.auth.getUser();
      if (error || !data?.user) return null;
      return { id: data.user.id };
    },
    checkProviderAccess: checkMembership,
    checkReservationOwnership: async (reservationId: string, providerId: string) => {
      const { data, error } = await supabaseAdmin
        .from("reservations")
        .select("id, provider_id")
        .eq("id", reservationId)
        .maybeSingle();

      if (error) {
        console.error("reservation lookup failed", error);
        return false;
      }

      return data?.provider_id === providerId;
    },
    createSignedUploadUrl: async (bucket: string, path: string) => {
      const { data, error } = await supabaseAdmin
        .storage
        .from(bucket)
        .createSignedUploadUrl(path, 15 * 60);

      if (error || !data) {
        throw error ?? new Error("failed to sign upload url");
      }

      return data;
    },
    logAudit: async (entry) => {
      try {
        await supabaseAdmin.from("audit_logs").insert({
          provider_id: entry.providerId,
          user_id: entry.userId,
          action: entry.action,
          resource_id: entry.resourceId,
          metadata: entry.metadata ?? {},
        });
      } catch (error) {
        console.error("audit log failed", error);
      }
    },
  };
}

export async function handleUploadTicketWithEnv(req: Request, overrides?: Partial<EnvConfig>) {
  const env = getEnv(overrides);
  const authHeader = req.headers.get("Authorization");
  const deps = buildDefaultDeps(env, authHeader);
  return handleUploadTicket(req, deps);
}

if (typeof Deno !== "undefined") {
  Deno.serve((req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    return handleUploadTicketWithEnv(req);
  });
}
