/**
 * ============================================================================
 * MOTOR DE AVALIAÇÃO 360° — metodologia APROVADA (pesos fixos nesta versão).
 *
 * Entrada: as notas CONSOLIDADAS por categoria (o RH registra um resultado por
 * categoria — Gestor, Pares, Autoavaliação, Subordinados), por colaborador e
 * ciclo. Esta camada é PURA: nenhum I/O, nenhuma escrita, nenhuma média
 * automática entre colegas (isso não existe nesta versão).
 *
 * ── REGRAS DE NEGÓCIO APLICADAS ────────────────────────────────────────────
 *  • Desempenho = média ponderada das categorias DISPONÍVEIS, com redistribuição
 *    proporcional dos pesos (categoria ausente ≠ nota zero).
 *  • GESTOR É OBRIGATÓRIO: sem nota de desempenho do gestor concluída e válida,
 *    não há classificação — e os 60% NÃO são redistribuídos para as outras
 *    categorias.
 *  • POTENCIAL = 100% gestor, com VALIDAÇÃO OBRIGATÓRIA do RH vinculada à versão
 *    exata da avaliação (se a avaliação mudar ou for reaberta, a validação
 *    anterior deixa de valer).
 *  • `pendente` e `cancelado` nunca participam do cálculo oficial.
 *  • Sem arredondamento intermediário; a precisão só é reduzida na apresentação.
 *
 * ── REFERÊNCIA HISTÓRICA ──────────────────────────────────────────────────
 * Toda consolidação devolve `metodologia` (versão + pesos usados). Assim, se os
 * pesos mudarem no futuro, o resultado antigo continua explicável pelo conjunto
 * de pesos com que foi calculado — sem alteração retroativa silenciosa.
 * ============================================================================
 */
import { classifyScore, type QuadranteKey } from './nineBoxConsolidacao';

/* ─── Categorias e pesos aprovados (FIXOS nesta versão) ───────────────────── */

export const CATEGORIAS_360 = ['gestor', 'par', 'auto', 'subordinado'] as const;
export type Categoria360 = (typeof CATEGORIAS_360)[number];

/** Pesos oficiais: Gestor 60% · Pares 25% · Autoavaliação 10% · Subordinados 5%. */
export const PESOS_360: Readonly<Record<Categoria360, number>> = {
  gestor: 0.6,
  par: 0.25,
  auto: 0.1,
  subordinado: 0.05,
};

/**
 * Metodologia em vigor. `versao` viaja junto de cada cálculo para preservar a
 * rastreabilidade histórica. NÃO crie interface de configuração de pesos.
 */
export const METODOLOGIA_360 = {
  versao: '360-v1',
  aprovada: true,
  pesos: PESOS_360,
  descricao: 'Gestor 60% · Pares 25% · Autoavaliação 10% · Subordinados 5% (fixos)',
} as const;

export const ROTULO_CATEGORIA: Readonly<Record<Categoria360, string>> = {
  gestor: 'Gestor',
  par: 'Pares',
  auto: 'Autoavaliação',
  subordinado: 'Subordinados',
};

/* ─── Notas por categoria ─────────────────────────────────────────────────── */

export type NotasPorCategoria = Partial<Record<Categoria360, number | null>>;
export type StatusPorCategoria = Partial<Record<Categoria360, string | null>>;

export interface ResultadoPesos {
  /** Pesos efetivos renormalizados sobre as categorias presentes. */
  pesos: Partial<Record<Categoria360, number>>;
  /** Soma dos pesos originais das categorias presentes (0–1). */
  soma: number;
  categorias: Categoria360[];
}

/**
 * Redistribuição PROPORCIONAL: devolve os pesos efetivos das categorias com nota
 * disponível, normalizados para totalizar 100%.
 * Sem categoria disponível, devolve `null` (não há nota a inventar).
 */
export function pesosEfetivos(disponiveis: Categoria360[]): ResultadoPesos | null {
  const categorias = CATEGORIAS_360.filter((c) => disponiveis.includes(c));
  const soma = categorias.reduce((total, c) => total + PESOS_360[c], 0);
  if (categorias.length === 0 || soma <= 0) return null;
  const pesos = categorias.reduce<Partial<Record<Categoria360, number>>>(
    (acc, c) => ({ ...acc, [c]: PESOS_360[c] / soma }),
    {}
  );
  return { pesos, soma, categorias };
}

/** Categorias com nota numérica utilizável (1–5) e status `concluido`. */
export function categoriasDisponiveis(notas: NotasPorCategoria, status: StatusPorCategoria = {}): Categoria360[] {
  return CATEGORIAS_360.filter((c) => {
    const nota = notas[c];
    if (nota === null || nota === undefined) return false;
    if (!Number.isFinite(Number(nota))) return false;
    if (Number(nota) < 1 || Number(nota) > 5) return false;
    const s = status[c];
    if (s !== undefined && s !== null && String(s).trim().toLowerCase() !== 'concluido') return false;
    return true;
  });
}

/* ─── Validação do Potencial pelo RH ──────────────────────────────────────── */

