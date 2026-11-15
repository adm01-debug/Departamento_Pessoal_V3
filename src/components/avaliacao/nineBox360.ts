/**
 * ============================================================================
 * NINE-BOX · CONSOLIDAÇÃO 360° A PARTIR DOS FEEDBACKS PERSISTIDOS.
 *
 * Faz a ponte entre o que o banco devolve (`feedbacks_360`) e o MOTOR aprovado
 * (`motorAvaliacao360.consolidar360`). Reutiliza, sem duplicar:
 *   • `normalizarAvaliacoes`     → escala, status, divergências e SINALIZAÇÃO de
 *     semelhança (a suspeita NÃO torna ninguém inelegível);
 *   • `avaliacaoElegivel`        → único ponto de exclusão;
 *   • `selecionarRepresentante`  → estratégia aprovada `mais_recente` DENTRO de
 *     cada categoria (Gestor, Pares, Autoavaliação, Subordinados).
 *
 * A VERSÃO da avaliação do gestor NÃO é calculada aqui: chega pronta em
 * `versoesPorFeedback`, lida de `public.vw_feedbacks_360_versao` (o banco é a
 * autoridade — ver `CONTRATO_VERSAO_AVALIACAO`).
 * ============================================================================
 */
import {
  STATUS_QUE_NAO_CONSOLIDAM,
  classifyScore,
  normalizarAvaliacoes,
  selecionarRepresentante,
  type QuadranteKey,
} from './nineBoxConsolidacao';
import { QUADRANTE_POR_CHAVE, type ColaboradorNineBox } from './nineBoxComum';
import {
  CATEGORIAS_360,
  MOTIVO_NAO_CLASSIFICADO_360,
  consolidar360,
  type Categoria360,
  type Consolidacao360,
  type NotasPorCategoria,
  type StatusPorCategoria,
  type ValidacaoPotencial,
} from './motorAvaliacao360';

/** Tipos de avaliador que a base usa, mapeados para as quatro categorias. */
export const TIPO_PARA_CATEGORIA: Readonly<Record<string, Categoria360>> = {
  gestor: 'gestor',
  par: 'par',
  pares: 'par',
  auto: 'auto',
  autoavaliacao: 'auto',
  subordinado: 'subordinado',
  subordinados: 'subordinado',
};

export interface OpcoesConsolidacao360 {
  feedbacks: unknown[];
  cicloId: string | null;
  empresaId?: string | null;
  /** Validações de Potencial vigentes (tabela `feedbacks_360_validacoes_potencial`). */
  validacoes?: ValidacaoPotencial[];
  /** Versão canônica por feedback, vinda da view (NUNCA calculada no front). */
  versoesPorFeedback?: Record<string, string>;
  /**
   * Decisões do gestor (`feedbacks_360_aprovacoes_gestor`) e cabeçalhos
   * (`feedbacks_360_consolidacoes`). A classificação oficial SEMPRE exige a
   * decisão `aprovado` vigente para a versão consolidada. Os parâmetros são
   * opcionais apenas para compatibilidade de leitura; omitidos equivalem a
   * “sem aprovação” e NÃO classificam.
   */
  aprovacoes?: unknown[];
  consolidacoes?: unknown[];
}

/** Uma nota consolidada por categoria, com rastreabilidade do registro usado. */
export interface CategoriaConsolidada {
  categoria: Categoria360;
  nota: number | null;
  status: string | null;
  potencial: number | null;
  feedbackId: string | null;
  /** Quantos registros elegíveis existiam na categoria (≥2 ⇒ houve substituição). */
  registrosElegiveis: number;
  /** Houve registro mais recente substituindo um já concluído. */
  substituicaoDeConcluida: boolean;
}

export interface ResultadoConsolidacao360 extends Consolidacao360 {
  /** Detalhe por categoria — base dos "Ver detalhes" e da conferência do RH. */
  categorias: CategoriaConsolidada[];
  /** Registros sinalizados por semelhança (preservados, para revisão). */
  registrosSinalizados: string[];
  /** Data do registro elegível mais recente (ordenação por recência da aba). */
  criadoEm: number;
}

/**
 * Normaliza uma validação de Potencial vinda do BANCO para o contrato do motor.
 *
 * O serviço entrega a LINHA CRUA de `feedbacks_360_validacoes_potencial`
 * (`empresa_id`, `ciclo_id`, `colaborador_id`, `feedback_id`, `versao_avaliacao`,
 * `validado_por`, `validado_em`), enquanto `motorAvaliacao360.ValidacaoPotencial`
 * usa camelCase. Sem esta adaptação o motor NÃO reconhece a aprovação e o
 * colaborador cai em `potencial_sem_validacao` — era exatamente a divergência
 * que deixava a matriz vazia com avaliação válida.
 *
 * Aceita as DUAS formas (camelCase dos testes/preview e snake_case do banco) e
 * NÃO inventa campo algum: se faltar qualquer identidade, devolve `null`.
 */
