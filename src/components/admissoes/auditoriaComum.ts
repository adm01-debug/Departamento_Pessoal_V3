/**
 * Tokens de APRESENTAÇÃO da área de Auditoria (aba "Auditoria" do módulo de
 * Admissões). Só rótulo, ícone e classe — nada de regra de negócio (essa fica em
 * `auditoriaDerivacoes.ts`) e nada de JSX.
 *
 * REGRA DE OURO: nenhum token de cor novo e nenhuma segunda cópia de rótulo.
 *
 *   • `admissoesComum.ts` é a régua de apresentação DESTE módulo (usada pela
 *     Gestão de Candidatos, pelo detalhe da admissão e pelo onboarding):
 *     `ETAPA_LABELS` traz a nomenclatura oficial ("Docs Pendentes",
 *     "Em Validação" — a mesma que a referência da tela mostra) e
 *     `ETAPA_BADGE`/`TONE_BADGE`/`TONE_CHIP`/`TONE_TEXT` dão a tinta
 *     translúcida por tom. É tudo reaproveitado daqui.
 *
 *   • `kanbanComum.ts` empresta DUAS coisas que só ele tem: os ícones
 *     canônicos por etapa (via `colunaDaEtapa`, o mesmo mapa do board) e a
 *     tinta/tom de cada etapa (`TOM_KANBAN`). O `fundo` daquele mapa — que é um
 *     gradiente radial+linear — NÃO é usado: os cards do topo são sólidos.
 *
 * Assim a Auditoria, o Kanban e a Gestão de Candidatos contam a MESMA história,
 * com a mesma nomenclatura e as mesmas cores.
 */
import { Activity, CheckCircle2, Clock3, FileText, XCircle, type LucideIcon } from 'lucide-react';
import type { StatusAuditoria } from '@/mocks/admissoesMock';
import { ETAPA_BADGE, ETAPA_LABELS, TONE_BADGE, TONE_TEXT, type Tone, type ToneSelo } from './admissoesComum';
import { COLUNAS_KANBAN, TOM_KANBAN, colunaDaEtapa, type TomEtapa } from './kanbanComum';
import {
  QUICK_FILTER_VALORES,
  type OrdemAuditoria,
  type PeriodoAuditoria,
  type QuickFilter,
} from './auditoriaDerivacoes';

/* ─── Opções de filtro (rótulo + valor real) ──────────────────────────────── */

/** Período da primeira linha de filtros. */
export const PERIODOS_AUDITORIA: readonly { value: PeriodoAuditoria; label: string }[] = [
  { value: 'todos', label: 'Todo o período' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'ano', label: 'Últimos 12 meses' },
];

/** Opções do select "Ordenar por" do cabeçalho do bloco principal. */
export const ORDENS_AUDITORIA: readonly { value: OrdemAuditoria; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigos', label: 'Mais antigos' },
  { value: 'candidato', label: 'Candidato (A–Z)' },
  { value: 'status', label: 'Status (atenção primeiro)' },
];

/* ─── Status da trilha (SUCESSO / PENDENTE / FALHA) ───────────────────────── */

/** Tom de cada status — resolve para os selos de `admissoesComum`. */
export const TOM_STATUS: Record<StatusAuditoria, ToneSelo> = {
  sucesso: 'success',
  pendente: 'warning',
  falha: 'destructive',
};

/** Rótulo legível do status (a trilha guarda em minúsculas). */
export const LABEL_STATUS: Record<StatusAuditoria, string> = {
  sucesso: 'Sucesso',
  pendente: 'Pendente',
  falha: 'Falha',
};

/** Ícone de cada status — usado no badge da tabela e nos atalhos de filtro. */
export const ICONE_STATUS: Record<StatusAuditoria, LucideIcon> = {
  sucesso: CheckCircle2,
  pendente: Clock3,
  falha: XCircle,
};

/** Selo do status (tinta translúcida /15, o mesmo dos modais do módulo). */
export function seloStatus(status: StatusAuditoria): string {
  return TONE_BADGE[TOM_STATUS[status]];
}

/* ─── Cards de resumo do topo ─────────────────────────────────────────────── */

export type ChaveResumo = 'eventos' | 'sucesso' | 'pendentes' | 'falhas';

export interface CardResumo {
  chave: ChaveResumo;
  /** Rótulo do card, como na referência (Eventos, Sucesso, Pendentes, Falhas). */
  label: string;
  /** Subtótulo descritivo do que o número significa. */
  descricao: string;
  icon: LucideIcon;
  /** Tom de acento do card (azul/ciano, verde, amarelo/laranja, vermelho). */
  tom: Tone;
}