export interface ValidacaoPotencial {
  /** Impressão da VERSÃO da avaliação analisada (ver `versaoDaAvaliacao`). */
  versaoAvaliacao: string;
  /** Usuário do RH que validou — sempre vindo do servidor, nunca do cliente. */
  validadoPor: string;
  validadoEm: string;
  empresaId: string;
  cicloId: string | null;
  colaboradorId: string;
  feedbackId: string;
}

/**
 * CONTRATO DA VERSÃO DA AVALIAÇÃO — **A AUTORIDADE É O BANCO**.
 *
 * `public.versao_avaliacao_feedback(uuid)` (SQL) calcula a versão canônica e
 * `public.vw_feedbacks_360_versao.versao_avaliacao` a expõe para leitura.
 * O frontend **nunca** recalcula essa string: ele apenas COMPARA o valor que o
 * banco gravou na validação (`feedbacks_360_validacoes_potencial.versao_avaliacao`)
 * com o valor ATUAL lido da view. Assim não existem dois algoritmos divergentes.
 *
 * Formato canônico (definido em SQL):
 *   id | updated_at (UTC, YYYY-MM-DD"T"HH24:MI:SS.US) | potencial | status
 *
 * O sufixo `.US` (MICROSSEGUNDOS) é o que faz a reabertura invalidadar a
 * aprovação: concluir → reabrir → concluir de novo dentro do MESMO segundo
 * produziria uma string idêntica com precisão de segundos, e a validação
 * anterior do RH continuaria sendo aceita. Aqui o valor é apenas LIDO — quem
 * produz a string é o banco (`versao_avaliacao_feedback`).
 */
export const CONTRATO_VERSAO_AVALIACAO = {
  autoridade: 'banco',
  funcao: 'public.versao_avaliacao_feedback(uuid)',
  view: 'public.vw_feedbacks_360_versao',
  campo: 'versao_avaliacao',
  formato: 'id|updated_at(us)|potencial|status',
} as const;

/**
 * A validação só vale quando é da MESMA empresa, do MESMO ciclo, do MESMO
 * colaborador e da MESMA versão da avaliação. Reabertura ou alteração do
 * potencial mudam a versão no banco e invalidam automaticamente a aprovação
 * anterior — sem apagar o histórico.
 *
 * `versaoAtual` deve vir SEMPRE de `vw_feedbacks_360_versao` (nunca calculada aqui).
 */
export function validacaoAplicavel(
  validacao: ValidacaoPotencial | null | undefined,
  atual: {
    versaoAvaliacao: string;
    empresaId: string | null;
    cicloId: string | null;
    colaboradorId: string | null;
  }
): boolean {
  if (!validacao) return false;
  if (!validacao.validadoPor || !validacao.validadoEm) return false;
  if (!validacao.versaoAvaliacao || !atual.versaoAvaliacao) return false;
  if (validacao.versaoAvaliacao !== atual.versaoAvaliacao) return false;
  if (validacao.empresaId !== atual.empresaId) return false;
  if (validacao.cicloId !== atual.cicloId) return false;
  return validacao.colaboradorId === atual.colaboradorId;
}

/* ─── Consolidação oficial 360° ───────────────────────────────────────────── */

export type MotivoNaoClassificado360 =
  | 'sem_colaborador'
  | 'sem_ciclo'
  | 'sem_gestor'
  | 'gestor_pendente'
  | 'gestor_sem_desempenho'
  | 'gestor_sem_potencial'
  | 'potencial_sem_validacao'
  | 'sem_notas_disponiveis';

export interface Consolidacao360 {
  empresaId: string | null;
  cicloId: string | null;
  colaboradorId: string;
  desempenho: number | null;
  potencial: number | null;
  classificavel: boolean;
  motivo: MotivoNaoClassificado360 | null;
  quadrante: QuadranteKey | null;
  categoriasUsadas: Categoria360[];
  pesosEfetivos: Partial<Record<Categoria360, number>>;
  /** Pesos/versão com que ESTE resultado foi calculado (rastreabilidade). */
  metodologia: { versao: string; pesos: Readonly<Record<Categoria360, number>> };
  validacaoPotencial: { validadoPor: string; validadoEm: string } | null;
  /** Há registro mais recente que substituiu uma avaliação já concluída. */
  substituicaoDeConcluida: boolean;
}

export interface EntradaConsolidacao360 {
  empresaId: string | null;
  cicloId: string | null;
  colaboradorId: string;
  /** Notas consolidadas por categoria (o RH registra uma por categoria). */
  notas: NotasPorCategoria;
  /** Status por categoria: só `concluido` participa. */
  status?: StatusPorCategoria;
  /** Potencial informado pelo gestor (100% do eixo horizontal). */
  potencialGestor?: number | null;
  validacaoPotencial?: ValidacaoPotencial | null;
  /** Versão atual da avaliação do gestor (para validar a aprovação). */
  versaoGestor?: string | null;
  substituicaoDeConcluida?: boolean;
}

