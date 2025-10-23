import { assertEquals, assertObjectMatch } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { reservationRequestSchema } from "./validation.ts";

Deno.test("reservationRequestSchema accepts valid payload", () => {
  const payload = {
    gear_id: crypto.randomUUID(),
    provider_id: crypto.randomUUID(),
    start_date: new Date(Date.now() + 60_000).toISOString(),
    end_date: new Date(Date.now() + 120_000).toISOString(),
    idempotency_key: "key-" + crypto.randomUUID(),
    total_price: 150,
    deposit_paid: true,
    customer: {
      name: "Jane Doe",
      email: "jane@example.com",
    },
  };

  const parsed = reservationRequestSchema.parse(payload);

  assertEquals(parsed.gear_id, payload.gear_id);
  assertEquals(parsed.customer?.name, "Jane Doe");
});

Deno.test("reservationRequestSchema rejects invalid payload", () => {
  const payload = {
    gear_id: "not-a-uuid",
    provider_id: crypto.randomUUID(),
    start_date: "invalid-date",
    end_date: "2024-01-01T00:00:00Z",
    idempotency_key: "short",
  };

  const result = reservationRequestSchema.safeParse(payload);

  assertEquals(result.success, false);
  if (!result.success) {
    assertObjectMatch(result.error.format(), {
      gear_id: { _errors: ["Invalid uuid"] },
    });
  }
});

Deno.test("reservationRequestSchema accepts quantity field", () => {
  const payload = {
    gear_id: crypto.randomUUID(),
    provider_id: crypto.randomUUID(),
    start_date: new Date(Date.now() + 60_000).toISOString(),
    end_date: new Date(Date.now() + 120_000).toISOString(),
    idempotency_key: "key-" + crypto.randomUUID(),
    quantity: 2,
    customer: {
      name: "John Doe",
    },
  };

  const parsed = reservationRequestSchema.parse(payload);

  assertEquals(parsed.quantity, 2);
});

Deno.test("reservationRequestSchema defaults quantity to 1 when omitted", () => {
  const payload = {
    gear_id: crypto.randomUUID(),
    provider_id: crypto.randomUUID(),
    start_date: new Date(Date.now() + 60_000).toISOString(),
    end_date: new Date(Date.now() + 120_000).toISOString(),
    idempotency_key: "key-" + crypto.randomUUID(),
    customer: {
      name: "John Doe",
    },
  };

  const parsed = reservationRequestSchema.parse(payload);

  assertEquals(parsed.quantity, 1);
});

Deno.test("reservationRequestSchema rejects invalid quantity", () => {
  const payloadZero = {
    gear_id: crypto.randomUUID(),
    provider_id: crypto.randomUUID(),
    start_date: new Date(Date.now() + 60_000).toISOString(),
    end_date: new Date(Date.now() + 120_000).toISOString(),
    idempotency_key: "key-" + crypto.randomUUID(),
    quantity: 0,
    customer: { name: "Test" },
  };

  const resultZero = reservationRequestSchema.safeParse(payloadZero);
  assertEquals(resultZero.success, false);

  const payloadNegative = { ...payloadZero, quantity: -5 };
  const resultNegative = reservationRequestSchema.safeParse(payloadNegative);
  assertEquals(resultNegative.success, false);

  const payloadTooHigh = { ...payloadZero, quantity: 150 };
  const resultTooHigh = reservationRequestSchema.safeParse(payloadTooHigh);
  assertEquals(resultTooHigh.success, false);
});
