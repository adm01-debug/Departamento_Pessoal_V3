import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  ALERT_EMAIL_UNAVAILABLE_MESSAGE,
  alertDeliveryHttpStatus,
} from "./deliveryStatus.ts";

Deno.test("alertas não recebem sucesso HTTP sem entrega externa confirmada", () => {
  assertEquals(alertDeliveryHttpStatus("accepted"), 200);
  assertEquals(alertDeliveryHttpStatus("not_needed"), 200);
  assertEquals(alertDeliveryHttpStatus("rejected"), 502);
  assertEquals(alertDeliveryHttpStatus("not_configured"), 503);
  assertEquals(alertDeliveryHttpStatus("no_recipients"), 503);
  assertEquals(
    ALERT_EMAIL_UNAVAILABLE_MESSAGE,
    "O provedor de e-mail não está disponível para os alertas.",
  );
});
