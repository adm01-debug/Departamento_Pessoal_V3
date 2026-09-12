import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { resendDeliveryId } from "./resendDelivery.ts";

Deno.test("recibo Resend exige id não vazio e textual", () => {
  assertEquals(resendDeliveryId({ id: "email_123" }), "email_123");
  assertEquals(resendDeliveryId({ id: "  email_123  " }), "email_123");
  assertEquals(resendDeliveryId({ id: "" }), null);
  assertEquals(resendDeliveryId({ id: 123 }), null);
  assertEquals(resendDeliveryId(null), null);
});
