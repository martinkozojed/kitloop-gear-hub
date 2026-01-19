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
      .rpc('check_variant_availability', {
        p_variant_id: gearId,
        p_start_date: startIso,
        p_end_date: endIso
      });

    if (error) {
      throw new ReservationError(
        "unknown",
        getErrorMessage(error) || "Chyba při kontrole termínu",
        error
      );
    }

    if (data === false) {
      throw new ReservationError(
        "conflict",
        "V tomto termínu již existuje jiná rezervace."
      );
    }
  }
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
        gear_id: input.gearId || input.productVariantId,
        provider_id: input.providerId,
        start_date: startIso,
        end_date: endIso,
        idempotency_key: idempotencyKey,
        total_price: input.totalPrice,
        deposit_paid: input.depositPaid,
        notes: input.notes?.trim() || undefined,
        user_id: input.customerUserId ?? undefined,
        customer: {
          name: input.customer.name,
          email: input.customer.email?.trim() || undefined,
          phone: input.customer.phone?.trim() || undefined,
        },
      },
    }
  );

  if (error) {
    let errorBody = "Unknown";
    try {
      if (error && typeof (error as any).context?.json === 'function') {
        const json = await (error as any).context.json();
        errorBody = JSON.stringify(json, null, 2);
      } else if (error && typeof (error as any).context?.text === 'function') {
        errorBody = await (error as any).context.text();
      }
    } catch (e) {
      errorBody = "Could not read body";
    }
    if (import.meta.env.DEV) {
      console.error('[ResService] Edge Error Body:', errorBody);
    }

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

    // Always use edge path for inserts to enforce locking and server-side constraints
    return await invokeEdgeReserveGear(
      input,
      startIso,
      endIso,
      idempotencyKey
    );
  } catch (error) {
    if (error instanceof ReservationError) {
      if (error.code === "conflict" || error.code === "idempotent") {
        throw error;
      }

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
