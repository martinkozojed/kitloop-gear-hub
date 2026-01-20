
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY") || "";
// NOTE: get_cron_health is Service Role only! so we must use SERVICE_ROLE_KEY if available, or try anon if we messed up RLS (but we set it to service_role only).
// Actually, the plan says "revoke public, grant service_role".
// The frontend uses the normal client which is ANON usually, wait. passing `supabase` from `@/lib/supabase` uses anon key.
// IF the RPC is service_role ONLY, the frontend won't be able to see it unless the user is logged in as an admin who has appropriate claims/roles?
// Or did I make a mistake in the plan?
// "Security: SECURITY DEFINER ... grant execute to service_role".
// BUT the frontend uses `supabase.rpc`. If the logged in user is just 'authenticated', they can't call it if I revoke 'authenticated'.
// "Revoke all on ... from public, anon, authenticated".
// So ONLY service_role can call it.
// This means the frontend dashboard, which runs as the logged-in user (authenticated), WILL FAIL unless I grant execution to 'authenticated' OR the dashboard uses a service role client (unlikely/unsafe).
// Wait, the OBSERVABILITY B plan requirement said: "Přístup k view/RPC jen trusted admin (stejné jako existující admin observability)."
// Existing admin observability relies on RLS or specific checks.
// If I revoke all from authenticated, the normal dashboard (client-side) won't work.
// I should GRANT EXECUTE TO authenticated, but use RLS-like logic or just rely on the fact that only admins can access the `/admin` route (Frontend protection).
// Ideally, the RPC itself should check `auth.uid()` against an admin table or claim.
// For now, to make it work on the dashboard, I MUST grant to `authenticated` if I want the client to call it.
// OR I made it `service_role` only and I expect a Server-Side Loader? But this is a SPA.
// I should update the migration to GRANT EXECUTE TO authenticated. See existing `get_admin_stats` or similar?
// Let's assume I need to fix the permission in a follow-up migration or re-run the existing one if I can (since I used `db push`, I can modify the migration file and push again, `db push` might handle it or I might need to force).
// Actually `supabase db push` with modifying an existing file works if it's not applied on "remote" (staging/prod) yet or if verified. Local is "remote" here.
// I will check verify script with Service Role first to prove logic works. Then I'll check permissions.

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing ENV variables. Need VITE_SUPABASE_SERVICE_ROLE_KEY for this admin test.");
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("--- Verifying Epic B: Cron Health ---");

const { data, error } = await supabase.rpc("get_cron_health");

if (error) {
    console.error("RPC Error:", error);
} else {
    console.log("RPC Success. Data:");
    console.table(data);

    // Validations
    const cleanup = data.find((j: any) => j.jobname === 'cleanup_reservation_holds');
    if (cleanup) {
        console.log("✅ 'cleanup_reservation_holds' found.");
        console.log(`   Schedule: ${cleanup.schedule}`);
        console.log(`   Stale: ${cleanup.stale} (Config limit: ${cleanup.config_stale_limit})`);
    } else {
        console.error("❌ 'cleanup_reservation_holds' NOT found.");
    }
}
