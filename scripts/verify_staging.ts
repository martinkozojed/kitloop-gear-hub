
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("E2E_SUPABASE_URL") || "";
// We will use User Auth, so we need Anon Key. Since it's not in .env.staging, I'll try VITE_SUPABASE_ANON_KEY from local .env if available, or ask/fail.
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_ANON_KEY") || "";

const ADMIN_EMAIL = Deno.env.get("E2E_ADMIN_EMAIL") || "";
const ADMIN_PASSWORD = Deno.env.get("E2E_ADMIN_PASSWORD") || "";

const PROVIDER_EMAIL = Deno.env.get("E2E_PROVIDER_EMAIL") || "";
const PROVIDER_PASSWORD = Deno.env.get("E2E_PROVIDER_PASSWORD") || "";


console.log("--- Staging Verification Epic B ---");
console.log(`Target: ${SUPABASE_URL}`);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing URL or ANON KEY. Ensure .env.staging and .env are sourced.");
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Valid Access Test (Admin)
async function testAdmin() {
    console.log(`\n[1] Testing Admin Access (${ADMIN_EMAIL})...`);
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
    });

    if (authError) {
        console.error("Admin Login Failed:", authError.message);
        return;
    }

    // Call RPC
    const { data, error } = await supabase.rpc("get_cron_health");
    if (error) {
        console.error("❌ Admin RPC Failed:", error);
    } else {
        console.log("✅ Admin RPC Success. Count:", data.length);
        const cleanup = data.find((j: any) => j.jobname === 'cleanup_reservation_holds');
        if (cleanup) {
            console.log("   Found 'cleanup_reservation_holds':", cleanup);
        } else {
            console.warn("   ⚠️ 'cleanup_reservation_holds' NOT found in health check.");
        }
        // console.table(data); // Optional: print full table
    }

    // Test Raw Table Access (cron_job_config) - Expect ? (It is RLS Service Role only, so Admin User should fail or get empty unless policy allows)
    // Actually policy is "Service role can manage config". Assuming default deny for others.
    // So Admin User SELECT on cron_job_config should return [] or error if no SELECT policy.
    const { data: configData, error: configError } = await supabase.from("cron_job_config").select("*");
    console.log("   Admin SELECT cron_job_config:", configError ? `Error: ${configError.message}` : `Data length: ${configData?.length}`);

    await supabase.auth.signOut();
}

// 2. Invalid Access Test (Provider)
async function testProvider() {
    console.log(`\n[2] Testing Provider Access (${PROVIDER_EMAIL})...`);
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
        email: PROVIDER_EMAIL,
        password: PROVIDER_PASSWORD,
    });

    if (authError) {
        console.error("Provider Login Failed:", authError.message);
        return;
    }

    // Call RPC - Should FAIL or Return Empty?
    // We granted EXECUTE to authenticated.
    // BUT does the function Logic filtering? No, it returns queries from cron.job.
    // So ANY authenticated user can see system cron status?
    // "Review requirement: Přístup k view/RPC jen trusted admin (stejné jako existující admin observability)."
    // My previous decision was: "Grant execute to authenticated". 
    // If the function validates roles internally? No.
    // So current implementation allows Provider to see Health. ❌ This might be a FAIL for security proof if strict.
    // Let's see what happens.

    const { data, error } = await supabase.rpc("get_cron_health");
    if (error) {
        console.log("✅ Provider RPC Error (Expected if secured):", error.message);
    } else {
        console.warn("⚠️ Provider RPC Success (Access allowed):", data.length > 0 ? "Data returned" : "Empty");
    }

    await supabase.auth.signOut();
}

await testAdmin();
await testProvider();
