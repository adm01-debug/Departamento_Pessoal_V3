/**
 * ============================================================================
 * NINE-BOX — derivações compartilhadas da aba (APRESENTAÇÃO).
 *
 * Este arquivo é a camada de LEITURA da tela: quadrante, contagens, movimentação
 * entre ciclos, atenção, destaques e facetas. A CONSOLIDAÇÃO (agrupar avaliações
 * por empresa + ciclo + colaborador e classificar) mora em
 * `nineBoxConsolidacao.ts` — é de lá que `derivarPontos` vem, e é lá que estão
 * a validação de escala, a detecção de duplicatas reais e a rastreabilidade.
 *
 * ── A REGRA DE CLASSIFICAÇÃO É A MESMA (não foi tocada) ─────────────────────
 * `classifyScore` (reexportada de `nineBoxConsolidacao`) preserva os limites do
 * projeto: ≤ 1,5 → faixa 1 · ≤ 3,5 → faixa 2 · acima → faixa 3.
 *
 * ── O QUE MUDOU — E POR QUÊ ────────────────────────────────────────────────
 * O componente antigo fazia `classifyScore(item.potencial || 2)`: quando o
 * potencial não existia, o item era classificado com um valor PRESUMIDO (2 =
 * "médio") e aparecia na matriz como se tivesse sido avaliado. Isso está
 * REMOVIDO: sem as DUAS notas válidas (e na escala 1–5) o colaborador sai como
 * "Não classificado — avaliação incompleta" e não entra em quadrante nenhum.
 *
 * ── DEDUPLICAÇÃO ───────────────────────────────────────────────────────────
 * A unidade é a PESSOA (empresa + ciclo + colaborador), nunca a linha de
 * `feedbacks_360`: cada colaborador aparece UMA vez por ciclo. Duplicatas REAIS
 * (mesmo avaliador + tipo + notas no mesmo ciclo) são descartadas; avaliações
 * legítimas de avaliadores diferentes continuam no grupo, e a combinação entre
 * elas segue a estratégia documentada em `nineBoxConsolidacao`
 * (`ESTRATEGIA_ATIVA`, hoje `mais_recente`, aguardando metodologia oficial).
 *
 * ── MOVIMENTAÇÃO ENTRE CICLOS (derivação de APRESENTAÇÃO) ──────────────────
 * Não existe histórico oficial de movimentação no banco: `ciclos_avaliacao` +
 * `feedbacks_360` são a única base. A leitura compara a SOMA DAS DUAS NOTAS
 * REAIS do ciclo atual com a do ciclo anterior — maior = evoluiu, igual =
 * permaneceu, menor = regrediu — e só considera quem tem as duas notas nos DOIS
 * ciclos. Pendente de aval de produto; sem base comparável, a aba mostra o
 * estado informativo (nada de número inventado).
 * ============================================================================
 */
import {
  classifyScore,
  consolidarNineBox,
  ESTRATEGIA_ATIVA,
  type ConsolidacaoColaborador,
  type EstrategiaConsolidacao,
  type FaixaScore,
  type QuadranteKey,
} from './nineBoxConsolidacao';

// A classificação e os rótulos de faixa/quadrante continuam sendo consumidos
// por aqui (e pela UI) exatamente como antes — só mudaram de casa.
export { classifyScore, LIMIARES_CLASSIFICACAO, ROTULO_NAO_CLASSIFICADO } from './nineBoxConsolidacao';
export type { FaixaScore, QuadranteKey, EstrategiaConsolidacao, ConsolidacaoColaborador } from './nineBoxConsolidacao';

/* ─── Nomes, leituras e ordem dos nove quadrantes ─────────────────────────── */

export interface Quadrante {
  key: QuadranteKey;
  nome: string;
  /** Leitura curta da posição (ex.: "Alto potencial, baixo desempenho"). */
  leitura: string;
}

/** Rótulo de cada faixa (usado nos eixos e nas leituras). */
export const ROTULO_FAIXA: Record<FaixaScore, string> = { 1: 'Baixo', 2: 'Médio', 3: 'Alto' };

