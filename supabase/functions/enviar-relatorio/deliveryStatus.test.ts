import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  REPORT_DELIVERY_FAILED_MESSAGE,
  REPORT_DELIVERY_UNAVAILABLE_MESSAGE,
  reportDeliveryHttpStatus,
  resendDeliveryId,
} from "./deliveryStatus.ts";

Deno.test("só aceita um e-mail Resend com recibo não vazio", () => {
  assertEquals(resendDeliveryId({ id: "email_123" }), "email_123");
  assertEquals(resendDeliveryId({ id: "  email_123  " }), "email_123");
  assertEquals(resendDeliveryId({}), null);
  assertEquals(resendDeliveryId({ id: "" }), null);
  assertEquals(resendDeliveryId({ id: 123 }), null);
  assertEquals(resendDeliveryId(null), null);
});

Deno.test("indisponibilidade e rejeição não recebem confirmação HTTP de entrega", () => {
  assertEquals(reportDeliveryHttpStatus("sucesso"), 200);
  assertEquals(reportDeliveryHttpStatus("erro"), 502);
  assertEquals(reportDeliveryHttpStatus("indisponivel"), 503);
  assertEquals(
    REPORT_DELIVERY_UNAVAILABLE_MESSAGE,
    "Serviço de entrega de relatórios indisponível.",
  );
  assertEquals(
    REPORT_DELIVERY_FAILED_MESSAGE,
    "O provedor de e-mail não confirmou o envio do relatório.",
  );
});
