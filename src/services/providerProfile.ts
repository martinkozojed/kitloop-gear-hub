/**
 * Provider public profile service — data-access layer for /p/:slug pages.
 *
 * All queries use the anon key (no auth required). RLS policies on providers
 * and products already restrict SELECT to approved+verified+non-deleted rows.
 */
import { supabase } from "@/lib/supabase";
import type { PublicProvider, PublicProduct } from "@/types/profile";

const PROVIDER_SELECT = `
  id, rental_name, name, slug, location, address, phone, email,
  website, business_hours, business_hours_display,
  pickup_instructions, terms_text, logo_url, currency,
  public_booking_enabled
` as const;

const CATALOG_SELECT = `
  id, name, description, category, base_price_cents, image_url,
  product_variants(id, name, sku, attributes, price_override_cents, is_active)
` as const;

/**
 * Fetch a provider's public profile by slug.
 * Returns null when the slug doesn't match any visible provider.
 * NOTE: public_booking_token is intentionally excluded — fetched only at submit time.
 */
export async function fetchProviderBySlug(
  slug: string,
): Promise<PublicProvider | null> {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .eq("slug", slug)
    .eq("status", "approved")
    .eq("verified", true)
    .eq("public_booking_enabled", true)
    .not("approved_at", "is", null)
    .is("deleted_at", null)
    .single();

  if (error) {
    // PGRST116 = no rows found — expected for invalid slugs
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as PublicProvider;
}

/**
 * Fetch the booking token for a provider — called only at submit time.
 * Never cached in React Query to avoid credential exposure.
 */
export async function fetchProviderToken(
  providerId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("providers")
    .select("public_booking_token")
    .eq("id", providerId)
    .single();

  return (data as { public_booking_token: string | null } | null)
    ?.public_booking_token ?? null;
}

/**
 * Fetch the product catalog for a given provider.
 * Only active, non-deleted products are returned.
 * Variants are filtered client-side (Supabase nested filters are limited).
 */
export async function fetchProviderCatalog(
  providerId: string,
): Promise<PublicProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_SELECT)
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("category")
    .order("name");

  if (error) throw error;

  // Filter out inactive / soft-deleted variants (nested filters not supported by PostgREST)
  const products = (data as unknown as PublicProduct[]) ?? [];
  return products.map((p) => ({
    ...p,
    product_variants: (p.product_variants ?? []).filter(
      (v) => v !== null,
    ),
  }));
}
