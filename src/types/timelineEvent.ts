// Histórico do Colaborador — camada de normalização de leitura.
// Junta eventos vindos de múltiplas tabelas/queries já existentes (vínculos,
// histórico salarial, contratos, cargo, promoções, transferências, férias,
// afastamentos, treinamentos, feedbacks 360, onboarding, medidas
// disciplinares, desligamentos, audit_log) num formato único pra timeline.
// Não cria tabela nova nem muda regra de negócio — só reformata leitura.
export type TimelineEventType =
  | 'vinculo'
  | 'salario'
  | 'contrato'
  | 'cargo'
  | 'promocao'
  | 'transferencia'
  | 'ferias'
  | 'afastamento'
  | 'treinamento'
  | 'avaliacao'
  | 'onboarding'
  | 'medida_disciplinar'
  | 'desligamento'
  | 'auditoria';

export interface TimelineAuditFieldChange {
  campo: string;
  de: unknown;
  para: unknown;
}

/** Só existe pra eventos tipo `auditoria` — alimenta o drawer "Ver detalhes". */
export interface TimelineAuditDetail {
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  userEmail?: string;
  alteracoes: TimelineAuditFieldChange[];
}

export interface TimelineEvent {
  id: string;
  /** ISO (yyyy-MM-dd ou timestamp completo) — vem direto da coluna de origem. */
  date: string;
  type: TimelineEventType;
  title: string;
  /** Linha 1 de detalhe (ex.: período, valores, motivo). Só aparece quando existe dado real. */
  description?: string;
  /** Linha 2, metadado secundário (ex.: carga horária, nota). Só aparece quando existe dado real. */
  secondary?: string;
  /** Tabela/origem do evento — usado pra dedupe e pro menu "..." saber que ação oferecer. */
  source: string;
  /** Só presente em eventos de auditoria — diff completo pro "Ver detalhes". */
  auditDetail?: TimelineAuditDetail;
  /** Só presente quando o evento tem uma exclusão real disponível (histórico de contratos). */
  onDelete?: () => void;
}
