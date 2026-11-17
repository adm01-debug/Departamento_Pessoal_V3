/**
 * ============================================================================
 * Tokens de APRESENTAÇÃO da Trilha de Auditoria do módulo de Desligamentos
 * (aba "Trilha de Auditoria" de `/desligamentos`).
 *
 * Mesmo papel de `admissoes/auditoriaComum.ts`: aqui só vive rótulo, ícone e
 * classe — nada de regra de negócio (isso fica em `trilhaDerivacoes.ts`) e nada
 * de JSX. Assim a linha da timeline, o chip de filtro e o selo do detalhe contam
 * a MESMA história, com a mesma tinta.
 *
 * REGRA DE OURO: nenhum token de cor novo. As tintas saem dos tons que o módulo
 * já usa (`success`, `info`, `warning`, `xp`, `primary` e `destructive-vivid` —
 * este último reservado a risco/exclusão, legível sobre o navy).
 * ============================================================================
 */
import {
  Activity,
  ArrowRightLeft,
  Calculator,
  Download,
  Eye,
  FilePenLine,
  FilePlus2,
  FileText,
  PenLine,
  Server,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

/* ─── Categoria do evento (chips de filtro rápido) ────────────────────────── */

export type CategoriaTrilha = 'alteracoes' | 'calculos' | 'documentos' | 'status' | 'sistema';

export interface CategoriaMeta {
  chave: CategoriaTrilha;
  /** Rótulo do chip e do selo, no plural (linguagem de filtro). */
  label: string;
  icon: LucideIcon;
  /** Tinta translúcida do bloco de ícone e do selo da categoria. */
  badge: string;
  /** Cor do pontinho (`bg-*`) — a MESMA tinta, só sem os 15% de alfa. */
  ponto: string;
  /** Cor do anel do marcador da timeline (borda). */
  anel: string;
}

/**
 * Ordem CANÔNICA dos chips — a mesma da referência da tela. É também a ordem de
 * PRIORIDADE da classificação em `trilhaDerivacoes.categoriaDoEvento`: cada
 * evento cai em exatamente UMA categoria, para a soma dos chips ser o total.
 */
export const CATEGORIAS_TRILHA: readonly CategoriaMeta[] = [
  {
    chave: 'alteracoes',
    label: 'Alterações',
    icon: FilePenLine,
    badge: 'bg-warning/15 text-warning',
    ponto: 'bg-warning',
    anel: 'border-warning/60',
  },
  {
    chave: 'calculos',
    label: 'Cálculos',
    icon: Calculator,
    badge: 'bg-info/15 text-info',
    ponto: 'bg-info',
    anel: 'border-info/60',
  },
  {
    chave: 'documentos',
    label: 'Documentos',
    icon: FileText,
    badge: 'bg-xp/15 text-xp',
    ponto: 'bg-xp',
    anel: 'border-xp/60',
  },
  {
    chave: 'status',
    label: 'Status',
    icon: ArrowRightLeft,
    badge: 'bg-success/15 text-success',
    ponto: 'bg-success',
    anel: 'border-success/60',
  },
  {
    chave: 'sistema',
    label: 'Sistema',
    icon: Server,
    badge: 'bg-primary/15 text-primary',
    ponto: 'bg-primary',
    anel: 'border-primary/60',
  },
] as const;

/** Categoria por chave — evita `find` a cada render. */
export const CATEGORIA_POR_CHAVE: Record<CategoriaTrilha, CategoriaMeta> = CATEGORIAS_TRILHA.reduce(
  (mapa, categoria) => ({ ...mapa, [categoria.chave]: categoria }),
  {} as Record<CategoriaTrilha, CategoriaMeta>
);

/* ─── Nível do evento (filtro complementar) ───────────────────────────────── */

export type NivelTrilha = 'critico' | 'atencao' | 'informativo';

export interface NivelMeta {
  chave: NivelTrilha;
  label: string;
  badge: string;
  ponto: string;
}

/** Do mais grave para o mais informativo (opções do select "Todos os níveis"). */
export const NIVEIS_TRILHA: readonly NivelMeta[] = [
  {
    chave: 'critico',
    label: 'Crítico',
    badge: 'bg-destructive-vivid/15 text-destructive-vivid',
    ponto: 'bg-destructive-vivid',
  },
  { chave: 'atencao', label: 'Atenção', badge: 'bg-warning/15 text-warning', ponto: 'bg-warning' },
  {
    chave: 'informativo',
    label: 'Informativo',
    badge: 'bg-muted/60 text-muted-foreground',
    ponto: 'bg-muted-foreground',
  },
] as const;

/* ─── Ação técnica → ícone e tinta ────────────────────────────────────────── */

export interface AcaoTrilhaMeta {
  /** Nome amigável da OPERAÇÃO técnica (tooltip do ícone e bloco do detalhe). */
  titulo: string;
  icon: LucideIcon;
  badge: string;
  ponto: string;
}

/**
 * Camada de APRESENTAÇÃO das operações do `audit_log`. Nenhum dado novo: só
 * troca o código cru (`INSERT`…) por um nome amigável + a tinta semântica do
 * sistema. O título legível do EVENTO (que depende do payload) é derivado em
 * `trilhaDerivacoes.tituloDoEvento` — aqui mora só a moldura do ícone.
 */
export const ACOES_TRILHA: Record<string, AcaoTrilhaMeta> = {
  INSERT: { titulo: 'Inserção de registro', icon: FilePlus2, badge: 'bg-success/15 text-success', ponto: 'bg-success' },
  UPDATE: {
    titulo: 'Atualização de registro',
    icon: FilePenLine,
    badge: 'bg-warning/15 text-warning',
    ponto: 'bg-warning',
  },
  DELETE: {
    titulo: 'Exclusão de registro',
    icon: Trash2,
    badge: 'bg-destructive-vivid/15 text-destructive-vivid',
    ponto: 'bg-destructive-vivid',
  },
  EXECUTE_CALC: { titulo: 'Execução de cálculo', icon: Calculator, badge: 'bg-info/15 text-info', ponto: 'bg-info' },
  SIMULATION_CALC: { titulo: 'Simulação de cálculo', icon: Calculator, badge: 'bg-info/15 text-info', ponto: 'bg-info' },
  VIEW: { titulo: 'Visualização de registro', icon: Eye, badge: 'bg-xp/15 text-xp', ponto: 'bg-xp' },
  VISUALIZACAO: { titulo: 'Visualização de registro', icon: Eye, badge: 'bg-xp/15 text-xp', ponto: 'bg-xp' },
  EXPORT: { titulo: 'Exportação de dados', icon: Download, badge: 'bg-xp/15 text-xp', ponto: 'bg-xp' },
  SIGN: { titulo: 'Assinatura de documento', icon: PenLine, badge: 'bg-primary/15 text-primary', ponto: 'bg-primary' },
  GENERATE_DOC: { titulo: 'Geração de documento', icon: FileText, badge: 'bg-xp/15 text-xp', ponto: 'bg-xp' },
};

/** Ação desconhecida não some: cai num ícone neutro com o código cru visível. */
export const ACAO_TRILHA_FALLBACK: AcaoTrilhaMeta = {
  titulo: 'Evento',
  icon: Activity,
  badge: 'bg-muted text-muted-foreground',
  ponto: 'bg-muted-foreground',
};

/** Moldura (ícone + tinta) de uma ação técnica. */
export function acaoTrilhaMeta(acao?: string | null): AcaoTrilhaMeta {
  return (acao && ACOES_TRILHA[acao]) || ACAO_TRILHA_FALLBACK;
}

/* ─── Conjuntos de ações (classificação) ──────────────────────────────────── */

/**
 * Ações EXECUTADAS pela aplicação (não são um "de/para" de registro). São as
 * que ganham a linha "Evento técnico" nos metadados, exatamente como a
 * referência da tela exibe para `EXECUTE_CALC`/`SIMULATION_CALC`.
 */
export const ACOES_TECNICAS: ReadonlySet<string> = new Set([
  'EXECUTE_CALC',
  'SIMULATION_CALC',
  'VIEW',
  'VISUALIZACAO',
  'EXPORT',
  'PRINT',
  'DOWNLOAD',
  'SIGN',
  'GENERATE_DOC',
]);

/** Recorte "leitura/emissão de documento" (categoria Documentos). */
export const ACOES_DOCUMENTO: ReadonlySet<string> = new Set([
  'VIEW',
  'VISUALIZACAO',
  'EXPORT',
  'PRINT',
  'DOWNLOAD',
  'SIGN',
  'GENERATE_DOC',
  'DOCUMENTO',
  'ASSINATURA',
]);

/* ─── Entidade (tabela) → nome amigável ───────────────────────────────────── */

const RECURSO_LABELS: Record<string, string> = {
  desligamentos: 'Desligamentos',
  colaboradores: 'Colaboradores',
  admissoes: 'Admissões',
  ferias: 'Férias',
  folha_pagamento: 'Folha de Pagamento',
};

/**
 * Nome amigável do recurso. Para tabelas fora do mapa, deriva um título a partir
 * do nome técnico REAL (troca `_` por espaço e capitaliza) — não inventamos um
 * rótulo, só formatamos o que veio do log.
 */
export function rotuloRecurso(tabela?: string | null): string {
  if (!tabela) return '—';
  if (RECURSO_LABELS[tabela]) return RECURSO_LABELS[tabela];
  return tabela.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Avatar textual do responsável ───────────────────────────────────────── */

/**
 * Paleta dos avatares textuais — cinco tintas translúcidas reaproveitadas do
 * design system. O responsável recebe sempre a MESMA cor, porque a escolha é
 * determinística pela chave do usuário.
 */
export const TINTAS_AVATAR: readonly string[] = [
  'bg-primary/15 text-primary',
  'bg-info/15 text-info',
  'bg-xp/15 text-xp',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
];

/** Tinta estável de um responsável (hash simples da chave → índice da paleta). */
export function tintaAvatar(chave: string): string {
  let hash = 0;
  for (let i = 0; i < chave.length; i += 1) hash = (hash * 31 + chave.charCodeAt(i)) % 997;
  return TINTAS_AVATAR[hash % TINTAS_AVATAR.length];
}
