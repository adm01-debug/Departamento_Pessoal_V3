export type ReportScheduleFrequency = 'diario' | 'semanal' | 'mensal';

export const REPORT_SCHEDULE_TYPES = [
  'lista_colaboradores',
  'folha_resumo',
  'ferias_proximas',
  'afastamentos_ativos',
  'indicadores_dp',
] as const;

export type ReportScheduleType = (typeof REPORT_SCHEDULE_TYPES)[number];

export function isReportScheduleType(value: string): value is ReportScheduleType {
  return (REPORT_SCHEDULE_TYPES as readonly string[]).includes(value);
}

export type ReportScheduleForm = {
  nome: string;
  tipo_relatorio: ReportScheduleType;
  frequencia: ReportScheduleFrequency;
  email_destinatario: string;
  hora_envio: string;
  dia_semana: number;
  dia_mes: number;
};

/**
 * Contrato único entre a tela e `enviar-relatorio`.
 *
 * A Edge Function gera somente JSON/CSV. O agendamento anterior gravava PDF
 * e não incluía o tenant em `parametros`, tornando toda execução assíncrona
 * inválida. A autoria é derivada de auth.uid() pelo trigger do banco e nunca
 * aceita um identificador escolhido pelo browser.
 */
export function buildReportScheduleInsert(form: ReportScheduleForm, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id é obrigatório');

  return {
    nome: form.nome,
    tipo_relatorio: form.tipo_relatorio,
    frequencia: form.frequencia,
    email_destinatario: form.email_destinatario,
    hora_envio: form.hora_envio,
    formato: 'csv' as const,
    empresa_id: empresaId,
    ativo: true,
    parametros: { empresaId },
    dia_semana: form.frequencia === 'semanal' ? form.dia_semana : null,
    dia_mes: form.frequencia === 'mensal' ? form.dia_mes : null,
  };
}