const NOMES: Record<QuadranteKey, string> = {
  '1-3': 'Enigma',
  '2-3': 'Alto Potencial',
  '3-3': 'Estrela',
  '1-2': 'Dilema',
  '2-2': 'Core Player',
  '3-2': 'Alto Profissional',
  '1-1': 'Sub-performer',
  '2-1': 'Efetivo',
  '3-1': 'Profissional Confiável',
};

/** Leitura da posição: potencial primeiro (como na referência). */
function leituraQuadrante(key: QuadranteKey): string {
  const [desempenho, potencial] = key.split('-') as [string, string];
  return `${ROTULO_FAIXA[Number(potencial) as FaixaScore]} potencial, ${ROTULO_FAIXA[
    Number(desempenho) as FaixaScore
  ].toLowerCase()} desempenho`;
}

export const QUADRANTES: Quadrante[] = (Object.keys(NOMES) as QuadranteKey[]).map((key) => ({
  key,
  nome: NOMES[key],
  leitura: leituraQuadrante(key),
}));

export const QUADRANTE_POR_CHAVE: Record<QuadranteKey, Quadrante> = QUADRANTES.reduce(
  (acc, q) => ({ ...acc, [q.key]: q }),
  {} as Record<QuadranteKey, Quadrante>
);

/** A ordem de LEITURA da matriz: potencial alto → baixo, desempenho baixo → alto. */
export const ORDEM_MATRIZ: QuadranteKey[] = ['1-3', '2-3', '3-3', '1-2', '2-2', '3-2', '1-1', '2-1', '3-1'];

/* ─── Pele dos nove quadrantes (somente tokens do tema) ───────────────────── */

/**
 *   success · primary · warning · info · chart-2 (teal) · chart-3 (laranja)
 *   · chart-4 (roxo) · destructive-vivid · neutro (`muted`)
 *
 * `tinta` é a cor sólida (nome/contagem), `caixa` a superfície e `borda` o
 * contorno — mesma família, com transparência para ler no tema escuro (o
 * componente antigo usava `bg-green-100`, que só existe no tema claro).
 */
export interface PeleQuadrante {
  /** Cor sólida do nome/contagem (texto). */
  tinta: string;
  /** Superfície do card. */
  caixa: string;
  /** Borda do card. */
  borda: string;
}

export const PELE_QUADRANTE: Record<QuadranteKey, PeleQuadrante> = {
  '3-3': { tinta: 'text-success', caixa: 'bg-success/10', borda: 'border-success/40 hover:border-success/70' },
  '2-3': { tinta: 'text-primary', caixa: 'bg-primary/10', borda: 'border-primary/40 hover:border-primary/70' },
  '1-3': { tinta: 'text-warning', caixa: 'bg-warning/10', borda: 'border-warning/40 hover:border-warning/70' },
  '3-2': {
    tinta: 'text-[hsl(var(--chart-2))]',
    caixa: 'bg-[hsl(var(--chart-2)/0.10)]',
    borda: 'border-[hsl(var(--chart-2)/0.40)] hover:border-[hsl(var(--chart-2)/0.70)]',
  },
  '2-2': { tinta: 'text-info', caixa: 'bg-info/10', borda: 'border-info/40 hover:border-info/70' },
  '1-2': {
    tinta: 'text-[hsl(var(--chart-3))]',
    caixa: 'bg-[hsl(var(--chart-3)/0.10)]',
    borda: 'border-[hsl(var(--chart-3)/0.40)] hover:border-[hsl(var(--chart-3)/0.70)]',
  },
  '3-1': { tinta: 'text-warning', caixa: 'bg-warning/[0.07]', borda: 'border-warning/30 hover:border-warning/60' },
  '2-1': { tinta: 'text-muted-foreground', caixa: 'bg-muted/30', borda: 'border-border/50 hover:border-border' },
  '1-1': {
    tinta: 'text-destructive-vivid',
    caixa: 'bg-destructive-vivid/10',
    borda: 'border-destructive-vivid/40 hover:border-destructive-vivid/70',
  },
};

/** Quadrantes que a própria referência já tratava como "atenção necessária". */
export const QUADRANTES_ATENCAO: QuadranteKey[] = ['1-1'];

