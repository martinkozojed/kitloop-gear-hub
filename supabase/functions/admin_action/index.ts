import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface AdminActionPayload {
    action: "approve_provider" | "reject_provider";
    target_id: string;
    reason?: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: { headers: { Authorization: req.headers.get("Authorization")! } },
            }
        );

        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
            throw new Error("Unauthorized");
        }

        // Verify Admin Role
        const { data: profile } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("user_id", user.id)
            .single();

        if (profile?.role !== "admin") {
            throw new Error("Forbidden: Admin access required");
        }

        const payload: AdminActionPayload = await req.json();
        const { action, target_id, reason } = payload;

        // Initialize Service Role Client for privileged actions
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        if (action === "approve_provider") {
            // update provider status to 'approved' (assuming we add a status column or use verified flag if exists)
            // The current providers table has 'status' column in types.ts (Row: status: string | null).
            const { error: updateError } = await supabaseAdmin
                .from("providers")
                .update({ status: "approved" })
                .eq("id", target_id);

            if (updateError) throw updateError;

            // Also potentially update user_provider_memberships role? No, owner is owner.
        } else if (action === "reject_provider") {
            const { error: updateError } = await supabaseAdmin
                .from("providers")
                .update({ status: "rejected" })
                .eq("id", target_id);

            if (updateError) throw updateError;
        } else {
            throw new Error("Invalid action");
        }

        // Audit Log
        await supabaseAdmin.from("admin_audit_logs").insert({
            admin_id: user.id,
            action: action,
            target_id: target_id,
            details: { reason },
        });

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
