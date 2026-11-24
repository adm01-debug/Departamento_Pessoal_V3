/**
 * ============================================================================
 * Constantes compartilhadas da área de Desligamentos.
 *
 * Mesmo papel de `admissoes/admissoesComum.ts`: fonte ÚNICA dos rótulos de
 * etapa, dos selos de status/tipo, da ordem REAL do fluxo de desligamento e do
 * mapa de "próxima ação" por etapa. O Dashboard (KPIs/alerta/gráfico), a Gestão
 * (filtros/etapas/tabela) e o drawer de detalhes leem ESTE arquivo — nenhum
 * deles recria rótulo, cor ou texto de etapa por conta própria.
 *
 * Vermelho desta área: estados críticos (atraso, cancelamento) usam a variante
 * `destructive-vivid` — e não o `--destructive` do tema, um vinho de ~2:1 de
 * contraste sobre o navy que some no fundo (mesmo critério já adotado em
 * Admissões). O token vive em `src/index.css`.
 * ============================================================================
 */

/** Tons semânticos da paleta usados pelos indicadores desta área. */
export type Tone = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

/** Etapas reais do fluxo de desligamento (coluna `etapa` de `desligamentos`). */
export type EtapaDesligamento =
  | 'comunicacao'
  | 'documentacao'
  | 'calculo'
  | 'homologacao'
  | 'pagamento'
  | 'finalizado';

/** Rótulo curto de cada etapa (chips de filtro rápido e selo da tabela). */
export const ETAPA_LABELS: Record<string, string> = {
  comunicacao: 'Solicitação',
  documentacao: 'Documentos',
  calculo: 'Cálculo',
  homologacao: 'Aprovação',
  pagamento: 'Pagamento',
  finalizado: 'Finalização',
};

/**
 * Ordem REAL do fluxo: as etapas que ainda exigem trabalho, na sequência em que
 * acontecem. É a régua das pills de filtro rápido e do progresso por etapa.
 */
export const ETAPA_FLUXO: readonly EtapaDesligamento[] = [
  'comunicacao',
  'documentacao',
  'calculo',
  'homologacao',
  'pagamento',
  'finalizado',
] as const;

/** Selo de etapa (fundo translúcido + tinta vibrante), por tom semântico. */
export const ETAPA_BADGE: Record<string, string> = {
  comunicacao: 'bg-muted/60 text-muted-foreground',
  documentacao: 'bg-warning/15 text-warning',
  calculo: 'bg-info/15 text-info',
  homologacao: 'bg-primary/15 text-primary',
  pagamento: 'bg-warning/15 text-warning',
  finalizado: 'bg-success/15 text-success',
};

/* ─── Status ──────────────────────────────────────────────────────────────── */

export const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  comunicado: 'Comunicado',
  calculado: 'Em Cálculo',
  homologado: 'Homologado',
  pagamento: 'Em Pagamento',
  finalizado: 'Finalizado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const STATUS_BADGE: Record<string, string> = {
  pendente: 'bg-warning/15 text-warning border-warning/30',
  comunicado: 'bg-info/15 text-info border-info/30',
  calculado: 'bg-info/15 text-info border-info/30',
  homologado: 'bg-primary/15 text-primary border-primary/30',
  pagamento: 'bg-warning/15 text-warning border-warning/30',
  finalizado: 'bg-success/15 text-success border-success/30',
  em_andamento: 'bg-info/15 text-info border-info/30',
  concluido: 'bg-success/15 text-success border-success/30',
  cancelado: 'bg-destructive-vivid/15 text-destructive-vivid border-destructive-vivid/30',
};

/* ─── Tipo de desligamento ────────────────────────────────────────────────── */

export const TIPO_LABELS: Record<string, string> = {
  sem_justa_causa: 'Sem Justa Causa',
  com_justa_causa: 'Justa Causa',
  pedido_demissao: 'Pedido Demissão',
  acordo_mutuo: 'Acordo Mútuo',
  termino_contrato: 'Término Contrato',
};

export const TIPO_BADGE: Record<string, string> = {
  sem_justa_causa: 'bg-destructive-vivid/10 text-destructive-vivid border-destructive-vivid/20',
  com_justa_causa: 'bg-destructive-vivid/20 text-destructive-vivid border-destructive-vivid/40',
  pedido_demissao: 'bg-warning/10 text-warning border-warning/20',
  acordo_mutuo: 'bg-info/10 text-info border-info/20',
  termino_contrato: 'bg-muted text-muted-foreground border-border/30',
};

/* ─── Próxima ação por etapa (orientação de processo, não dado do banco) ───── */

/**
 * Texto de "próxima ação" da coluna operacional da Gestão de Desligamentos.
 * É a MESMA estrutura de `ETAPA_PROXIMA_ACAO` de Admissões: um mapa etapa →
 * ação, lido por um único helper, para card e tabela nunca divergirem.
 */
export const ETAPA_PROXIMA_ACAO: Record<string, string> = {
  comunicacao: 'Coletar documentos',
  documentacao: 'Conferir documentação',
  calculo: 'Conferir cálculo',
  homologacao: 'Finalizar documentos',
  pagamento: 'Aguardar retorno contábil',
  finalizado: 'Processo concluído',
};

/** Próxima ação de uma etapa — cai num texto-guia quando a etapa é desconhecida. */
export function proximaAcaoDaEtapa(etapa?: string | null): string {
  return ETAPA_PROXIMA_ACAO[etapa ?? ''] ?? 'Conferir a etapa do processo';
}
