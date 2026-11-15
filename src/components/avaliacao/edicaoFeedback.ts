/**
 * ============================================================================
 * EDIÇÃO DE FEEDBACK — REGRA ÚNICA DE STATUS.
 *
 * Feedback `cancelado` é SOMENTE LEITURA. A única forma de voltar a editá-lo é
 * a reabertura administrativa (`finalizar_feedback(..., 'reabrir', motivo)`,
 * RH/admin, auditada). Nenhuma superfície pode transformar cancelado em
 * `pendente` como efeito colateral de uma edição.
 *
 * A regra vive aqui para ser consumida em TODAS as camadas do cliente:
 *   • ação canônica do card (`getFeedbackActions`);
 *   • abertura do formulário (`FeedbacksTab`);
 *   • botão Salvar do formulário (`NovoFeedbackDialog`);
 *   • persistência demonstrativa (`desempenhoDemoStore`);
 *   • mutation de edição da página (`AvaliacaoPage`).
 *
 * O backend NÃO depende deste arquivo: `editar_feedback_seguro` já recusa
 * `feedback_cancelado_nao_editavel` e o UPDATE direto está revogado.
 * ============================================================================
 */

/** Texto exibido no `title` do controle desabilitado e usado nos erros locais. */
export const MOTIVO_EDICAO_CANCELADA =
  'Feedback cancelado não pode ser editado. Reabra a avaliação com justificativa (RH/admin) antes de alterar os dados.';

/**
 * Chave tolerante a caixa/acento/espaços — a coluna `feedbacks_360.status` é
 * TEXT livre e registros históricos podem trazer `Cancelada`, `cancelado ` etc.
 */
function chaveStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

/** `true` para qualquer variação conhecida de cancelamento. */
export function feedbackCancelado(status: unknown): boolean {
  return ['cancelado', 'cancelada', 'cancel'].includes(chaveStatus(status));
}

/**
 * Motivo que impede a edição, ou `null` quando ela é permitida.
 * `pendente` e `concluído` continuam editáveis (concluído reabre pela RPC).
 */
export function impedimentoEdicaoFeedback(status: unknown): string | null {
  return feedbackCancelado(status) ? MOTIVO_EDICAO_CANCELADA : null;
}
