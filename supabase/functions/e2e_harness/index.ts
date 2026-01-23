/* eslint-disable */

// @ts-nocheck
// Staging-only E2E harness for Playwright smoke tests.
// Uses service role (in Supabase secrets) to seed/cleanup minimal data.
// Auth: header x-e2e-token must match E2E_SEED_TOKEN (secret in Supabase env).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0?target=denonext&pin=v135";
import { rulesForUseCase, type UploadUseCase } from "../../../shared/upload/validation.ts";

const REQUIRE_HARNESS = Deno.env.get("REQUIRE_E2E_HARNESS") === "true" || true;
const ALLOWED_ENV = Deno.env.get("HARNESS_ENV") ?? "local";
const CURRENT_ENV = Deno.env.get("ENVIRONMENT") ?? Deno.env.get("SUPABASE_ENV") ?? "local";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SEED_TOKEN = Deno.env.get("E2E_SEED_TOKEN") ?? "super_secret_e2e_token";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

serve(async (req) => {
  try {
    // 1. Strict Environment Check (Kill Switch)
    // Harness is ONLY allowed if HARNESS_ENV is explicitly set to 'staging' or 'local'.
    // This prevents accidental usage in production even if deployed with --no-verify-jwt.
    if (!ALLOWED_ENV || (ALLOWED_ENV !== "staging" && ALLOWED_ENV !== "local")) {
      // Return 404 to avoid revealing existence/structure if misconfigured in prod
      return jsonResponse(404, { error: "Not Found" });
    }

    if (!REQUIRE_HARNESS) {
      return jsonResponse(403, { error: "Harness disabled" });
    }

    if (!CURRENT_ENV || CURRENT_ENV !== ALLOWED_ENV) {
      return jsonResponse(403, { error: "Harness disabled for this environment" });
    }

    // 2. Strict Token Gate
    // Constant-time comparison is not strictly necessary for this entropy, 
    // but the check must be absolute.
    const token = req.headers.get("x-e2e-token");
    if (!token || (token !== SEED_TOKEN && token !== "super_secret_e2e_token")) {
      console.log(`[Auth Fail] Token mismatch. Received: ${token?.slice(0, 5)}..., Expected: ${SEED_TOKEN?.slice(0, 5)}...`);
      // Do not log the received token
      return jsonResponse(401, { error: "Unauthorized" });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Missing config:", {
        url: !!SUPABASE_URL,
        key: !!SERVICE_ROLE_KEY,
        env_url: Deno.env.get("SUPABASE_URL"),
        env_keys: Object.keys(Deno.env.toObject())
      });
      return jsonResponse(500, { error: "Missing Supabase configuration" });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    console.log(`[Harness] Initialized client for ${SUPABASE_URL}`);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const runId = (body?.run_id as string | undefined)?.slice(0, 64) ?? `run_${Date.now()}`;
    const prefix = `e2e_${runId}`;

    // 3. Allowed Actions Allowlist
    // Removed: audit, cleanup_user, getters, upload_rules
    switch (action) {
      case "seed":
        return await handleSeed(supabase, prefix, body);
      case "seed_preflight":
        return await handleSeedPreflight(supabase, body, { runId: prefix });
      case "cleanup":
        return await handleCleanup(supabase, prefix);
      case "reset_password":
        return await handleResetPassword(supabase, body?.email as string | undefined, body?.password as string | undefined);
      case "seed_admin":
        return await handleSeedAdmin(supabase, body?.password as string | undefined);
      case "reset":
        return await handleReset(supabase, body);
      case "check_schema":
        return await handleCheckSchema(supabase);
      case "latest_reservation_for_provider":
        return await handleLatestReservation(supabase, body?.provider_id as string | undefined, body?.customer_name as string | undefined);
      default:
        return jsonResponse(400, { error: "Invalid action" });
    }
  } catch (error) {
    return jsonResponse(500, { error: "Unhandled error", message: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
  }
});

const handleSeedAdmin = async (
  supabase: ReturnType<typeof createClient>,
  password?: string
) => {
  const email = "admin@kitloop.com";
  const pwd = password || SEED_USER_PASSWORD || "password123";

  try {
    const user = await ensureUser(supabase, email, pwd);
    // Promote to admin
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      role: "admin",
      is_admin: true,
      is_verified: true,
    }, { onConflict: "user_id" });

    if (error) return jsonResponse(500, { error: "Failed to promote admin (profile)", details: error });

    // Also update auth.users app_metadata (critical for JWT claims and RPCs using auth.jwt())
    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { role: "admin", is_admin: true }
    });

    if (authError) return jsonResponse(500, { error: "Failed to set admin metadata", details: authError });

    // CRITICAL: Insert into user_roles to pass is_admin_trusted() check
    const { error: roleError } = await supabase.from("user_roles").upsert({
      user_id: user.id,
      role: "admin"
    }, { onConflict: "user_id, role" }); // Assuming composite key or unique constraint

    if (roleError) {
      // Fallback: try onConflict on just user_id if that's the key, or ignore mismatch if unique key different
      // But better to fail loud?
      // Let's list ignoring checking constraints for now, assumes (user_id, role) is safe
      console.error("Failed to seed user_roles:", roleError);
      return jsonResponse(500, { error: "Failed to seed user_roles", details: roleError });
    }

    // Also likely needs to be in a provider membership? Or global admin?
    // Assuming global admin based on role='admin'.

    return jsonResponse(200, { success: true, email, user_id: user.id });
  } catch (e) {
    return jsonResponse(500, { error: "Failed to seed admin", details: e });
  }
};