export function normalizarValidacaoPotencial(valor: unknown): ValidacaoPotencial | null {
  const v = (valor ?? {}) as Record<string, unknown>;
  const texto = (x: unknown) => String(x ?? '').trim();

  const versaoAvaliacao = texto(v.versaoAvaliacao ?? v.versao_avaliacao);
  const validadoPor = texto(v.validadoPor ?? v.validado_por);
  const validadoEm = texto(v.validadoEm ?? v.validado_em);
  const empresaId = texto(v.empresaId ?? v.empresa_id);
  const colaboradorId = texto(v.colaboradorId ?? v.colaborador_id);
  const feedbackId = texto(v.feedbackId ?? v.feedback_id);

  if (!versaoAvaliacao || !validadoPor || !validadoEm || !empresaId || !colaboradorId || !feedbackId) {
    return null;
  }

  const cicloBruto = v.cicloId ?? v.ciclo_id ?? null;
  return {
    versaoAvaliacao,
    validadoPor,
    validadoEm,
    empresaId,
    cicloId: cicloBruto === null || cicloBruto === undefined ? null : String(cicloBruto),
    colaboradorId,
    feedbackId,
  };
}

/**
 * Consolida por (empresa + ciclo + colaborador) aplicando a metodologia aprovada.
 * Somente avaliações ELEGÍVEIS entram; `pendente`/`cancelado` ficam fora.
 */
