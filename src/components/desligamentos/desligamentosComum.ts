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
export type EtapaDesligamento = 'comunicacao' | 'documentacao' | 'calculo' | 'homologacao' | 'pagamento' | 'finalizado';

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
  // `pago` e gravado pela producao em rescisaoService.ts:348 junto de
  // `etapa: 'finalizado'` e da desativacao do colaborador, e
  // DesligamentoDetailSheet.tsx:207 ja o trata como terminal. Faltava aqui: sem
  // o rotulo o selo exibia o texto cru 'pago', e sem ele em STATUS_TERMINAIS
  // (desligamentosDerivacoes) todo desligamento PAGO continuava contado como
  // pendencia na faixa de atencao e nos KPIs — a lista do RH nunca esvaziava.
  pago: 'Pago',
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
  pago: 'bg-success/15 text-success border-success/30',
  finalizado: 'bg-success/15 text-success border-success/30',
  em_andamento: 'bg-info/15 text-info border-info/30',
  concluido: 'bg-success/15 text-success border-success/30',
  cancelado:
    'bg-[hsl(var(--destructive-vivid)/0.15)] text-[hsl(var(--destructive-vivid))] border-[hsl(var(--destructive-vivid)/0.3)]',
};

/* ─── Tipo de desligamento ────────────────────────────────────────────────── */

/**
 * Tipos REAIS: valores do enum `tipo_desligamento` do banco canonico
 * (frjbfeamybqsejlvmqbl), conferidos por `supabase_db_list_enums`:
 * sem_justa_causa, justa_causa, pedido_demissao, acordo, fim_contrato,
 * falecimento.
 *
 * O vocabulario anterior — tanto na muri quanto na main — usava
 * `com_justa_causa`, `acordo_mutuo` e `termino_contrato`, que NAO existem, e
 * nao tinha `falecimento`. Resultado em producao: o selo de tipo exibia o valor
 * cru ('justa_causa') para quatro dos seis tipos, e as tres chaves inventadas
 * nunca casavam com nada.
 */
export const TIPO_LABELS: Record<string, string> = {
  sem_justa_causa: 'Sem Justa Causa',
  justa_causa: 'Justa Causa',
  pedido_demissao: 'Pedido Demissão',
  acordo: 'Acordo',
  fim_contrato: 'Fim de Contrato',
  falecimento: 'Falecimento',
};

// `--destructive-vivid` existe em src/index.css mas NAO esta registrado em
// tailwind.config.js: `text-destructive-vivid` nao gera CSS nenhum. Enquanto o
// token nao entrar no tema, a forma com valor arbitrario e a que pinta.
const VERMELHO_VIVO =
  'bg-[hsl(var(--destructive-vivid)/0.1)] text-[hsl(var(--destructive-vivid))] border-[hsl(var(--destructive-vivid)/0.2)]';
const VERMELHO_VIVO_FORTE =
  'bg-[hsl(var(--destructive-vivid)/0.2)] text-[hsl(var(--destructive-vivid))] border-[hsl(var(--destructive-vivid)/0.4)]';

export const TIPO_BADGE: Record<string, string> = {
  sem_justa_causa: VERMELHO_VIVO,
  justa_causa: VERMELHO_VIVO_FORTE,
  pedido_demissao: 'bg-warning/10 text-warning border-warning/20',
  acordo: 'bg-info/10 text-info border-info/20',
  fim_contrato: 'bg-muted text-muted-foreground border-border/30',
  falecimento: 'bg-muted/60 text-muted-foreground border-border/40',
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
