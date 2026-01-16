// Staging-only E2E harness for Playwright smoke tests.
// Uses service role (in Supabase secrets) to seed/cleanup minimal data.
// Auth: header x-e2e-token must match E2E_SEED_TOKEN (secret in Supabase env).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0?target=denonext&pin=v135";

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
      case "seed_staging_pack":
        return await handleSeedStagingPack(supabase, body, { runId: prefix });
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

// ---------------------------------------------------------------------------
// Staging Pack Seed (PR7/P1 verification)
// ---------------------------------------------------------------------------
const REQUIRE_STAGING_REF = Deno.env.get("REQUIRE_STAGING_SEED") === "true";
const SEED_ALLOWED_REF = Deno.env.get("ALLOWED_PROJECT_REF") ?? "";
const PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") ?? "";
const SEED_USER_PASSWORD = Deno.env.get("SEED_USER_PASSWORD");

type SeedBody = {
  password?: string;
};

async function findUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string } | null> {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return { id: found.id };
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function ensureUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  password?: string
): Promise<{ id: string; created: boolean }> {
  const existing = await findUserByEmail(supabase, email);
  if (existing) return { id: existing.id, created: false };

  if (!password) {
    throw new Error("User does not exist and SEED_USER_PASSWORD not provided");
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data?.user) throw error ?? new Error("Failed to create auth user");
  return { id: data.user.id, created: true };
}

async function upsertProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  await supabase.from("profiles").upsert({
    user_id: userId,
    role: "provider",
    is_admin: false,
    is_verified: true,
  }, { onConflict: "user_id" });
}

type ProviderSeed = {
  name: string;
  status: "approved" | "pending";
  slug: string;
  ownerId: string;
};

async function ensureProvider(
  supabase: ReturnType<typeof createClient>,
  seed: ProviderSeed
): Promise<string> {
  const { data } = await supabase
    .from("providers")
    .select("id")
    .eq("name", seed.name)
    .maybeSingle();

  if (data?.id) {
    await supabase.from("providers").update({
      status: seed.status,
      verified: seed.status === "approved",
      user_id: seed.ownerId,
    }).eq("id", data.id);
    return data.id;
  }

  const { data: created, error } = await supabase
    .from("providers")
    .insert({
      name: seed.name,
      rental_name: seed.name,
      contact_name: "Seed Owner",
      email: `${seed.slug}@example.com`,
      phone: "+420777000111",
      status: seed.status,
      verified: seed.status === "approved",
      user_id: seed.ownerId,
      location: "Staging City",
      currency: "CZK",
      time_zone: "UTC",
      category: "seed",
    })
    .select("id")
    .single();

  if (error || !created) throw error ?? new Error("Failed to create provider");
  return created.id;
}

async function ensureMembership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  providerId: string
) {
  const { data } = await supabase
    .from("user_provider_memberships")
    .select("user_id")
    .eq("user_id", userId)
    .eq("provider_id", providerId)
    .maybeSingle();

  if (data?.user_id) return;

  await supabase.from("user_provider_memberships").insert({
    user_id: userId,
    provider_id: providerId,
    role: "owner",
  });
}

async function ensureProductVariantAndAssets(
  supabase: ReturnType<typeof createClient>,
  providerId: string,
  baseSlug: string,
  count: number
): Promise<{ productId: string; variantId: string; assetIds: string[] }> {
  const productName = `${baseSlug}_product`;
  const { data: existingProduct } = await supabase
    .from("products")
    .select("id")
    .eq("provider_id", providerId)
    .eq("name", productName)
    .maybeSingle();

  let productId = existingProduct?.id;
  if (!productId) {
    const { data: created, error } = await supabase
      .from("products")
      .insert({
        provider_id: providerId,
        name: productName,
        category: "seed",
        base_price_cents: 2000,
        description: "Staging seed product",
      })
      .select("id")
      .single();
    if (error || !created) throw error ?? new Error("Failed to create product");
    productId = created.id;
  }

  const variantName = `${baseSlug}_variant`;
  const { data: existingVariant } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("name", variantName)
    .maybeSingle();

  let variantId = existingVariant?.id;
  if (!variantId) {
    const { data: createdVar, error } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, name: variantName })
      .select("id")
      .single();
    if (error || !createdVar) throw error ?? new Error("Failed to create variant");
    variantId = createdVar.id;
  }

  const assetIds: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    const tag = `${baseSlug}_asset_${i}`;
    const { data: existingAsset } = await supabase
      .from("assets")
      .select("id")
      .eq("asset_tag", tag)
      .maybeSingle();
    if (existingAsset?.id) {
      assetIds.push(existingAsset.id);
      continue;
    }

    const { data: createdAsset, error } = await supabase
      .from("assets")
      .insert({
        provider_id: providerId,
        variant_id: variantId,
        asset_tag: tag,
        status: "available",
        condition_score: 90,
        location: "Staging WH",
      })
      .select("id")
      .single();
    if (error || !createdAsset) throw error ?? new Error("Failed to create asset");
    assetIds.push(createdAsset.id);
  }

  return { productId, variantId, assetIds };
}

type ReservationSeed = {
  label: string;
  status: string;
  start: string;
  end: string;
  providerId: string;
  variantId: string;
  assetId: string;
};

