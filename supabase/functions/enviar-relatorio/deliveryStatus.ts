/**
 * A API do Resend aceita uma solicitação somente quando devolve um recibo
 * identificável. Um HTTP 2xx sem `id` não é prova suficiente de que o e-mail
 * entrou na fila do provedor e, portanto, não pode avançar um agendamento.
 */
export { resendDeliveryId } from "../_shared/resendDelivery.ts";

export type ReportDeliveryStatus = "sucesso" | "erro" | "indisponivel";

/**
 * Preserva a semântica de negócio para callers assíncronos: qualquer coisa
 * diferente de uma entrega confirmada precisa ser um HTTP não-2xx, para que
 * fila, cron e monitoramento possam tentar novamente e não avancem o cursor.
 */
export function reportDeliveryHttpStatus(
  status: ReportDeliveryStatus,
): 200 | 502 | 503 {
  switch (status) {
    case "sucesso":
      return 200;
    case "erro":
      return 502;
    case "indisponivel":
      return 503;
  }
}

export const REPORT_DELIVERY_UNAVAILABLE_MESSAGE =
  "Serviço de entrega de relatórios indisponível.";

export const REPORT_DELIVERY_FAILED_MESSAGE =
  "O provedor de e-mail não confirmou o envio do relatório.";