export function consolidarNineBox360({
  feedbacks,
  cicloId,
  empresaId = null,
  versoesPorFeedback = {},
  aprovacoes,
  consolidacoes,
}: OpcoesConsolidacao360): ResultadoConsolidacao360[] {
  const doCiclo = normalizarAvaliacoes(feedbacks, empresaId).filter((a) => {
    if (cicloId !== null && a.cicloId !== String(cicloId)) return false;
    if (empresaId !== null && a.empresaId !== null && a.empresaId !== empresaId) return false;
    return true;
  });

  const porColaborador = new Map<string, typeof doCiclo>();
  doCiclo
    .filter((a) => a.colaboradorId !== null)
    .forEach((a) => {
      const chave = String(a.colaboradorId);
      porColaborador.set(chave, [...(porColaborador.get(chave) ?? []), a]);
    });

  /* ── APROVAÇÃO VIGENTE (decisão final do gestor) ─────────────────────────
     `feedbacks_360_aprovacoes_gestor` guarda a decisão com a versão do CONJUNTO;
     `feedbacks_360_consolidacoes` mantém a versão vigente. Só se classifica
     quando as duas casam — decisão antiga é invalidação, não aprovação. O gate
     é OBRIGATÓRIO: concluir/salvar, sozinho, nunca classifica; sem arrays o
     resultado também fica bloqueado (fail-closed). */
  const gateAprovacao = true;
  const decisaoPorChave = new Map<string, { decisao: string; versao: string; decididoEm: number }>();
  (aprovacoes ?? []).forEach((bruto) => {
    const a = (bruto ?? {}) as Record<string, unknown>;
    const col = String(a.colaborador_id ?? '').trim();
    if (!col) return;
    const cicloDaDecisao = String(a.ciclo_id ?? '').trim();
    if (cicloId !== null && cicloDaDecisao !== String(cicloId)) return;
    if (empresaId && a.empresa_id && String(a.empresa_id) !== empresaId) return;
    const chave = `${cicloDaDecisao}::${col}`;
    const quando = Date.parse(String(a.decidido_em ?? '')) || 0;
    const atual = decisaoPorChave.get(chave);
    if (!atual || quando >= atual.decididoEm) {
      decisaoPorChave.set(chave, {
        decisao: String(a.decisao ?? '')
          .trim()
          .toLowerCase(),
        versao: String(a.versao_avaliacao ?? '').trim(),
        decididoEm: quando,
      });
    }
  });
  const versaoConsolidadaPorChave = new Map<string, string>();
  const aprovadoPorChave = new Map<string, { desempenho: number | null; potencial: number | null }>();
  (consolidacoes ?? []).forEach((bruto) => {
    const c = (bruto ?? {}) as Record<string, unknown>;
    const col = String(c.colaborador_id ?? '').trim();
    if (!col) return;
    const cicloDaConsolidacao = String(c.ciclo_id ?? '').trim();
    if (cicloId !== null && cicloDaConsolidacao !== String(cicloId)) return;
    if (empresaId && c.empresa_id && String(c.empresa_id) !== empresaId) return;
    const versao = String(c.versao_consolidada ?? '').trim();
    const chave = `${cicloDaConsolidacao}::${col}`;
    if (versao) versaoConsolidadaPorChave.set(chave, versao);
    const numero = (x: unknown) => {
      if (x === null || x === undefined || x === '') return null;
      const n = Number(x);
      return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
    };
    const desempenho = numero(c.desempenho_aprovado);
    const potencial = numero(c.potencial_aprovado);
    if (desempenho !== null && potencial !== null) {
      aprovadoPorChave.set(chave, { desempenho, potencial });
    }
  });

  return Array.from(porColaborador.entries()).map(([colaboradorId, registros]) => {
    // ELEGIBILIDADE POR CATEGORIA (§6.1): identidade + NOTA de desempenho válida +
    // status autorizado. Potencial NÃO é exigido aqui — Pares, Autoavaliação e
    // Subordinados normalmente só avaliam desempenho; o Potencial é exigido
    // exclusivamente do GESTOR, na etapa (3) do motor.
    const elegiveis = registros.filter(
      (a) => a.colaboradorId !== null && a.nota !== null && !STATUS_QUE_NAO_CONSOLIDAM.includes(a.status)
    );
    const sinalizados = registros.filter((a) => a.possivelDuplicata).map((a) => a.id);

    const categorias: CategoriaConsolidada[] = CATEGORIAS_360.map((categoria) => {
      const daCategoria = elegiveis.filter((a) => TIPO_PARA_CATEGORIA[a.tipo] === categoria);
      const representante = selecionarRepresentante(daCategoria);
      return {
        categoria,
        nota: representante?.nota ?? null,
        status: representante?.status ?? null,
        potencial: representante?.potencial ?? null,
        feedbackId: representante?.id ?? null,
        registrosElegiveis: daCategoria.length,
        substituicaoDeConcluida: daCategoria.length > 1,
      };
    });

    const notas: NotasPorCategoria = {};
    const status: StatusPorCategoria = {};
    categorias.forEach((c) => {
      notas[c.categoria] = c.nota;
      status[c.categoria] = c.status;
    });

    const gestor = categorias.find((c) => c.categoria === 'gestor');
    const versaoGestor = gestor?.feedbackId ? (versoesPorFeedback[gestor.feedbackId] ?? null) : null;

    let consolidado = consolidar360({
      empresaId,
      cicloId,
      colaboradorId,
      notas,
      status,
      potencialGestor: gestor?.potencial ?? null,
      versaoGestor,
      substituicaoDeConcluida: categorias.some((c) => c.substituicaoDeConcluida),
    });

    if (gateAprovacao) {
      const chave = `${String(cicloId ?? '').trim()}::${colaboradorId}`;
      const decisao = decisaoPorChave.get(chave) ?? null;
      const versaoConsolidada = versaoConsolidadaPorChave.get(chave) ?? null;
      // Versão consolidada + decisão são obrigatórias: sem os dois não existe
      // aprovação oficial para esta versão (fail-closed).
      if (!decisao || !versaoConsolidada || decisao.versao !== versaoConsolidada) {
        consolidado = {
          ...consolidado,
          classificavel: false,
          quadrante: null,
          // Preserva o motivo ESPECÍFICO da base (sem gestor, gestor pendente…).
          // Só usa `aprovacao_pendente` quando a única coisa que faltava era a
          // decisão do gestor.
          motivo: consolidado.motivo ?? 'aprovacao_pendente',
        };
      } else if (decisao.decisao !== 'aprovado') {
        consolidado = {
          ...consolidado,
          classificavel: false,
          quadrante: null,
          motivo: 'aprovacao_devolvida',
        };
      } else {
        /**
         * FLUXO NOVO: a aprovação do gestor confirma os valores do conjunto.
         * O snapshot `desempenho_aprovado`/`potencial_aprovado` é OBRIGATÓRIO:
         * uma decisão antiga/sem snapshot não pode classificar por aproximação.
         */
        const snapshot = aprovadoPorChave.get(chave) ?? null;
        if (!snapshot) {
          consolidado = {
            ...consolidado,
            classificavel: false,
            quadrante: null,
            desempenho: null,
            potencial: null,
            motivo: 'aprovacao_sem_valores',
          };
        } else {
          consolidado = consolidar360({
            empresaId,
            cicloId,
            colaboradorId,
            notas,
            status,
            versaoGestor,
            substituicaoDeConcluida: categorias.some((c) => c.substituicaoDeConcluida),
            aprovado: true,
            desempenhoAprovado: snapshot.desempenho,
            potencialAprovado: snapshot.potencial,
          });
        }
      }
    }

    return {
      ...consolidado,
      categorias,
      registrosSinalizados: sinalizados,
      // Recência: maior `criadoEm` entre os registros elegíveis do colaborador.
      criadoEm: elegiveis.reduce((maior, a) => Math.max(maior, a.criadoEm), 0),
    };
  });
}

