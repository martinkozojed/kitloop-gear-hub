import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/error-utils";
import { logger } from "@/lib/logger";

const HOLD_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVE_RESERVATION_STATUSES = ["hold", "confirmed", "active"] as const;
const EDGE_FUNCTION_NAME = "reserve_gear";

type ActiveStatus = typeof ACTIVE_RESERVATION_STATUSES[number];

export interface ReservationCustomerPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface CreateReservationHoldInput {
  providerId: string;
  gearId?: string; // Made optional for Inventory 2.0
  productVariantId?: string; // New for Inventory 2.0
  startDate: Date;
  endDate: Date;
  idempotencyKey?: string;
  totalPrice: number;
  depositPaid: boolean;
  notes?: string | null;
  customer: ReservationCustomerPayload;
  rentalDays: number;
  pricePerDay: number;
  customerUserId?: string | null;
}

export interface ReservationHoldResult {
  reservation_id: string;
  expires_at: string | null;
  status: ActiveStatus | "hold";
  idempotent: boolean;
  via: "direct" | "edge";
}

export class ReservationError extends Error {
  code:
    | "conflict"
    | "idempotent"
    | "rls_denied"
    | "validation"
    | "edge_failed"
    | "network"
    | "unknown";
  details?: unknown;

  constructor(
    code: ReservationError["code"],
    message: string,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const asUtcISOString = (date: Date) => date.toISOString();

const buildPricingSnapshot = (pricePerDay: number, rentalDays: number) => {
  const dailyRateCents = Math.max(0, Math.round(pricePerDay * 100));
  const subtotalCents = Math.max(
    0,
    Math.round(rentalDays * pricePerDay * 100)
  );

  return {
    daily_rate_cents: dailyRateCents,
    days: rentalDays,
    currency: "CZK",
    subtotal_cents: subtotalCents,
  };
};

const checkForOverlap = async (
  gearId: string | undefined,
  variantId: string | undefined,
  startIso: string,
  endIso: string
) => {
  if (variantId) {
    const { data: isAvailable, error } = await supabase.rpc('check_variant_availability', {
      p_variant_id: variantId,
      p_start_date: startIso,
      p_end_date: endIso
    });

    if (error) throw new ReservationError("unknown", "Failed to check availability", error);

    if (isAvailable === false) {
      throw new ReservationError("conflict", "Selected dates are not available for this item.");
    }
    return;
  }

  if (gearId) {
    const { data, error } = await supabase
      .from("reservations")
      .select("id, start_date, end_date, status")
      .eq("gear_id", gearId)
      .in("status", ACTIVE_RESERVATION_STATUSES)
      .lt("start_date", endIso)
      .gt("end_date", startIso);

    if (error) {
      throw new ReservationError(
        "unknown",
        getErrorMessage(error) || "Chyba při kontrole termínu",
        error
      );
    }

    if (data && data.length > 0) {
      throw new ReservationError(
        "conflict",
        "V tomto termínu již existuje jiná rezervace."
      );
    }
  }
};

const insertReservationDirectly = async (
  input: CreateReservationHoldInput,
  startIso: string,
  endIso: string,
  expiresAtIso: string,
  idempotencyKey: string
): Promise<ReservationHoldResult> => {
  const pricingSnapshot = buildPricingSnapshot(
    input.pricePerDay,
    input.rentalDays
  );

  const amountTotalCents = Math.max(
    0,
    Math.round(input.totalPrice * 100)
  );

  const insertPayload = {
    provider_id: input.providerId,
    gear_id: input.gearId ?? null,
    product_variant_id: input.productVariantId ?? null,
    user_id: input.customerUserId ?? null,
    customer_name: input.customer.name.trim() || "Neznámý zákazník",
    customer_email: input.customer.email?.trim() || null,
    customer_phone: input.customer.phone?.trim() || null,
    start_date: startIso,
    end_date: endIso,
    status: "hold" as const,
    payment_status: "unpaid" as const,
    notes: input.notes?.trim() || null,
    total_price: input.totalPrice ?? null,
    deposit_paid: input.depositPaid ?? false,
    amount_total_cents: amountTotalCents ?? null,
    currency: "CZK",
    pricing_snapshot: pricingSnapshot,
    idempotency_key: idempotencyKey,
    expires_at: expiresAtIso,
  };

  const { data, error } = await supabase
    .from("reservations")
    .insert(insertPayload)
    .select("id, expires_at, status, idempotency_key")
    .single();

  if (error) {
    // ... error handling ...
    logger.error("Reservation insert failed", error);
    if (error.code === "23505") { // ... existing error handling ...
      const message = error.message ?? "";
      if (message.includes("reservations_provider_id_idempotency_key_key")) {
        // ... existing idempotency handling ...
        const { data: existing, error: fetchError } = await supabase
          .from("reservations")
          .select("id, expires_at, status")
          .eq("provider_id", input.providerId)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (fetchError) throw new ReservationError("idempotent", "Fetch failed", fetchError);
        if (existing) return { reservation_id: existing.id, expires_at: existing.expires_at, status: existing.status as ActiveStatus ?? "hold", idempotent: true, via: "direct" };
        throw new ReservationError("idempotent", "Reservation already created");
      }
    }
    // ... other error codes ...
    if (error.code === "23P01" || error.message?.includes("reservations_no_overlap")) {
      throw new ReservationError("conflict", "Termín se překrývá s jinou rezervací.");
    }
    if (error.code === "42501") throw new ReservationError("rls_denied", "Nemáte oprávnění vytvořit rezervaci.", error);

    throw new ReservationError("unknown", getErrorMessage(error) || "Rezervaci se nepodařilo vytvořit.", error);
  }

  if (!data) {
    throw new ReservationError("unknown", "Supabase nevrátilo data o nové rezervaci.");
  }

  // V3: Create Reservation Line (Demand)
  // Currently MVP supports 1 item per reservation, so we create 1 line.
  if (input.productVariantId || input.gearId) { // Fallback to gearId if variant not present (legacy)
    // ideally find variant from gearId if needed, but for now assuming variantId is passed for V3
    const variantId = input.productVariantId;

    if (variantId) {
      const { error: lineError } = await supabase
        .from('reservation_lines')
        .insert({
          reservation_id: data.id,
          product_variant_id: variantId,
          quantity: 1, // MVP 1 qty
          price_per_item_cents: (input.totalPrice * 100) // Snapshot price
        });

      if (lineError) {
        logger.error("Failed to create reservation line", lineError);
        // Non-blocking but critical for V3 data integrity. 
        // Should we rollback? For now, logging error.
      }
    }
  }

  return {
    reservation_id: data.id,
    expires_at: data.expires_at,
    status: (data.status as ActiveStatus) ?? "hold",
    idempotent: false,
    via: "direct",
  };
};

const invokeEdgeReserveGear = async (
  input: CreateReservationHoldInput,
  startIso: string,
  endIso: string,
  idempotencyKey: string
): Promise<ReservationHoldResult> => {
  const { data, error } = await supabase.functions.invoke(
    EDGE_FUNCTION_NAME,
    {
      body: {
        gear_id: input.gearId,
        provider_id: input.providerId,
        start_date: startIso,
        end_date: endIso,
        idempotency_key: idempotencyKey,
        total_price: input.totalPrice,
        deposit_paid: input.depositPaid,
        notes: input.notes?.trim() || null,
        user_id: input.customerUserId ?? null,
        customer: {
          name: input.customer.name,
          email: input.customer.email?.trim() || null,
          phone: input.customer.phone?.trim() || null,
        },
      },
    }
  );

  if (error) {
    throw new ReservationError(
      "edge_failed",
      typeof error.message === "string"
        ? error.message
        : getErrorMessage(error) || "Edge funkce rezervace selhala.",
      error
    );
  }

  if (!data || !data.reservation_id) {
    throw new ReservationError(
      "edge_failed",
      "Edge funkce nevrátila platnou odpověď."
    );
  }

  return {
    reservation_id: data.reservation_id,
    expires_at: data.expires_at ?? null,
    status: (data.status as ActiveStatus) ?? "hold",
    idempotent: Boolean(data.idempotent),
    via: "edge",
  };
};

export const createReservationHold = async (
  input: CreateReservationHoldInput
): Promise<ReservationHoldResult> => {
  const idempotencyKey = input.idempotencyKey ?? crypto.randomUUID();
  const startIso = asUtcISOString(input.startDate);
  const endIso = asUtcISOString(input.endDate);
  const expiresAtIso = new Date(
    Date.now() + HOLD_DURATION_MS
  ).toISOString();

  try {
    await checkForOverlap(input.gearId, input.productVariantId, startIso, endIso);

    return await insertReservationDirectly(
      input,
      startIso,
      endIso,
      expiresAtIso,
      idempotencyKey
    );
  } catch (error) {
    if (error instanceof ReservationError) {
      if (error.code === "rls_denied") {
        return invokeEdgeReserveGear(
          input,
          startIso,
          endIso,
          idempotencyKey
        );
      }
      // ...

      if (error.code === "conflict" || error.code === "idempotent") {
        throw error;
      }

      // Try edge fallback only when direct insert failed for non-conflict reasons
      try {
        return await invokeEdgeReserveGear(
          input,
          startIso,
          endIso,
          idempotencyKey
        );
      } catch (edgeError) {
        if (edgeError instanceof ReservationError) {
          throw edgeError;
        }
        throw new ReservationError(
          "edge_failed",
          getErrorMessage(edgeError) || "Edge funkce se nezdařila.",
          edgeError
        );
      }
    }

    // Unknown error type – attempt edge fallback
    try {
      return await invokeEdgeReserveGear(
        input,
        startIso,
        endIso,
        idempotencyKey
      );
    } catch (edgeError) {
      if (edgeError instanceof ReservationError) {
        throw edgeError;
      }
      throw new ReservationError(
        "edge_failed",
        getErrorMessage(edgeError) || "Edge funkce se nezdařila.",
        edgeError
      );
    }
  }
};

export interface CreatePaymentIntentInput {
  reservationId: string;
}

export interface PaymentIntentResult {
  reservationId: string;
  paymentIntentId: string;
  clientSecret: string;
}

export const createPaymentIntent = async (
  input: CreatePaymentIntentInput
): Promise<PaymentIntentResult> => {
  const { data, error } = await supabase.functions.invoke(
    "create_payment_intent",
    {
      body: {
        reservation_id: input.reservationId,
      },
    }
  );

  if (error) {
    throw new ReservationError(
      "edge_failed",
      typeof error.message === "string"
        ? error.message
        : getErrorMessage(error) || "Failed to create payment intent.",
      error
    );
  }

  if (!data || !data.client_secret) {
    throw new ReservationError(
      "edge_failed",
      "Edge function returned invalid payment data."
    );
  }

  return {
    reservationId: data.reservation_id,
    paymentIntentId: data.payment_intent_id,
    clientSecret: data.client_secret,
  };
};