/* ─── Ponto da matriz (uma PESSOA classificada) ───────────────────────────── */

/** Colaborador mínimo para resolver cargo/departamento/foto. */
export interface ColaboradorNineBox {
  id?: string | null;
  nome_completo?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  foto_url?: string | null;
}

export interface PontoNineBox {
  /** Id do registro de feedback que sustenta a classificação. */
  id: string;
  colaboradorId: string | null;
  nome: string;
  cargo: string | null;
  departamento: string | null;
  foto: string | null;
  /** Notas BRUTAS (1–5) lidas do registro. `null` = não avaliado. */
  nota: number | null;
  potencial: number | null;
  /** Faixas classificadas. `null` quando a nota correspondente não existe. */
  desempenho: FaixaScore | null;
  potencialFaixa: FaixaScore | null;
  /** Quadrante (`null` quando falta qualquer uma das duas notas). */
  quadrante: QuadranteKey | null;
  nomeQuadrante: string | null;
  criadoEm: number;
  /** Soma das duas notas — régua da movimentação entre ciclos. */
  pontuacao: number | null;
  /** Possui PDI vinculado (relação real por `colaborador_id`). */
  temPdi: boolean;
  /** Motivo de não entrar na matriz (`null` = entrou). */
  pendencias: 'sem_potencial' | 'sem_nota' | 'sem_base' | null;
  /**
   * APROVADO PELO GESTOR, AGUARDANDO O RH: a pessoa já é elegível pelo fluxo,
   * mas ainda não pode ocupar um quadrante oficial. A aba a apresenta com o
   * indicador existente (banner/insights), nunca a esconde por completo.
   */
  aguardandoValidacaoRh?: boolean;
  /** Ainda não há aprovação vigente do gestor (ou ela foi devolvida/invalidada). */
  aguardandoAprovacao?: boolean;
  /** Texto objetivo do motivo fora da matriz (mesma fonte do motor oficial). */
  motivoNaoClassificado?: string | null;
  /* ── Rastreabilidade da consolidação (auditoria; a UI visual ignora) ── */
  /** Avaliações existentes no grupo (empresa+ciclo+colaborador). */
  quantidadeAvaliacoes: number;
  /** Quantas têm as duas notas na escala (0–5) — base real da classificação. */
  quantidadeAvaliacoesValidas: number;
  /** Registros sinalizados por SEMELHANÇA (preservados, não descartados). */
  sinalizados: number;
  /** Ids dos registros sinalizados — rastreabilidade da revisão humana. */
  registrosSinalizados: string[];
  /** Id do registro que representa a pessoa na consolidação (etapa 4). */
  selecionadoId: string | null;
  /** Avaliações com nota fora da escala 1–5 (isoladas, não classificadas). */
  notasForaDaEscala: number;
  /** Ids das avaliações que sustentam esta classificação. */
  feedbackIdsUtilizados: string[];
  /** Situação da consolidação (`consolidado` · `incompleto` · `sem_base`). */
  statusConsolidacao: 'consolidado' | 'incompleto' | 'sem_base';
  /** Tipos de avaliador que participaram (gestor, par, auto...). */
  tiposAvaliadores: string[];
}