/** Item pronto para os componentes visuais existentes (mesma forma de `PontoNineBox`). */
export interface Ponto360 {
  id: string;
  colaboradorId: string;
  nome: string;
  cargo: string | null;
  departamento: string | null;
  foto: string | null;
  nota: number | null;
  potencial: number | null;
  desempenho: ReturnType<typeof classifyScore> | null;
  potencialFaixa: ReturnType<typeof classifyScore> | null;
  quadrante: QuadranteKey | null;
  nomeQuadrante: string | null;
  pontuacao: number | null;
  /** Motivo legível quando não há classificação (equivalente a `pendencias`). */
  motivoNaoClassificado: string | null;
  /** Texto pronto do motivo (para exibição, se necessário). */
  motivoNaoClassificadoTexto: string | null;
  /** Aprovado pelo gestor, aguardando a validação do Potencial pelo RH. */
  aguardandoValidacaoRh: boolean;
  /** Aprovação do gestor pendente, devolvida ou invalidada. */
  aguardandoAprovacao: boolean;
  /** Rastreabilidade preservada para a coluna lateral e os detalhes. */
  categoriasUsadas: Categoria360[];
  substituicaoDeConcluida: boolean;
  registrosSinalizados: string[];
  /* ── Campos que os componentes JÁ consomem (mesma forma de `PontoNineBox`) ── */
  /** Recência do registro elegível mais recente. */
  criadoEm: number;
  /** PDI vinculado (relação real por `colaborador_id`). */
  temPdi: boolean;
  /** Classificação "fora da matriz" no vocabulário da aba existente. */
  pendencias: 'sem_potencial' | 'sem_nota' | 'sem_base' | null;
}

/** Converte o motivo do motor para o vocabulário de pendências da aba. */
function pendenciaEquivalente(motivo: string | null): Ponto360['pendencias'] {
  if (motivo === null) return null;
  if (motivo === 'gestor_sem_potencial' || motivo === 'potencial_sem_validacao') return 'sem_potencial';
  return 'sem_base';
}

/**
 * ADAPTADOR para a interface aprovada: converte a consolidação oficial na MESMA
 * forma que a matriz/KPIs já consomem (superconjunto de `PontoNineBox`), sem
 * alterar nenhum componente visual. `pdis` entra apenas para marcar "Com PDI".
 */
export function pontos360(
  consolidacoes: ResultadoConsolidacao360[],
  colaboradores: ColaboradorNineBox[] = [],
  pdis: unknown[] = []
): Ponto360[] {
  const idsComPdi = new Set(
    pdis.map((p) => String((p as Record<string, unknown>)?.colaborador_id ?? '').trim()).filter(Boolean)
  );

  return consolidacoes.map((c) => {
    const quem = colaboradores.find((x) => String(x?.id ?? '') === c.colaboradorId);
    const nome = String(quem?.nome_completo ?? '').trim() || 'Sem colaborador';
    const quadrante = c.quadrante;
    const motivo = c.classificavel ? null : c.motivo;
    const aguardandoValidacaoRh = motivo === 'potencial_sem_validacao';
    const aguardandoAprovacao = motivo === 'aprovacao_pendente' || motivo === 'aprovacao_devolvida';
    return {
      id: c.categorias.find((x) => x.feedbackId)?.feedbackId ?? `consolidado360:${c.colaboradorId}`,
      colaboradorId: c.colaboradorId,
      nome,
      cargo: String(quem?.cargo ?? '').trim() || null,
      departamento: String(quem?.departamento ?? '').trim() || null,
      foto: String(quem?.foto_url ?? '').trim() || null,
      nota: c.desempenho,
      potencial: c.potencial,
      desempenho: c.desempenho === null ? null : classifyScore(c.desempenho),
      potencialFaixa: c.potencial === null ? null : classifyScore(c.potencial),
      quadrante,
      nomeQuadrante: quadrante ? QUADRANTE_POR_CHAVE[quadrante].nome : null,
      pontuacao: c.desempenho !== null && c.potencial !== null ? c.desempenho + c.potencial : null,
      motivoNaoClassificado: motivo,
      /** Texto pronto para exibição (o motivo acima é o código do motor). */
      motivoNaoClassificadoTexto: motivo ? MOTIVO_NAO_CLASSIFICADO_360[motivo] : null,
      aguardandoValidacaoRh,
      aguardandoAprovacao,
      categoriasUsadas: c.categoriasUsadas,
      substituicaoDeConcluida: c.substituicaoDeConcluida,
      registrosSinalizados: c.registrosSinalizados,
      criadoEm: c.criadoEm,
      temPdi: idsComPdi.has(c.colaboradorId),
      pendencias: pendenciaEquivalente(motivo),
    };
  });
}
