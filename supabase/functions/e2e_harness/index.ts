// Staging-only E2E harness for Playwright smoke tests.
// Uses service role (in Supabase secrets) to seed/cleanup minimal data.
// Auth: header x-e2e-token must match E2E_SEED_TOKEN (secret in Supabase env).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const REQUIRE_HARNESS = Deno.env.get("REQUIRE_E2E_HARNESS") === "true";
const ALLOWED_ENV = Deno.env.get("HARNESS_ENV");
const CURRENT_ENV = Deno.env.get("ENVIRONMENT") ?? Deno.env.get("SUPABASE_ENV");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SEED_TOKEN = Deno.env.get("E2E_SEED_TOKEN") ?? "";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

serve(async (req) => {
  try {
    if (!REQUIRE_HARNESS) {
      return jsonResponse(403, { error: "Harness disabled (REQUIRE_E2E_HARNESS!=true)" });
    }

    if (!ALLOWED_ENV) {
      return jsonResponse(500, { error: "HARNESS_ENV not configured" });
    }

    if (!CURRENT_ENV || CURRENT_ENV !== ALLOWED_ENV) {
      return jsonResponse(403, { error: "Harness disabled for this environment" });
    }

    const token = req.headers.get("x-e2e-token");
    if (!token || token !== SEED_TOKEN) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return jsonResponse(500, { error: "Missing Supabase configuration" });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const runId = (body?.run_id as string | undefined)?.slice(0, 64) ?? `run_${Date.now()}`;
    const prefix = `e2e_${runId}`;

    switch (action) {
      case "seed":
        return await handleSeed(supabase, prefix);
      case "cleanup":
        return await handleCleanup(supabase, prefix);
      case "latest_audit_for_provider":
        return await handleAuditFetch(supabase, body?.provider_id as string | undefined);
      default:
        return jsonResponse(400, { error: "Invalid action" });
    }
  } catch (error) {
    return jsonResponse(500, { error: "Unhandled error", message: `${error}` });
  }
});

const handleSeed = async (
  supabase: ReturnType<typeof createClient>,
  prefix: string,
  opts?: { provider_email?: string; provider_status?: string }
) => {
  // Ensure at least one product + variant + asset exists for E2E.
  const name = `${prefix}_product`;

  let providerId: string | undefined;

  if (opts?.provider_email) {
    const { data: providerByEmail } = await supabase
      .from("providers")
      .select("id")
      .eq("email", opts.provider_email)
      .maybeSingle();
    providerId = providerByEmail?.id;
    if (!providerId) {
      return jsonResponse(500, { error: "Provider not found for email" });
    }
    if (opts.provider_status) {
      await supabase
        .from("providers")
        .update({
          status: opts.provider_status,
          verified: opts.provider_status === "approved",
        })
        .eq("id", providerId);
    }
  } else {
    const { data: provider } = await supabase
      .from("providers")
      .select("id")
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();
    providerId = provider?.id;
  }

  if (!providerId) {
    return jsonResponse(500, { error: "No approved provider available for seed" });
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, name")
    .eq("provider_id", providerId)
    .ilike("name", `${name}%`)
    .maybeSingle();

  let productId = product?.id;
  let productName = product?.name ?? name;
  if (!productId) {
    const { data: created, error } = await supabase
      .from("products")
      .insert({
        provider_id: providerId,
        name,
        category: "e2e",
        base_price_cents: 1500,
        description: "E2E seeded product",
      })
      .select("id, name")
      .single();
    if (error || !created) return jsonResponse(500, { error: "Failed to seed product" });
    productId = created.id;
    productName = created.name;
  }

  const { data: variant } = await supabase
    .from("product_variants")
    .select("id, name")
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  let variantId = variant?.id;
  let variantName = variant?.name ?? `${prefix}_variant`;
  if (!variantId) {
    const { data: createdVar, error } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, name: `${prefix}_variant` })
      .select("id, name")
      .single();
    if (error || !createdVar) return jsonResponse(500, { error: "Failed to seed variant" });
    variantId = createdVar.id;
    variantName = createdVar.name;
  }

  const { data: asset } = await supabase
    .from("assets")
    .select("id")
    .eq("variant_id", variantId)
    .limit(1)
    .maybeSingle();

  if (!asset) {
    const { error } = await supabase.from("assets").insert({
      provider_id: providerId,
      variant_id: variantId,
      asset_tag: `${prefix}_asset`,
      status: "available",
      condition_score: 100,
      location: "E2E Lab",
    });
    if (error) return jsonResponse(500, { error: "Failed to seed asset" });
  }

  return jsonResponse(200, {
    success: true,
    provider_id: providerId,
    product_id: productId,
    variant_id: variantId,
    product_name: productName,
    variant_name: variantName,
    prefix,
  });
};

const handleCleanup = async (supabase: ReturnType<typeof createClient>, prefix: string) => {
  // Delete seeded artifacts by prefix (products cascade to variants/assets).
  const { error } = await supabase
    .from("products")
    .delete()
    .ilike("name", `${prefix}%`);

  await supabase.from("assets").delete().ilike("asset_tag", `${prefix}%`);

  if (error) {
    return jsonResponse(500, { error: "Cleanup failed" });
  }

  return jsonResponse(200, { success: true, prefix });
};

const handleAuditFetch = async (
  supabase: ReturnType<typeof createClient>,
  providerId?: string
) => {
  if (!providerId) return jsonResponse(400, { error: "provider_id required" });

  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("id, action, target_id, created_at")
    .eq("target_id", providerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return jsonResponse(500, { error: "Audit fetch failed" });

  return jsonResponse(200, { audit: data ?? null });
};
