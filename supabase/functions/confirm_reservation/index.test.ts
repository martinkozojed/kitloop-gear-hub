import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  HttpError,
  ensureHoldActive,
  validateConfirmPayload,
} from "./index.ts";

const { createPaymentIntentRequestSchema } = await import(
  "./create_payment_intent/index.ts"
);

Deno.env.set("STRIPE_WEBHOOK_SECRET", "unit_test_secret");
const { verifyStripeSignature } = await import("./stripe_webhook/index.ts");

Deno.test("validateConfirmPayload accepts valid body", () => {
  const reservationId = crypto.randomUUID();
  const payload = {
    reservation_id: reservationId,
    payment_intent_id: "pi_test_123",
  };

  const parsed = validateConfirmPayload(payload);

  assertEquals(parsed.reservation_id, reservationId);
  assertEquals(parsed.payment_intent_id, "pi_test_123");
});

Deno.test("ensureHoldActive enforces status hold", () => {
  assertThrows(
    () =>
      ensureHoldActive({
        status: "confirmed",
        expires_at: new Date(Date.now() + 60_000),
      }),
    HttpError,
    "Reservation is not in hold state",
  );
});

Deno.test("ensureHoldActive rejects expired holds", () => {
  assertThrows(
    () =>
      ensureHoldActive({
        status: "hold",
        expires_at: new Date(Date.now() - 5_000),
      }),
    HttpError,
    "Reservation hold has expired",
  );
});

Deno.test("createPaymentIntentRequestSchema validates reservation_id", () => {
  const good = createPaymentIntentRequestSchema.parse({
    reservation_id: crypto.randomUUID(),
  });
  assertEquals(typeof good.reservation_id, "string");

  assertThrows(
    () =>
      createPaymentIntentRequestSchema.parse({
        reservation_id: "not-a-uuid",
      }),
    Error,
    "Invalid",
  );
});

Deno.test("verifyStripeSignature rejects invalid signatures", async () => {
  const payload = JSON.stringify({ test: true });
  await assertThrows(
    async () => {
      await verifyStripeSignature(payload, "t=123,v1=bad");
    },
    Error,
    "Invalid Stripe signature",
  );
});

Deno.test("verifyStripeSignature accepts valid signature", async () => {
  const payload = JSON.stringify({ hello: "world" });
  const timestamp = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(Deno.env.get("STRIPE_WEBHOOK_SECRET")!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );
  const signature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`);
});
