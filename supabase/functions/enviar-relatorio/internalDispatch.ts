const HMAC_COMPARISON_KEY = "dp-report-dispatch-comparison-key";

export type ReportDispatchRequest = {
  agendamentoId: string | undefined;
  claimToken: string | undefined;
  tipoRelatorio: string;
  formato: string;
  emailDestinatario: string;
  empresaId: string;
};

export type StoredReportSchedule = {
  id: string;
  created_by: string | null;
  empresa_id: string | null;
  tipo_relatorio: string;
  formato: string;
  email_destinatario: string;
  ativo: boolean | null;
  dispatch_claim_token: string | null;
};

/**
 * Permite somente a chamada serviço-a-serviço do processador de agendas.
 *
 * O segredo separado evita que uma chave de cron ou uma service-role JWT seja
 * por si só uma autorização para despachar relatórios. HMAC mantém a
 * comparação em tempo constante, inclusive quando os valores têm comprimentos
 * diferentes.
 */
export async function hasValidReportDispatchSecret(
  provided: string,
  configured: string,
): Promise<boolean> {
  if (!provided || !configured) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(HMAC_COMPARISON_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const [providedSignature, configuredSignature] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(provided)),
    crypto.subtle.sign("HMAC", key, encoder.encode(configured)),
  ]);

  const actual = new Uint8Array(providedSignature);
  const expected = new Uint8Array(configuredSignature);
  let difference = actual.length ^ expected.length;
  const maxLength = Math.max(actual.length, expected.length);
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (actual[index] ?? 0) ^ (expected[index] ?? 0);
  }
  return difference === 0;
}

/**
 * A chamada interna não pode escolher outro destinatário, tenant ou tipo de
 * relatório e usar a autoria de um agendamento legítimo. O payload deve ser
 * idêntico ao registro persistido, e o agendamento precisa ter um criador para
 * que a permissão RH/admin seja revalidada no momento da entrega.
 */
export function requestMatchesStoredReportSchedule(
  request: ReportDispatchRequest,
  schedule: StoredReportSchedule,
): boolean {
  return Boolean(schedule.created_by) &&
    schedule.ativo === true &&
    Boolean(schedule.dispatch_claim_token) &&
    request.agendamentoId === schedule.id &&
    request.claimToken === schedule.dispatch_claim_token &&
    request.empresaId === schedule.empresa_id &&
    request.tipoRelatorio === schedule.tipo_relatorio &&
    request.formato === schedule.formato &&
    request.emailDestinatario === schedule.email_destinatario.trim().toLowerCase();
}