/** Converte a nota crua em número utilizável (1–5) ou `null`. */
function numeroNota(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/* ─── Derivação principal ─────────────────────────────────────────────────── */

interface OpcoesDerivacao {
  /** Feedbacks da empresa (a lista que a página já carrega). */
  feedbacks: unknown[];
  /** Ciclo em foco (`null` = usar todos os registros carregados). */
  cicloId?: string | null;
  /** Colaboradores já carregados pela página (cargo/departamento/foto). */
  colaboradores?: ColaboradorNineBox[];
  /** PDIs já carregados pela página (relação real por `colaborador_id`). */
  pdis?: unknown[];
  /** Empresa em foco (isolamento de tenant; opcional — a página já filtra isso). */
  empresaId?: string | null;
  /** Estratégia de combinação das avaliações (ver `nineBoxConsolidacao`). */
  estrategia?: EstrategiaConsolidacao;
}

/** Nome/cargo/departamento/foto a partir da relação embutida + lista da página. */
function resolverQuem(
  nomeRelacao: string | null,
  colaboradorId: string | null,
  colaboradores: ColaboradorNineBox[]
): { nome: string; cargo: string | null; departamento: string | null; foto: string | null } {
  const extra = colaboradorId ? colaboradores.find((c) => String(c?.id ?? '') === colaboradorId) : undefined;

  return {
    nome: String(nomeRelacao ?? extra?.nome_completo ?? '').trim() || 'Sem colaborador',
    cargo: String(extra?.cargo ?? '').trim() || null,
    departamento: String(extra?.departamento ?? '').trim() || null,
    foto: String(extra?.foto_url ?? '').trim() || null,
  };
}

/**
 * Deriva a lista de PONTOS (uma pessoa por colaborador) do ciclo escolhido.
 *
 * A consolidação em si mora em `consolidarNineBox` (empresa + ciclo +
 * colaborador): aqui só se resolve quem é a pessoa (nome/cargo/departamento/
 * foto) e se ela tem PDI vinculado. Duplicatas reais, escala das notas e
 * rastreabilidade vêm resolvidas da camada de consolidação.
 */
export function derivarPontos({
  feedbacks,
  cicloId,
  colaboradores = [],
  pdis = [],
  empresaId = null,
  estrategia = ESTRATEGIA_ATIVA,
}: OpcoesDerivacao): PontoNineBox[] {
  const idsComPdi = new Set(
    pdis.map((p) => String((p as Record<string, unknown>)?.colaborador_id ?? '').trim()).filter(Boolean)
  );

  // UMA linha por (empresa + ciclo + colaborador) — vem da camada de consolidação.
  return consolidarNineBox({ feedbacks, cicloId: cicloId ?? null, empresaId, estrategia }).map((c) => {
    const quem = resolverQuem(c.nomeRelacao, c.colaboradorId, colaboradores);
    const quadrante = c.classificacao;
    const desempenho = c.desempenhoConsolidado === null ? null : classifyScore(c.desempenhoConsolidado);
    const potencialFaixa = c.potencialConsolidado === null ? null : classifyScore(c.potencialConsolidado);
    const semClassificacao = c.status !== 'consolidado';

    return {
      id: c.feedbackIdsUtilizados[0] ?? `consolidado:${c.colaboradorId}`,
      colaboradorId: c.colaboradorId,
      nome: quem.nome,
      cargo: quem.cargo,
      departamento: quem.departamento,
      foto: quem.foto,
      nota: c.desempenhoConsolidado,
      potencial: c.potencialConsolidado,
      desempenho,
      potencialFaixa,
      quadrante,
      nomeQuadrante: quadrante ? QUADRANTE_POR_CHAVE[quadrante].nome : null,
      criadoEm: c.criadoEm,
      pontuacao:
        c.desempenhoConsolidado !== null && c.potencialConsolidado !== null
          ? c.desempenhoConsolidado + c.potencialConsolidado
          : null,
      temPdi: idsComPdi.has(c.colaboradorId),
      pendencias: !semClassificacao
        ? null
        : c.faltando === 'ambos' || c.faltando === null
          ? 'sem_base'
          : c.faltando === 'potencial'
            ? 'sem_potencial'
            : 'sem_nota',
      /* ── Rastreabilidade da consolidação (a UI ignora; auditoria e testes usam) ── */
      quantidadeAvaliacoes: c.quantidadeAvaliacoes,
      quantidadeAvaliacoesValidas: c.quantidadeAvaliacoesValidas,
      sinalizados: c.quantidadeSinalizados,
      registrosSinalizados: c.registrosSinalizados,
      selecionadoId: c.selecionadoId,
      notasForaDaEscala: c.notasForaDaEscala,
      feedbackIdsUtilizados: c.feedbackIdsUtilizados,
      statusConsolidacao: c.status,
      tiposAvaliadores: c.tiposAvaliadores,
    };
  });
}

/** Contagem por quadrante — sempre com as NOVE chaves. */
export function contarQuadrantes(pontos: PontoNineBox[]): Record<QuadranteKey, number> {
  const base = ORDEM_MATRIZ.reduce((acc, k) => ({ ...acc, [k]: 0 }), {} as Record<QuadranteKey, number>);
  pontos.forEach((p) => {
    if (p.quadrante) base[p.quadrante] += 1;
  });
  return base;
}

/** Pessoas de um quadrante, em ordem alfabética. */
export function pontosDoQuadrante(pontos: PontoNineBox[], key: QuadranteKey): PontoNineBox[] {
  return pontos.filter((p) => p.quadrante === key).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/* ─── Movimentação entre ciclos (derivação de APRESENTAÇÃO) ──────────────── */

export type SentidoMovimento = 'evoluiu' | 'permaneceu' | 'regrediu';

export interface LeituraMovimento {
  /** Pessoas presentes nos DOIS ciclos — a base da comparação. */
  comparaveis: number;
  evoluiram: number;
  permaneceram: number;
  regrediram: number;
  /** Movimentos individuais (régua: soma das duas notas reais). */
  itens: { id: string; nome: string; sentido: SentidoMovimento; de: number; para: number }[];
}

/**
 * Compara o ciclo em foco com o anterior. Só entram pessoas com as DUAS notas
 * nos DOIS ciclos — quem está em apenas um deles não é comparável e não
 * alimenta contador nenhum (nada de zero presumido).
 */
export function lerMovimento(atual: PontoNineBox[], anterior: PontoNineBox[]): LeituraMovimento {
  const antes = new Map(
    anterior.filter((p) => p.colaboradorId && p.pontuacao !== null).map((p) => [p.colaboradorId as string, p] as const)
  );

  const itens = atual
    .filter((p) => p.colaboradorId && p.pontuacao !== null && antes.has(p.colaboradorId))
    .map((p) => {
      const de = antes.get(p.colaboradorId as string)?.pontuacao as number;
      const para = p.pontuacao as number;
      const sentido: SentidoMovimento = para > de ? 'evoluiu' : para < de ? 'regrediu' : 'permaneceu';
      return { id: p.id, nome: p.nome, sentido, de, para };
    })
    .sort((a, b) => Math.abs(b.para - b.de) - Math.abs(a.para - a.de) || a.nome.localeCompare(b.nome, 'pt-BR'));

  return {
    comparaveis: itens.length,
    evoluiram: itens.filter((i) => i.sentido === 'evoluiu').length,
    permaneceram: itens.filter((i) => i.sentido === 'permaneceu').length,
    regrediram: itens.filter((i) => i.sentido === 'regrediu').length,
    itens,
  };
}

/* ─── Atenção ("Foco agora") ─────────────────────────────────────────────── */

export interface LeituraAtencao {
  /** Total (união, sem repetir) de quem precisa de atenção. */
  total: number;
  /** Quadrantes de atenção (`QUADRANTES_ATENCAO`, hoje 'Sub-performer'). */
  emRisco: number;
  /** Classificados que não têm PDI vinculado. */
  semPdi: number;
  /** Sem nota e/ou sem potencial — fora da matriz, por falta de dado. */
  semClassificacao: number;
  /** Aprovados pelo gestor aguardando a validação do Potencial pelo RH. */
  aguardandoRh: number;
  /** Nomes de quem está aguardando o RH (o mesmo indicador os apresenta). */
  nomesAguardandoRh: string[];
  /** Aprovação do gestor pendente/devolvida/invalidada. */
  aguardandoAprovacao: number;
  nomesAguardandoAprovacao: string[];
}

export function lerAtencao(pontos: PontoNineBox[]): LeituraAtencao {
  const emRisco = pontos.filter((p) => p.quadrante !== null && QUADRANTES_ATENCAO.includes(p.quadrante));
  const semPdiLista = pontos.filter((p) => p.quadrante !== null && !p.temPdi);
  const aguardandoRhLista = pontos.filter((p) => p.aguardandoValidacaoRh === true);
  const aguardandoAprovacaoLista = pontos.filter((p) => p.aguardandoAprovacao === true);
  // Os pendentes de fluxo têm indicador próprio — não entram no "sem dado".
  const semClassificacao = pontos.filter(
    (p) => p.quadrante === null && !p.aguardandoValidacaoRh && !p.aguardandoAprovacao
  ).length;

  const ids = new Set([...emRisco.map((p) => p.id), ...semPdiLista.map((p) => p.id)]);
  return {
    total: ids.size,
    emRisco: emRisco.length,
    semPdi: semPdiLista.length,
    semClassificacao,
    aguardandoRh: aguardandoRhLista.length,
    nomesAguardandoRh: aguardandoRhLista.map((p) => p.nome),
    aguardandoAprovacao: aguardandoAprovacaoLista.length,
    nomesAguardandoAprovacao: aguardandoAprovacaoLista.map((p) => p.nome),
  };
}

/** Quem entra no "Foco agora" (união dos critérios, sem repetir). */
export function pontosEmAtencao(pontos: PontoNineBox[]): PontoNineBox[] {
  return pontos
    .filter(
      (p) => (p.quadrante !== null && QUADRANTES_ATENCAO.includes(p.quadrante)) || (p.quadrante !== null && !p.temPdi)
    )
    .sort((a, b) => (a.pontuacao ?? 99) - (b.pontuacao ?? 99) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/* ─── Destaques ──────────────────────────────────────────────────────────── */

/** Ranking por SOMATÓRIO das notas reais (desempate: desempenho, depois nome). */
export function rankingPontos(pontos: PontoNineBox[]): PontoNineBox[] {
  return pontos
    .filter((p) => p.quadrante !== null && p.pontuacao !== null)
    .sort(
      (a, b) =>
        (b.pontuacao as number) - (a.pontuacao as number) ||
        (b.nota as number) - (a.nota as number) ||
        a.nome.localeCompare(b.nome, 'pt-BR')
    );
}

/** Destaques exibidos no widget lateral. */
export function destaques(pontos: PontoNineBox[], limite = 4): PontoNineBox[] {
  return rankingPontos(pontos).slice(0, limite);
}

/* ─── Facetas dos filtros e busca ────────────────────────────────────────── */

function valoresUnicos(valores: (string | null)[]): string[] {
  return Array.from(new Set(valores.map((v) => String(v ?? '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
}

export function departamentosDisponiveis(pontos: PontoNineBox[]): string[] {
  return valoresUnicos(pontos.map((p) => p.departamento));
}

export function cargosDisponiveis(pontos: PontoNineBox[]): string[] {
  return valoresUnicos(pontos.map((p) => p.cargo));
}

/** Busca por nome, cargo, departamento e quadrante (o que o campo promete). */
export function correspondeBusca(ponto: PontoNineBox, termo: string): boolean {
  const t = termo.trim().toLowerCase();
  if (!t) return true;
  return [ponto.nome, ponto.cargo, ponto.departamento, ponto.nomeQuadrante]
    .map((v) => String(v ?? '').toLowerCase())
    .some((v) => v.includes(t));
}

/* ─── Insights (frases derivadas de contagens REAIS) ─────────────────────── */

/** Tipo semântico do insight — o card escolhe o ícone e o tom por ele. */
export type TipoInsight = 'risco' | 'pdi' | 'potencial' | 'oportunidade' | 'historico';

/**
 * Insight ESTRUTURADO: a frase é montada em TRECHOS, para o card dar peso aos
 * números e às palavras-chave sem reescrever conteúdo nenhum. O primeiro item da
 * lista é o mais grave (a ordem É a prioridade).
 */
export interface InsightEstruturado {
  id: string;
  tipo: TipoInsight;
  trechos: { texto: string; forte?: boolean }[];
}

/** Texto puro de um insight — a MESMA frase que a tela exibe. */
export function textoInsight(insight: InsightEstruturado): string {
  return insight.trechos.map((t) => t.texto).join('');
}

/**
 * Insights em ordem de GRAVIDADE, cada linha nascendo de uma contagem
 * comprovável — nenhuma recomendação genérica e nenhuma menção a plano de
 * sucesso (o dado não tem essa relação: ver a auditoria no topo do arquivo).
 *
 *   1. risco        — quadrante de atenção (Sub-performer);
 *   2. pdi          — classificados sem PDI vinculado;
 *   3. potencial    — fora da matriz por falta de nota/potencial;
 *   4. oportunidade — Core Players (base da empresa);
 *   5. histórico    — comparativo com o ciclo anterior (ou a ausência dele).
 */
export function lerInsightsEstruturados(
  contagens: Record<QuadranteKey, number>,
  atencao: LeituraAtencao,
  movimento: LeituraMovimento
): InsightEstruturado[] {
  const itens: InsightEstruturado[] = [];

  if (contagens['1-1'] > 0) {
    itens.push({
      id: 'sub-performer',
      tipo: 'risco',
      trechos: [
        { texto: `${contagens['1-1']} ${contagens['1-1'] === 1 ? 'Sub-performer' : 'Sub-performers'}`, forte: true },
        { texto: ' requer plano de recuperação.' },
      ],
    });
  }

  if (atencao.semPdi > 0) {
    itens.push({
      id: 'sem-pdi',
      tipo: 'pdi',
      trechos: [
        { texto: `${atencao.semPdi} ${atencao.semPdi === 1 ? 'colaborador' : 'colaboradores'}`, forte: true },
        { texto: ' classificados estão sem PDI vinculado.' },
      ],
    });
  }

  /* PENDÊNCIAS DE FLUXO — usam o MESMO card de insights (sem novo componente):
     aprovado pelo gestor ainda não é classificação oficial; o RH precisa
     validar o Potencial. A aprovação também pode estar pendente/invalidada. */
  if (atencao.aguardandoRh > 0) {
    itens.push({
      id: 'aguardando-rh',
      tipo: 'potencial',
      trechos: [
        {
          texto: `${atencao.aguardandoRh} ${atencao.aguardandoRh === 1 ? 'avaliação' : 'avaliações'}`,
          forte: true,
        },
        { texto: ' aprovada(s) pelo gestor aguardando a validação do Potencial pelo RH.' },
      ],
    });
  }

  if (atencao.aguardandoAprovacao > 0) {
    itens.push({
      id: 'aguardando-aprovacao',
      tipo: 'potencial',
      trechos: [
        {
          texto: `${atencao.aguardandoAprovacao} ${atencao.aguardandoAprovacao === 1 ? 'avaliação' : 'avaliações'}`,
          forte: true,
        },
        { texto: ' com aprovação do gestor pendente, devolvida ou invalidada.' },
      ],
    });
  }

  if (atencao.semClassificacao > 0) {
    itens.push({
      id: 'sem-classificacao',
      tipo: 'potencial',
      trechos: [
        {
          texto: `${atencao.semClassificacao} ${atencao.semClassificacao === 1 ? 'registro' : 'registros'}`,
          forte: true,
        },
        { texto: ' ficaram fora da matriz por falta de nota ou potencial.' },
      ],
    });
  }

  if (contagens['2-2'] > 0) {
    itens.push({
      id: 'core-players',
      tipo: 'oportunidade',
      trechos: [
        { texto: 'Manter foco no desenvolvimento de ' },
        { texto: `${contagens['2-2']} Core Player${contagens['2-2'] === 1 ? '' : 's'}`, forte: true },
        { texto: '.' },
      ],
    });
  }

  if (movimento.comparaveis > 0) {
    itens.push({
      id: 'historico',
      tipo: 'historico',
      trechos: [
        {
          texto: `${movimento.evoluiram} ${movimento.evoluiram === 1 ? 'pessoa evoluiu' : 'pessoas evoluíram'}`,
          forte: true,
        },
        { texto: ' no comparativo com o ciclo anterior (' },
        { texto: `${movimento.comparaveis} comparáveis`, forte: true },
        { texto: ').' },
      ],
    });
  } else {
    itens.push({
      id: 'historico',
      tipo: 'historico',
      trechos: [
        { texto: 'Sem histórico comparável', forte: true },
        { texto: ': nenhum colaborador aparece em dois ciclos com as duas notas preenchidas.' },
      ],
    });
  }

  return itens;
}

/** Versão em texto puro (uma frase por insight) — mesmo conteúdo, sem marcação. */
export function lerInsights(
  contagens: Record<QuadranteKey, number>,
  atencao: LeituraAtencao,
  movimento: LeituraMovimento
): string[] {
  return lerInsightsEstruturados(contagens, atencao, movimento).map(textoInsight);
}
