export type AlertEmailDeliveryStatus =
  | "accepted"
  | "not_configured"
  | "no_recipients"
  | "rejected";

/**
 * Alertas persistidos no produto não substituem um e-mail solicitado. Apenas
 * uma aceitação com recibo do provedor confirma a entrega externa.
 */
export function alertDeliveryHttpStatus(
  status: AlertEmailDeliveryStatus,
): 200 | 502 | 503 {
  switch (status) {
    case "accepted":
      return 200;
    case "rejected":
      return 502;
    case "not_configured":
    case "no_recipients":
      return 503;
  }
}

export const ALERT_EMAIL_UNAVAILABLE_MESSAGE =
  "O provedor de e-mail não está disponível para os alertas.";