/**
 * Os quatro KPIs do topo, na ordem da referência aprovada. Só DADOS de
 * apresentação: quem desenha o card é o `MetricCard` compartilhado — o MESMO
 * componente (e o mesmo `cardVariants`) dos KPI Cards do Dashboard de Admissões.
 * Por isso aqui não há forma, cor nem tamanho: só rótulo, frase de apoio, ícone
 * e tom semântico.
 */
export const CARDS_RESUMO: readonly CardResumo[] = [
  {
    chave: 'eventos',
    label: 'Eventos',
    descricao: 'Total de eventos registrados',
    icon: FileText,
    tom: 'info',
  },
  {
    chave: 'sucesso',
    label: 'Sucesso',
    descricao: 'Eventos concluídos com sucesso',
    icon: CheckCircle2,
    tom: 'success',
  },
  {
    chave: 'pendentes',
    label: 'Pendentes',
    descricao: 'Aguardando processo ou validação',
    icon: Clock3,
    tom: 'warning',
  },
  {
    chave: 'falhas',
    label: 'Falhas',
    descricao: 'Eventos com erro ou bloqueio',
    icon: XCircle,
    tom: 'destructive',
  },
];

/**
 * Cor do pontinho redondo que acompanha chips e atalhos (`bg-*`).
 * Derivado da MESMA tinta do tom — um lugar só troca o `text-` pelo `bg-`, em
 * vez de manter um segundo mapa de cores em paralelo.
 */
export function pontoStatus(status: StatusAuditoria): string {
  return TONE_TEXT[TOM_STATUS[status]].replace('text-', 'bg-');
}

/* ─── Etapa do evento (rótulo + ícone + selo) ─────────────────────────────── */

/** Ação do evento de CRIAÇÃO — o único que não representa a etapa corrente. */
export const ACAO_PROCESSO_CRIADO = 'Processo de admissão criado';

export interface EtapaTrilha {
  label: string;
  icon: LucideIcon;
  /** Classe do selo de etapa (`ETAPA_BADGE` — /15). */
  badge: string;
  /** Classe da tinta pura da etapa. */
  tinta: string;
  /** Tom da etapa — permite derivar qualquer outra superfície do tema. */
  tom: TomEtapa;
}

/**
 * Etapa como a trilha a exibe: rótulo de `ETAPA_LABELS`, selo de `ETAPA_BADGE`
 * (as duas réguas do módulo) e o ícone canônico da coluna do board. Etapa
 * desconhecida não explode nem some: cai num selo neutro com o texto cru, para
 * o dado continuar visível mesmo se a régua mudar.
 */
export function etapaDaTrilha(etapa?: string | null): EtapaTrilha {
  const coluna = colunaDaEtapa(etapa);
  if (!coluna) {
    return {
      label: etapa ? String(etapa) : '—',
      icon: Activity,
      badge: 'bg-muted/60 text-muted-foreground',
      tinta: 'text-muted-foreground',
      tom: 'info',
    };
  }
  return {
    label: ETAPA_LABELS[coluna.key] ?? coluna.label,
    icon: coluna.icon,
    badge: ETAPA_BADGE[coluna.key] ?? 'bg-muted/60 text-muted-foreground',
    // Tinta vem do tom da ETAPA (`TOM_KANBAN` cobre os 8 tons do board, inclusive
    // teal/violet/aqua, que não existem no `Tone` de 5 valores do `admissoesComum`).
    tinta: TOM_KANBAN[coluna.tom].tinta,
    tom: coluna.tom,
  };
}

/** Ícone do evento de CRIAÇÃO — os demais eventos seguem o ícone da etapa. */
export const ICONE_EVENTO_CRIACAO = FileText;

/**
 * Rótulo e acento de UM chip rápido: o de status usa o tom do status (pontinho
 * colorido) e o de etapa usa o ícone canônico da coluna do board. "Todos" é
 * neutro (sem ponto e sem ícone).
 */
export interface ChipRapido {
  label: string;
  /** Classe do pontinho (`bg-*`) — só nos chips de status. */
  ponto?: string;
  /** Ícone — só nos chips de etapa. */
  icone?: LucideIcon;
}

export function chipQuickFilter(quick: QuickFilter): ChipRapido {
  const { status, etapa } = QUICK_FILTER_VALORES[quick];
  if (status) return { label: LABEL_STATUS[status], ponto: pontoStatus(status) };
  if (etapa) return { label: etapaDaTrilha(etapa).label, icone: colunaDaEtapa(etapa)?.icon };
  return { label: 'Todos' };
}

/**
 * TODAS as etapas do módulo (rótulo oficial, na ordem canônica do board) —
 * opções do select "Etapa" da barra. O select é a dimensão COMPLETA; a
 * curadoria de quatro etapas vale só para os chips rápidos.
 */
export const OPCOES_ETAPA: readonly { value: string; label: string }[] = COLUNAS_KANBAN.map((coluna) => ({
  value: coluna.key,
  label: ETAPA_LABELS[coluna.key] ?? coluna.label,
}));