async function ensureReservationWithAssignment(
  supabase: ReturnType<typeof createClient>,
  seed: ReservationSeed
): Promise<{ id: string; status: string }> {
  const idKey = `seed_pack_${seed.label}`;
  const { data: existing } = await supabase
    .from("reservations")
    .select("id, status")
    .eq("provider_id", seed.providerId)
    .eq("idempotency_key", idKey)
    .maybeSingle();

  let reservationId = existing?.id;
  let status = existing?.status ?? seed.status;

  if (!reservationId) {
    const { data: created, error } = await supabase
      .from("reservations")
      .insert({
        provider_id: seed.providerId,
        product_variant_id: seed.variantId,
        customer_name: `Seed Customer ${seed.label}`,
        customer_email: "customer@example.com",
        customer_phone: "+420777000222",
        start_date: seed.start,
        end_date: seed.end,
        status: seed.status,
        payment_status: "unpaid",
        currency: "CZK",
        idempotency_key: idKey,
        total_price: 999,
        amount_total_cents: 99900,
      })
      .select("id, status")
      .single();
    if (error || !created) throw error ?? new Error("Failed to create reservation");
    reservationId = created.id;
    status = created.status;
  } else if (status !== seed.status) {
    await supabase
      .from("reservations")
      .update({ status: seed.status })
      .eq("id", reservationId);
    status = seed.status;
  }

  const { data: existingAssignment } = await supabase
    .from("reservation_assignments")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("asset_id", seed.assetId)
    .maybeSingle();

  if (!existingAssignment?.id) {
    await supabase.from("reservation_assignments").insert({
      reservation_id: reservationId,
      asset_id: seed.assetId,
      assigned_at: seed.start,
    });
  }

  return { id: reservationId, status };
}

const handleSeedStagingPack = async (
  supabase: ReturnType<typeof createClient>,
  body: SeedBody,
  opts: { runId: string }
) => {
  if (!REQUIRE_STAGING_REF) {
    return jsonResponse(403, { error: "Staging pack disabled (REQUIRE_STAGING_SEED!=true)" });
  }
  if (!PROJECT_REF || !SEED_ALLOWED_REF || PROJECT_REF !== SEED_ALLOWED_REF) {
    return jsonResponse(403, { error: "Project ref not allowed for staging seed" });
  }

  const password = body?.password ?? SEED_USER_PASSWORD;
  const email = "mail@mail.cz";

  const userResult = await ensureUser(supabase, email, password);
  await upsertProfile(supabase, userResult.id);

  const providersToSeed: ProviderSeed[] = [
    { name: "provider_approved_A", status: "approved", slug: "provider_approved_a", ownerId: userResult.id },
    { name: "provider_approved_B", status: "approved", slug: "provider_approved_b", ownerId: userResult.id },
    { name: "provider_pending", status: "pending", slug: "provider_pending", ownerId: userResult.id },
  ];

  const providerResults: Record<string, { id: string; assets: string[]; reservations: { id: string; status: string }[] }> = {};

  for (const p of providersToSeed) {
    const providerId = await ensureProvider(supabase, p);
    await ensureMembership(supabase, p.ownerId, providerId);

    const seedAssets = p.status === "approved" ? 5 : 2;
    const { variantId, assetIds } = await ensureProductVariantAndAssets(
      supabase,
      providerId,
      `${p.slug}_${opts.runId}`,
      seedAssets
    );

    providerResults[p.name] = { id: providerId, assets: assetIds, reservations: [] };

    if (p.status === "approved") {
      const now = new Date();
      const hours = (h: number) => new Date(now.getTime() + h * 3600 * 1000).toISOString();
      const seeds: ReservationSeed[] = [
        { label: `${p.slug}_upcoming_1`, status: "confirmed", start: hours(48), end: hours(72), providerId, variantId, assetId: assetIds[0]! },
        { label: `${p.slug}_upcoming_2`, status: "confirmed", start: hours(24), end: hours(30), providerId, variantId, assetId: assetIds[1]! },
        { label: `${p.slug}_active_1`, status: "active", start: hours(-2), end: hours(6), providerId, variantId, assetId: assetIds[2]! },
        { label: `${p.slug}_active_2`, status: "active", start: hours(-6), end: hours(2), providerId, variantId, assetId: assetIds[3]! },
        { label: `${p.slug}_return_ready`, status: "active", start: hours(-12), end: hours(-1), providerId, variantId, assetId: assetIds[4]! },
        { label: `${p.slug}_completed`, status: "completed", start: hours(-72), end: hours(-48), providerId, variantId, assetId: assetIds[0]! },
      ];

      for (const seed of seeds) {
        const res = await ensureReservationWithAssignment(supabase, seed);
        providerResults[p.name].reservations.push(res);
      }
    } else {
      const pendingSeeds: ReservationSeed[] = [
        { label: `${p.slug}_pending_hold`, status: "hold", start: new Date().toISOString(), end: new Date(Date.now() + 3600 * 1000).toISOString(), providerId, variantId, assetId: assetIds[0]! },
      ];
      for (const seed of pendingSeeds) {
        const res = await ensureReservationWithAssignment(supabase, seed);
        providerResults[p.name].reservations.push(res);
      }
    }
  }

  return jsonResponse(200, {
    success: true,
    user_created: userResult.created,
    user_id: userResult.id,
    providers: providerResults,
  });
};
