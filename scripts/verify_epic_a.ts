
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_ANON_KEY") || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("--- Verifying Epic A Evidence ---");

// 1. Check cron_runs (Evidence of logging)
const { data: cronRuns, error: cronError } = await supabase
    .from("cron_runs")
    .select("cron_name, status, metadata, started_at")
    .eq("cron_name", "cleanup_reservation_holds_cron")
    .order("started_at", { ascending: false })
    .limit(5);

if (cronError) {
    console.error("Error fetching cron_runs:", cronError);
} else {
    console.log(`Found ${cronRuns?.length} cron runs for cleanup.`);
    console.table(cronRuns);
}

// 2. Check reservations table structure (Evidence of expired_at)
// We can't query information_schema easily via JS client with RLS, but we can try to select expired_at from a dummy row or check if it errors.
const { error: colError } = await supabase
    .from("reservations")
    .select("expired_at")
    .limit(1);

if (colError) {
    console.error("Error checking expired_at column:", colError);
} else {
    console.log("Column 'expired_at' exists (query succeeded).");
}

console.log("--- End Verification ---");
