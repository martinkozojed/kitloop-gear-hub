/** Public-facing provider profile types (no auth-sensitive fields). */

export interface PublicProvider {
  id: string;
  rental_name: string;
  name: string | null;
  slug: string | null;
  location: string | null;
  address: string | null;
  phone: string;
  email: string;
  website: string | null;
  business_hours: Record<string, { open: string; close: string }> | null;
  business_hours_display: string | null;
  pickup_instructions: string | null;
  terms_text: string | null;
  logo_url: string | null;
  currency: string | null;
  public_booking_enabled: boolean;
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_price_cents: number | null;
  image_url: string | null;
  product_variants: PublicVariant[];
}

export interface PublicVariant {
  id: string;
  name: string;
  sku: string | null;
  attributes: Record<string, unknown> | null;
  price_override_cents: number | null;
  is_active: boolean | null;
}