/**
 * Consolidação OFICIAL do Nine-Box a partir das notas por categoria.
 *
 * Ordem das verificações (todas obrigatórias, na ordem do documento):
 *   colaborador → ciclo → GESTOR (presença, status, nota) → desempenho ponderado
 *   → potencial do gestor → validação do RH da versão exata → quadrante.
 * Sem qualquer etapa, devolve `classificavel: false` com o MOTIVO — nunca uma
 * classificação aproximada e nunca redistribuindo os 60% do gestor.
 */
export function consolidar360({
  empresaId,
  cicloId,
  colaboradorId,
  notas,
  status = {},
  potencialGestor = null,
  validacaoPotencial = null,
  versaoGestor = null,
  substituicaoDeConcluida = false,
}: EntradaConsolidacao360): Consolidacao360 {
  const base = {
    empresaId,
    cicloId,
    colaboradorId,
    desempenho: null as number | null,
    potencial: null as number | null,
    quadrante: null as QuadranteKey | null,
    categoriasUsadas: [] as Categoria360[],
    pesosEfetivos: {} as Partial<Record<Categoria360, number>>,
    metodologia: { versao: METODOLOGIA_360.versao, pesos: METODOLOGIA_360.pesos },
    validacaoPotencial: null as { validadoPor: string; validadoEm: string } | null,
    substituicaoDeConcluida,
  };
  const recusar = (motivo: MotivoNaoClassificado360): Consolidacao360 => ({
    ...base,
    classificavel: false,
    motivo,
  });

  if (!colaboradorId) return recusar('sem_colaborador');
  if (!cicloId) return recusar('sem_ciclo');

  // (1) Gestor OBRIGATÓRIO — presença, escala e status concluído.
  const notaGestor = notas.gestor;
  const notaGestorNum = Number(notaGestor);
  const temNotaGestor =
    notaGestor !== null &&
    notaGestor !== undefined &&
    Number.isFinite(notaGestorNum) &&
    notaGestorNum >= 1 &&
    notaGestorNum <= 5;
  if (!temNotaGestor) return recusar('sem_gestor');

  const statusGestor = String(status.gestor ?? '')
    .trim()
    .toLowerCase();
  if (statusGestor !== '' && statusGestor !== 'concluido') return recusar('gestor_pendente');

  const disponiveis = categoriasDisponiveis(notas, status);
  if (!disponiveis.includes('gestor')) return recusar('gestor_sem_desempenho');

  // (2) Desempenho ponderado com redistribuição proporcional, sem arredondar.
  const efetivos = pesosEfetivos(disponiveis);
  if (!efetivos) return recusar('sem_notas_disponiveis');
  const desempenho = disponiveis.reduce((soma, c) => soma + Number(notas[c]) * (efetivos.pesos[c] as number), 0);

  const comDesempenho = {
    desempenho,
    categoriasUsadas: disponiveis,
    pesosEfetivos: efetivos.pesos,
  };

  // (3) Potencial — exclusivamente do gestor.
  const potencialNum = Number(potencialGestor);
  const temPotencial =
    potencialGestor !== null &&
    potencialGestor !== undefined &&
    Number.isFinite(potencialNum) &&
    potencialNum >= 1 &&
    potencialNum <= 5;
  if (!temPotencial) return { ...recusar('gestor_sem_potencial'), ...comDesempenho };

  // (4) Validação do RH vinculada à versão EXATA da avaliação do gestor.
  const aplicavel = validacaoAplicavel(validacaoPotencial, {
    versaoAvaliacao: versaoGestor ?? '',
    empresaId,
    cicloId,
    colaboradorId,
  });
  if (!aplicavel) {
    return { ...recusar('potencial_sem_validacao'), ...comDesempenho, potencial: potencialNum };
  }

  // (5) Classificação determinística (limiares preservados).
  const quadrante = `${classifyScore(desempenho)}-${classifyScore(potencialNum)}` as QuadranteKey;
  return {
    ...base,
    ...comDesempenho,
    potencial: potencialNum,
    classificavel: true,
    motivo: null,
    quadrante,
    validacaoPotencial: validacaoPotencial
      ? { validadoPor: validacaoPotencial.validadoPor, validadoEm: validacaoPotencial.validadoEm }
      : null,
  };
}

/** Texto do motivo quando o colaborador não pode ser classificado. */
export const MOTIVO_NAO_CLASSIFICADO_360: Readonly<Record<MotivoNaoClassificado360, string>> = {
  sem_colaborador: 'Colaborador não identificado na avaliação.',
  sem_ciclo: 'Avaliação sem ciclo vinculado.',
  sem_gestor: 'Sem avaliação de desempenho do gestor.',
  gestor_pendente: 'Avaliação do gestor ainda não concluída.',
  gestor_sem_desempenho: 'Avaliação do gestor sem nota de desempenho válida.',
  gestor_sem_potencial: 'Avaliação do gestor sem nota de potencial.',
  potencial_sem_validacao: 'Potencial aguardando validação do RH.',
  sem_notas_disponiveis: 'Nenhuma nota elegível para o cálculo.',
};