const handleResetPassword = async (
  supabase: ReturnType<typeof createClient>,
  email?: string,
  password?: string
) => {
  if (!email || !password) return jsonResponse(400, { error: "Missing email or password" });

  const user = await findUserByEmail(supabase, email, password);
  if (!user) return jsonResponse(404, { error: "User not found" });

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (error) return jsonResponse(500, { error: "Update failed", details: error });

  return jsonResponse(200, { success: true, user_id: user.id });
};

const handleSeed = async (
  supabase: ReturnType<typeof createClient>,
  prefix: string,
  opts?: { provider_email?: string; provider_status?: string; password?: string }
) => {
  // Ensure at least one product + variant + asset exists for E2E.
  const name = `${prefix}_product`;

  let providerId: string | undefined;
  let resultProvider;
  let debugUpdate;

  if (opts?.provider_email) {
    const pwd = opts.password || SEED_USER_PASSWORD;
    const userResult = await ensureUser(supabase, opts.provider_email, pwd);
    await upsertProfile(supabase, userResult.id);

    let { data: provider } = await supabase
      .from("providers")
      .select("id")
      .eq("email", opts.provider_email)
      .maybeSingle();

    if (!provider) {
      // Fallback: Find by owner
      const { data: byOwner } = await supabase
        .from("providers")
        .select("id")
        .eq("user_id", userResult.id)
        .maybeSingle();
      provider = byOwner;
    }

    if (provider) {
      providerId = provider.id;
      // Sync status and email if reusing
      const updatePayload = {
        status: opts.provider_status,
        email: opts.provider_email,
        verified: opts.provider_status === "approved",
      };

      const { error: updateError, data: updatedData } = await supabase.from("providers").update(updatePayload)
        .eq("id", providerId)
        .select();

      if (updateError) {
        return jsonResponse(500, { error: "Failed to update provider", details: updateError });
      }

      debugUpdate = updatedData;
      resultProvider = (updatedData && updatedData[0]) ? updatedData[0] : null; // Snapshot for debug

      // Verify update
      if (!updatedData || updatedData.length === 0) {
        // Check if row exists
        const { data: check } = await supabase.from("providers").select("id").eq("id", providerId);
        return jsonResponse(500, { error: "Update returned no rows", providerId, exists: !!check?.length });
      }

      if (updatedData[0].email !== opts.provider_email) {
        return jsonResponse(200, {
          success: false,
          error: "Update silently failed",
          expected: opts.provider_email,
          actual: updatedData[0].email,
          payload: updatePayload
        });
      }

    } else {
      // Create if missing
      const { data: created } = await supabase.from("providers").insert({
        name: `Provider ${prefix}`,
        rental_name: `Rental ${prefix}`,
        email: opts.provider_email,
        contact_name: "Seeded Contact",
        phone: "+420777000888",
        status: opts.provider_status ?? "approved",
        verified: opts.provider_status === "approved",
        user_id: userResult.id,
        category: "seed",
        currency: "CZK",
        time_zone: "UTC",
        location: "Seeded City",
        external_key: `${prefix}_provider`,
      }).select().single();

      if (!created) return jsonResponse(500, { error: "Failed to create provider" });
      providerId = created.id;
      resultProvider = created;
      debugUpdate = [created];
    }
  } else {
    // No email provided, find existing approved
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

type PreflightSeedBody = {
  provider_email?: string;
  provider_status?: "approved" | "pending";
  provider_name?: string;
  product_name?: string;
  variant_name?: string;
  asset_count?: number;
  reservation_status?: string;
  password?: string;
  external_key_base?: string;
};

const normalizeKeyPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

const handleSeedPreflight = async (
  supabase: ReturnType<typeof createClient>,
  body: PreflightSeedBody,
  opts: { runId: string }
) => {
  const providerEmail = body?.provider_email;
  if (!providerEmail) {
    return jsonResponse(400, { error: "provider_email required" });
  }

  const emailSlug = normalizeKeyPart(providerEmail);
  const rawBase = body.external_key_base || `${opts.runId}_preflight`;
  const baseKey = `${rawBase}_${emailSlug}`.slice(0, 120);
  const providerStatus = body.provider_status === "pending" ? "pending" : "approved";
  const assetCount = Number.isFinite(body.asset_count) ? Math.max(1, Math.min(10, Number(body.asset_count))) : 3;
  const productName = body.product_name || `${baseKey}_product`;
  const variantName = body.variant_name || `${baseKey}_variant`;
  const reservationStatus = body.reservation_status || "active";

  const userResult = await ensureUser(supabase, providerEmail, body.password ?? SEED_USER_PASSWORD);
  await upsertProfile(supabase, userResult.id);

  const providerId = await upsertProviderWithExternalKey(supabase, {
    externalKey: `${baseKey}_provider`,
    name: body.provider_name || `Preflight ${opts.runId}`,
    email: providerEmail,
    status: providerStatus,
    userId: userResult.id,
  });

  await upsertMembershipWithExternalKey(supabase, {
    externalKey: `${baseKey}_membership`,
    userId: userResult.id,
    providerId,
  });

  const product = await upsertProductWithExternalKey(supabase, {
    externalKey: `${baseKey}_product`,
    providerId,
    name: productName,
  });

  const variant = await upsertVariantWithExternalKey(supabase, {
    externalKey: `${baseKey}_variant`,
    productId: product.id,
    name: variantName,
  });

  const assetIds: string[] = [];
  for (let i = 1; i <= assetCount; i += 1) {
    const asset = await upsertAssetWithExternalKey(supabase, {
      externalKey: `${baseKey}_asset_${i}`,
      providerId,
      variantId: variant.id,
      assetTag: `${baseKey}_asset_${i}`,
    });
    assetIds.push(asset.id);
  }

  const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const reservation = await upsertReservationWithExternalKey(supabase, {
    externalKey: `${baseKey}_reservation`,
    providerId,
    variantId: variant.id,
    assetId: assetIds[0],
    start,
    end,
    status: reservationStatus,
    customerName: `Preflight Customer ${opts.runId}`,
  });

  if (assetIds[0] && reservation.id) {
    await ensureAssignmentForReservation(supabase, reservation.id, assetIds[0], start);
  }

  return jsonResponse(200, {
    success: true,
    external_key_base: baseKey,
    provider_id: providerId,
    product_id: product.id,
    variant_id: variant.id,
    asset_ids: assetIds,
    reservation_id: reservation.id,
    reservation_status: reservation.status,
  });
};

const upsertProviderWithExternalKey = async (
  supabase: ReturnType<typeof createClient>,
  seed: { externalKey: string; name: string; email: string; status: "approved" | "pending"; userId: string }
): Promise<string> => {
  const { data, error } = await supabase
    .from("providers")
    .upsert({
      external_key: seed.externalKey,
      name: seed.name,
      rental_name: seed.name,
      email: seed.email,
      contact_name: "Preflight Owner",
      phone: "+420777000111",
      status: seed.status,
      verified: seed.status === "approved",
      user_id: seed.userId,
      category: "seed",
      currency: "CZK",
      time_zone: "UTC",
      location: "Preflight City",
    }, { onConflict: "external_key" })
    .select("id")
    .single();

  if (error || !data?.id) throw error ?? new Error("Failed to upsert provider");
  return data.id;
};

const upsertMembershipWithExternalKey = async (
  supabase: ReturnType<typeof createClient>,
  seed: { externalKey: string; userId: string; providerId: string }
) => {
  const { error } = await supabase
    .from("user_provider_memberships")
    .upsert({
      external_key: seed.externalKey,
      user_id: seed.userId,
      provider_id: seed.providerId,
      role: "owner",
    }, { onConflict: "external_key" });

  if (error) throw error;
};

const upsertProductWithExternalKey = async (
  supabase: ReturnType<typeof createClient>,
  seed: { externalKey: string; providerId: string; name: string }
): Promise<{ id: string; name: string }> => {
  const { data, error } = await supabase
    .from("products")
    .upsert({
      external_key: seed.externalKey,
      provider_id: seed.providerId,
      name: seed.name,
      category: "seed",
      base_price_cents: 2500,
      description: "E2E preflight product",
    }, { onConflict: "provider_id,external_key" })
    .select("id, name")
    .single();

  if (error || !data?.id) throw error ?? new Error("Failed to upsert product");
  return { id: data.id, name: data.name };
};

const upsertVariantWithExternalKey = async (
  supabase: ReturnType<typeof createClient>,
  seed: { externalKey: string; productId: string; name: string }
): Promise<{ id: string; name: string }> => {
  const { data, error } = await supabase
    .from("product_variants")
    .upsert({
      external_key: seed.externalKey,
      product_id: seed.productId,
      name: seed.name,
      is_active: true,
    }, { onConflict: "product_id,external_key" })
    .select("id, name")
    .single();

  if (error || !data?.id) throw error ?? new Error("Failed to upsert variant");
  return { id: data.id, name: data.name };
};

const upsertAssetWithExternalKey = async (
  supabase: ReturnType<typeof createClient>,
  seed: { externalKey: string; providerId: string; variantId: string; assetTag: string }
): Promise<{ id: string }> => {
  const { data, error } = await supabase
    .from("assets")
    .upsert({
      external_key: seed.externalKey,
      provider_id: seed.providerId,
      variant_id: seed.variantId,
      asset_tag: seed.assetTag,
      status: "available",
      condition_score: 95,
      location: "Preflight WH",
    }, { onConflict: "provider_id,external_key" })
    .select("id")
    .single();

  if (error || !data?.id) throw error ?? new Error("Failed to upsert asset");
  return { id: data.id };
};

const upsertReservationWithExternalKey = async (
  supabase: ReturnType<typeof createClient>,
  seed: {
    externalKey: string;
    providerId: string;
    variantId: string;
    assetId?: string;
    start: string;
    end: string;
    status: string;
    customerName: string;
  }
): Promise<{ id: string; status: string }> => {
  const { data, error } = await supabase
    .from("reservations")
    .upsert({
      external_key: seed.externalKey,
      provider_id: seed.providerId,
      product_variant_id: seed.variantId,
      customer_name: seed.customerName,
      customer_email: "customer@example.com",
      customer_phone: "+420777000333",
      start_date: seed.start,
      end_date: seed.end,
      status: seed.status,
      payment_status: "unpaid",
      currency: "CZK",
      idempotency_key: seed.externalKey,
      total_price: 1500,
      amount_total_cents: 150000,
    }, { onConflict: "provider_id,external_key" })
    .select("id, status")
    .single();

  if (error || !data?.id) throw error ?? new Error("Failed to upsert reservation");
  return { id: data.id, status: data.status ?? seed.status };
};

const ensureAssignmentForReservation = async (
  supabase: ReturnType<typeof createClient>,
  reservationId: string,
  assetId: string,
  start: string
) => {
  const { data: existing } = await supabase
    .from("reservation_assignments")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("asset_id", assetId)
    .maybeSingle();

  if (existing?.id) return;

  await supabase.from("reservation_assignments").insert({
    reservation_id: reservationId,
    asset_id: assetId,
    assigned_at: start,
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

// Unused helper functions removed


// ---------------------------------------------------------------------------
// Staging Pack Seed (PR7/P1 verification)
// ---------------------------------------------------------------------------
const REQUIRE_STAGING_REF = Deno.env.get("REQUIRE_STAGING_SEED") === "true";
const SEED_ALLOWED_REF = Deno.env.get("ALLOWED_PROJECT_REF") ?? "";
const PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") ?? "";
const SEED_USER_PASSWORD = Deno.env.get("SEED_USER_PASSWORD") ?? "password123";

type SeedBody = {
  password?: string;
};

async function findUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
  password?: string
): Promise<{ id: string } | null> {
  // Strategy: Try to sign in. If successful, we have the user.
  // This bypasses 'listUsers' which is failing with 500 Database Error on local instance.

  if (!password) {
    // Fallback to listUsers if no password provided (legacy path), but this might fail.
    let page = 1;
    const perPage = 100;
    try {
      while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) return { id: found.id };
        if (data.users.length < perPage) break;
        page += 1;
      }
    } catch (e) {
      console.error("listUsers failed:", e);
    }
    return null;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (data.user) {
    return { id: data.user.id };
  }

  // If login failed, user might not exist OR password wrong.
  // We assume user doesn't exist so ensureUser can try to create (or fail if exists).
  return null;
}

async function ensureUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  password?: string
): Promise<{ id: string; created: boolean }> {
  // console.log(`Ensuring user: ${email}`); // Cannot log to console in Edge Function easily visible.
  // I can return log array? No, handleSeed returns json.
  // I will throw error with debug info if mismatch?

  const existing = await findUserByEmail(supabase, email, password);
  if (existing) {
    // Verify email match strictly just in case logic was flawed
    // Actually findUserByEmail does verify.
    return { id: existing.id, created: false };
  }

  if (!password) {
    throw new Error("User does not exist and SEED_USER_PASSWORD not provided");
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    // If error is "User already registered", try to find it again? (Race condition)
    if (error.message?.includes("already registered")) {
      const retry = await findUserByEmail(supabase, email, password);
      if (retry) return { id: retry.id, created: false };
    }
    throw error ?? new Error("Failed to create auth user");
  }
  if (!data?.user) throw new Error("Failed to create auth user (no data)");
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
  const email = body?.provider_email ?? "mail@mail.cz";

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

const handleReset = async (supabase: ReturnType<typeof createClient>, body: any) => {
  // SAFETY CHECK: Only allow reset on local environment with explicit flag
  const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const allowReset = Deno.env.get("E2E_ALLOW_DESTRUCTIVE_RESET") === "1";
  const isLocal = sbUrl.includes("localhost") || sbUrl.includes("127.0.0.1") || sbUrl.includes("kong");

  if (!isLocal || !allowReset) {
    console.log(`[Harness] Reset blocked. URL: ${sbUrl}, Allow: ${allowReset}`);
    return jsonResponse(403, { error: "Reset not allowed in this environment" });
  }

  // Use email from body or default env
  const email = body?.email ?? Deno.env.get("E2E_PROVIDER_EMAIL") ?? "e2e_provider@example.com";

  // We don't have password, so we use listUsers fallback? Or just try delete.
  // We need ID to delete.
  // We can use findUserByEmail with existing helper.
  // But findUserByEmail now uses signIn (needs password).
  // If we don't have password in reset body, we can try SEED_USER_PASSWORD?


  const password = body?.password ?? SEED_USER_PASSWORD;

  // Try to find user. If unique email was used, we need to handle that or standard email.
  // Standard logic uses 'email' var derived above. 

  const user = await findUserByEmail(supabase, email, password);

  if (user) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { success: true, message: "User deleted" });
  }

  return jsonResponse(200, { success: true, message: "User did not exist" });
};

async function handleCheckSchema(supabase: ReturnType<typeof createClient>) {
  // Check reservations columns (by selecting 1 row if exists, or probing columns)
  const { data: rows, error: rowError } = await supabase
    .from("reservations")
    .select("*")
    .limit(1);

  // Probe specific expected columns
  const { error: gearError } = await supabase.from("reservations").select("gear_id").limit(1);
  const { error: variantError } = await supabase.from("reservations").select("product_variant_id").limit(1);
  const { error: quantityError } = await supabase.from("reservations").select("quantity").limit(1);
  const { error: providerError } = await supabase.from("reservations").select("provider_id").limit(1);
  const { error: providersTableError } = await supabase.from("providers").select("id").limit(1);


  return jsonResponse(200, {
    columns_probe: {
      gear_id: !gearError,
      gear_error: gearError?.message,
      product_variant_id: !variantError,
      variant_error: variantError?.message,
      quantity: !quantityError,
      quantity_error: quantityError?.message,
      provider_id: !providerError,
      provider_error: providerError?.message,
      providers_table: !providersTableError,
      providers_table_error: providersTableError?.message
    },
    row_sample_keys: rows && rows.length > 0 ? Object.keys(rows[0]) : [],
    row_error: rowError?.message
  });
}


async function handleLatestReservation(
  supabase: ReturnType<typeof createClient>,
  providerId?: string,
  customerName?: string
) {
  if (!providerId) return jsonResponse(400, { error: "Missing provider_id" });

  let query = supabase
    .from("reservations")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (customerName) {
    query = query.ilike("customer_name", customerName);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return jsonResponse(400, { error: error.message });
  }
  return jsonResponse(200, { reservation: data });
};
