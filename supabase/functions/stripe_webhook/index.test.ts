import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { decideStripeWebhookOutcome } from "./index.ts";

Deno.test("stripe_webhook replay acknowledged without update", () => {
  const result = decideStripeWebhookOutcome({
    eventType: "payment_intent.succeeded",
    reservationStatus: "hold",
    expired: false,
    hasConflict: false,
    isReplay: true,
  });

  assertEquals(result.shouldUpdate, false);
  assertEquals(result.nextStatus, null);
  assertEquals(result.httpStatus, 200);
});

Deno.test("stripe_webhook late hold confirms when slot free", () => {
  const result = decideStripeWebhookOutcome({
    eventType: "payment_intent.succeeded",
    reservationStatus: "hold",
    expired: true,
    hasConflict: false,
  });

  assertEquals(result.shouldUpdate, true);
  assertEquals(result.nextStatus, "confirmed");
  assertEquals(result.httpStatus, 200);
});
