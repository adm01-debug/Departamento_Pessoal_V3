/**
 * ============================================================================
 * NINE-BOX — CAMADA DE CONSOLIDAÇÃO (Empresa + Ciclo + Colaborador).
 *
 * Esta é a ÚNICA porta de entrada da classificação do Nine-Box. A matriz, os
 * KPIs, os destaques e os insights leem daqui — nenhum deles volta a percorrer
 * `feedbacks_360` linha a linha.
 *
 * ── GARANTIA CENTRAL ────────────────────────────────────────────────────────
 * "1 colaborador + 1 ciclo = no máximo 1 classificação consolidada."
 * O agrupamento é por `empresa_id` + `ciclo_id` + `avaliado_id`, então o mesmo
 * colaborador nunca aparece duas vezes na matriz, e avaliações de ciclos
 * diferentes nunca se misturam.
 *
 * ── O QUE ESTA CAMADA NÃO FAZ (de propósito) ────────────────────────────────
 *  • NÃO presume potencial (o antigo `potencial || 2` está morto) e NÃO
 *    transforma desempenho ausente em nota baixa: sem as DUAS notas válidas o
 *    colaborador sai como "Não classificado — avaliação incompleta";
 *  • NÃO inventa pesos de ponderação entre gestor/par/autoavaliação. Enquanto a
 *    metodologia oficial não for aprovada, a estratégia em uso é
 *    `mais_recente` (a mesma leitura que a aba já exibia) e as alternativas
 *    ficam prontas em `PROPOSTA_CONSOLIDACAO`, desligadas;
 *  • NÃO escreve nada: nenhuma query, mutation, migration ou RLS. Tudo é
 *    cálculo em memória sobre a lista que a página já carregou.
 *
 * ── O QUE ELA FAZ ALÉM DO BÁSICO ────────────────────────────────────────────
 *  • valida a ESCALA das notas (1–5) e isola valores fora da faixa
 *    (`notasForaDaEscala`) em vez de classificá-los;
 *  • identifica DUPLICATAS REAIS (mesmo ciclo + colaborador + avaliador + tipo +
 *    notas = o mesmo registro gravado duas vezes) e as exclui da consolidação;
 *  • preserva RASTREABILIDADE: `feedbackIdsUtilizados` diz exatamente quais
 *    avaliações sustentam a classificação, e `notasPorTipo` guarda a média por
 *    tipo de avaliador para o dia em que a ponderação for aprovada;
 *  • expõe `quantidadeAvaliacoes` (registros no grupo) e
 *    `quantidadeAvaliacoesValidas` (com as duas notas na escala), para nunca
 *    confundir total de feedbacks com total de pessoas.
 *
 * ── ESTADO DAS AVALIAÇÕES (pendente de decisão de negócio) ─────────────────
 * `STATUS_QUE_NAO_CONSOLIDAM` está VAZIO: hoje toda avaliação com as duas notas
 * na escala consolida, independente do `status`. O filtro por status fica
 * pronto, mas só deve ser ligado depois de definido QUAIS status representam
 * avaliação finalizada.
 * ============================================================================
 */

/* ─── Escala das notas ────────────────────────────────────────────────────── */

/** Escala oficial das notas de desempenho e potencial na base. */
export const ESCALA_NOTA = { min: 1, max: 5 } as const;

/**
 * Nota utilizável: número finito DENTRO da escala. Qualquer outra coisa
 * (nulo, vazio, texto, 0, 7) devolve `null` — nunca um valor corrigido
 * silenciosamente. Valores fora da faixa são contados à parte pelo chamador.
 */
export function notaNaEscala(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  if (n < ESCALA_NOTA.min || n > ESCALA_NOTA.max) return null;
  return n;
}

/** Diz se o valor existe mas está fora da escala (para o relatório de dados). */
export function foraDaEscala(valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === '') return false;
  const n = Number(valor);
  return Number.isFinite(n) && (n < ESCALA_NOTA.min || n > ESCALA_NOTA.max);
}

/* ─── VOCABULÁRIO: cinco conceitos que NÃO se confundem ─────────────────────
 *
 *  1. SUSPEITA DE DUPLICIDADE — semelhança de chave (ciclo+colaborador+avaliador
 *     +tipo+notas). Sinaliza, não decide. Ver `marcarSuspeitas` / `possivelDuplicata`.
 *  2. DUPLICIDADE COMPROVADA — só existe quando há identificador de operação
 *     (idempotência) provando que é o MESMO ato gravado duas vezes. Nunca é
 *     deduzida no cliente, e por isso NÃO aparece como exclusão aqui: quem
 *     impede a segunda gravação é o backend, no momento da escrita.
 *  3. ELEGIBILIDADE — escala 1–5, identidade e status autorizado. Ver
 *     `avaliacaoElegivel`. É o ÚNICO ponto de exclusão do pipeline.
 *  4. REGRA APROVADA DE CONSOLIDAÇÃO — `EstrategiaConsolidacao`
 *     (`mais_recente` hoje). Define COMO a nota sai.
 *  5. SELEÇÃO DE REPRESENTANTE — `selecionarRepresentante`. Aplica a regra
 *     aprovada entre os elegíveis; a suspeita só desempata tempos iguais.
 *
 * Nenhum dos cinco pode ser substituído por outro: em especial, (1) não vira (2)
 * por semelhança, e (2) não interfere em (3).
 * ─────────────────────────────────────────────────────────────────────────── */

/* ─── PIPELINE EM QUATRO ETAPAS (cada uma isolada e testável) ───────────────
 *
 *  1. IDENTIFICAÇÃO DE SUSPEITA — `marcarSuspeitas()`. Diz APENAS "este registro
 *     se parece com outro". Não decide, não remove, não prejudica ninguém.
 *  2. RASTREABILIDADE — os ids sinalizados ficam em `registrosSinalizados` e o
 *     porquê em `motivoSinalizacao`, para revisão humana.
 *  3. ELEGIBILIDADE — `avaliacaoElegivel()`. Depende SÓ de escala de notas, de
 *     identidade e do status autorizado a consolidar. É INDEPENDENTE de suspeita:
 *     um registro sinalizado continua elegível.
 *  4. SELEÇÃO — `selecionarRepresentante()`. Entre os ELEGÍVEIS, escolhe quem
 *     representa a pessoa. A suspeita entra aqui apenas como desempate: o
 *     registro NÃO sinalizado tem preferência quando existe alternativa.
 *
 * O invariante que protege o dado: nenhuma etapa anterior pode excluir ninguém —
 * exclusão só existe na ELEGIBILIDADE, e por motivo alheio à semelhança.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * ETAPA 3 — ELEGIBILIDADE. Um registro é elegível quando tem as duas notas NA
 * ESCALA 1–5, tem identidade (colaborador) e seu status permite consolidar.
 * Semelhança com outro registro NÃO é motivo de inelegibilidade.
 *
 * A checagem de escala é redundante com `notaNaEscala` (que já roda antes), mas
 * é mantida como defesa em profundidade: qualquer valor fora de 1–5 que chegue
 * aqui por outro caminho continua barrado.
 */
export function avaliacaoElegivel(
  avaliacao: Pick<AvaliacaoNormalizada, 'colaboradorId' | 'nota' | 'potencial' | 'status'>,
  statusQueNaoConsolidam: readonly string[] = STATUS_QUE_NAO_CONSOLIDAM
): boolean {
  return (
    avaliacao.colaboradorId !== null &&
    notaNaEscala(avaliacao.nota) !== null &&
    notaNaEscala(avaliacao.potencial) !== null &&
    !statusQueNaoConsolidam.includes(avaliacao.status)
  );
}

/**
 * ETAPA 4 — SELEÇÃO. Aplica a REGRA APROVADA de consolidação (estratégia ativa)
 * entre os ELEGÍVEIS, nesta ordem:
 *   1. o MAIS RECENTE (`atualizadoEm`) — é a regra aprovada e ela PREVALECE;
 *   2. em empate TOTAL de tempo, o não sinalizado (o "original" antes da cópia);
 *   3. o mais antigo (`criadoEm`), como desempate estável;
 *   4. id, para o resultado ser determinístico.
 *
 * IMPORTANTE: a sinalização (etapa 1) NÃO rebaixa avaliação legítima. Uma
 * reavaliação mais recente do mesmo avaliador, com notas iguais, CONTINUA sendo
 * a representante — semelhança não é prova de duplicidade. A suspeita só decide
 * quando o tempo não decide.
 *
 * Se nenhum elegível existir (ou a estratégia for de média, que não elege um
 * representante único), devolve `null`.
 */
export function selecionarRepresentante(
  elegiveis: AvaliacaoNormalizada[],
  estrategia: EstrategiaConsolidacao = ESTRATEGIA_ATIVA
): AvaliacaoNormalizada | null {
  if (elegiveis.length === 0) return null;
  if (estrategia !== 'mais_recente') {
    // Estratégias de média não elegem representante único; quem decide é a média.
    return null;
  }
  return [...elegiveis].sort(
    (a, b) =>
      b.atualizadoEm - a.atualizadoEm ||
      Number(a.possivelDuplicata) - Number(b.possivelDuplicata) ||
      a.criadoEm - b.criadoEm ||
      a.id.localeCompare(b.id)
  )[0];
}

/**
 * POLÍTICA DE DUPLICATAS (revisada) — nenhum registro é descartado por
 * SEMELHANÇA.
 *
 * Histórico: a versão anterior tratava como duplicata dois registros com a mesma
 * chave (ciclo+colaborador+avaliador+tipo+notas) criados dentro de 5 minutos e
 * DESCARTAVA o segundo. Essa heurística foi REMOVIDA: semelhança não é prova de
 * duplicidade — dois feedbacks legítimos podem ter as mesmas notas.
 *
 * Regra atual:
 *  • semelhança ⇒ o registro é PRESERVADO e SINALIZADO (`possivelDuplicata` +
 *    `motivoSinalizacao`), para revisão humana e rastreabilidade;
 *  • prova inequívoca de duplicidade só existe com identificador de operação
 *    (idempotência) no momento da GRAVAÇÃO — responsabilidade do backend, que
 *    nem cria o segundo registro;
 *  • a consolidação continua elegendo UM representante (estratégia documentada),
 *    mas todos os ids permanecem rastreáveis em `registrosSinalizados`.
 */
export const POLITICA_DUPLICATAS = {
  descarte_automatico: false,
  sinaliza_semelhanca: true,
  exige_idempotencia_na_gravacao: true,
  janela_de_tempo: null, // heurística de 5 minutos removida
} as const;

/* ─── Status (auditoria da Fase 1 desta rodada) ───────────────────────────── */

/**
 * MAPA DOS STATUS — o que a investigação comprovou:
 *
 *  • `feedbacks_360.status` é `text | null` no schema, sem CHECK/enum: aceita
 *    qualquer string;
 *  • o ÚNICO caminho de escrita do app é `NovoFeedbackDialog` →
 *    `avaliacaoService.criarFeedback`, que grava **`status: 'pendente'`**;
 *  • NÃO existe (hoje) nenhuma ação de FINALIZAR avaliação: não há
 *    `atualizarFeedback`, não há `update` em `feedbacks_360`, não há botão de
 *    conclusão em nenhuma aba. `'concluido'` aparece só em mocks/seed.
 *
 * CONSEQUÊNCIA (por isso o filtro continua DESLIGADO): se
 * `STATUS_QUE_NAO_CONSOLIDAM` recebesse `'pendente'` hoje, **toda avaliação
 * criada pelo próprio sistema sumiria do Nine-Box**. Ligar o filtro exige, antes,
 * um fluxo real de finalização.
 */
export const MAPA_STATUS_FEEDBACK = {
  escritos_pelo_app: ['pendente'],
  observados_em_mock_seed: ['concluido'],
  finalizacao_existe: false,
  caminho_de_escrita: 'NovoFeedbackDialog → avaliacaoService.criarFeedback (INSERT, status: "pendente")',
  atualizacao_de_status: 'inexistente (nenhum UPDATE em feedbacks_360 no código)',
} as const;

/**
 * PROPOSTA (pendente de aprovação) de quais status consolidam. NÃO está ligada.
 * Enquanto não existir fluxo de finalização, ligar qualquer item aqui esvazia a
 * matriz — a decisão precisa vir junto com o fluxo.
 */
export const PROPOSTA_STATUS = {
  permitidos_sugeridos: ['concluido', 'finalizado', 'aprovado', 'validado'],
  excluidos_sugeridos: ['pendente', 'rascunho', 'em_andamento', 'cancelado', 'reprovado'],
  bloqueio: 'Sem ação de "finalizar avaliação", todo registro nasce (e fica) `pendente`.',
} as const;

/** Rótulo do colaborador que não pode ser classificado. */
export const ROTULO_NAO_CLASSIFICADO = 'Não classificado — avaliação incompleta';

/** Situação da consolidação de um colaborador no ciclo. */
export type StatusConsolidacao = 'consolidado' | 'incompleto' | 'sem_base';

/**
 * Status que NÃO consolidam. Vazio de propósito: ligar isto é uma decisão de
 * negócio (quais status representam avaliação finalizada), não uma correção.
 */
export const STATUS_QUE_NAO_CONSOLIDAM: readonly string[] = [];

/* ─── Estratégia de combinação das avaliações ─────────────────────────────── */

/**
 * Como combinar as avaliações válidas de um colaborador no ciclo.
 *   • `mais_recente`   — o registro mais recente representa o colaborador
 *     (comportamento em produção hoje; PROVISÓRIO);
 *   • `media_simples`  — média aritmética de todas as avaliações válidas
 *     (alternativa PRONTA, DESLIGADA até aprovação);
 *   • `media_por_tipo` — média por tipo de avaliador (gestor/par/auto/
 *     subordinado) e combinação por PESOS APROVADOS pelo RH. Se não houver
 *     pesos definidos, NÃO classifica (não inventa ponderação).
 */
export type EstrategiaConsolidacao = 'mais_recente' | 'media_simples' | 'media_por_tipo';

/** Estratégia em uso. Trocar aqui muda a regra oficial — exige aprovação. */
export const ESTRATEGIA_ATIVA: EstrategiaConsolidacao = 'mais_recente';

/**
 * PROPOSTA de metodologia de consolidação — para aprovação. Nenhuma das opções
 * além da declarada em `ESTRATEGIA_ATIVA` está ativa.
 */
export const PROPOSTA_CONSOLIDACAO = {
  pergunta: 'Como combinar avaliações de gestor, pares e autoavaliação do mesmo colaborador no ciclo?',
  opcoes: [
    {
      id: 'mais_recente',
      regra: 'A avaliação mais recente do ciclo representa o colaborador.',
      a_favor: 'Nenhuma ponderação inventada; é o que a aba já exibe hoje.',
      contra: 'Ignora avaliações de outros avaliadores (perde a leitura 360º).',
      ativa: true,
    },
    {
      id: 'media_simples',
      regra: 'Média aritmética de todas as avaliações válidas (desempenho e potencial, separadamente).',
      a_favor: 'Usa todo o material 360º sem inventar peso por tipo.',
      contra: 'Pondera autoavaliação igual a gestor — decisão de RH.',
      ativa: false,
    },
    {
      id: 'media_por_tipo',
      regra: 'Média por tipo de avaliador (gestor, pares, auto, subordinado) combinada por pesos definidos pelo RH.',
      a_favor: 'Aderente ao modelo 360º — cada voz tem o peso que o RH decidir.',
      contra: 'EXIGE pesos aprovados. Sem eles a função recusa calcular (não classifica).',
      ativa: false,
      implementada: true,
      onde: 'combinarNotasPorTipo() + EstrategiaConsolidacao "media_por_tipo"',
      insumo: 'notasPorTipo é calculado em toda consolidação, sem alterar nenhum número exibido hoje.',
    },
    {
      id: 'potencial_por_gestor',
      regra: 'Potencial definido apenas pelo GESTOR (pares/auto só avaliam desempenho).',
      a_favor: 'Potencial é julgamento de gestão/RH; pares tendem a superestimar.',
      contra: 'Reduz a base do eixo horizontal quando o gestor não avaliou.',
      ativa: false,
      implementada: true,
      onde: 'parâmetro `potencialSomenteDe` de combinarNotasPorTipo()',
    },
  ],
  insumos_prontos: 'notasPorTipo (média de desempenho e potencial por tipo) já é calculado em cada consolidação.',
} as const;

/* ─── Consolidação 360° POR TIPO (pronta; pesos bloqueados) ───────────────── */

/**
 * PESOS de DESEMPENHO por tipo de avaliador. `null` = metodologia **não
 * aprovada pelo RH** (estado atual). Enquanto for `null`, `combinarNotasPorTipo`
 * recusa calcular (`sem_pesos_aprovados`) — nenhuma ponderação é inventada.
 */
export const PESOS_POR_TIPO: Record<string, number> | null = null;

/**
 * PESOS de POTENCIAL — regra SEPARADA da de desempenho.
 *
 * `null` de propósito: potencial costuma ser julgamento de gestão/RH, e quem
 * está autorizado a avaliá-lo ainda será definido. Não existe fallback para os
 * pesos de desempenho — usar a mesma tabela nos dois eixos seria inventar regra.
 */
export const PESOS_POTENCIAL: Record<string, number> | null = null;

/**
 * PROPOSTA INICIAL de ponderação (60/25/10/5) — **REGISTRADA, NÃO APLICADA**.
 *
 * Fica aqui como dado inerte, referenciável (e auditável) apenas depois da
 * aprovação da metodologia. Nada no código lê este objeto para calcular: quem
 * calcula continua sendo `PESOS_POR_TIPO` / `PESOS_POTENCIAL`, hoje nulos.
 */
export const PROPOSTA_PESOS_INICIAL = {
  aprovada: false,
  origem: 'proposta inicial para discussão com o RH',
  /** Eixo vertical da matriz (desempenho). */
  desempenho: { gestor: 0.6, par: 0.25, auto: 0.1, subordinado: 0.05 },
  /** Eixo horizontal da matriz — PENDENTE: depende de quem pode avaliar potencial. */
  potencial: null,
  pendencia: 'Definir se potencial é 100% gestor, gestor+autoavaliação, ou outra composição.',
  observacao: 'As duas regras são independentes; ativar uma não ativa a outra.',
} as const;

export interface OpcoesPesosPorTipo {
  /** Pesos de DESEMPENHO. `null`/ausente = não aprovado. */
  pesos?: Record<string, number> | null;
  /** Pesos de DESEMPENHO com nome explícito (precedência sobre `pesos`). */
  pesosDesempenho?: Record<string, number> | null;
  /**
   * Pesos de POTENCIAL — regra SEPARADA. Sem valor próprio, o potencial fica
   * `null`: não herda os pesos de desempenho (isso seria inventar regra).
   */
  pesosPotencial?: Record<string, number> | null;
  /**
   * Tipos autorizados a definir POTENCIAL (ex.: `['gestor']`). `null` = todos.
   * Potencial costuma ser julgamento de gestão/RH, não de pares/auto — por isso
   * o recorte é parametrizável e fica explícito na resposta.
   */
  potencialSomenteDe?: readonly string[] | null;
}

export type MotivoPeso = 'ok' | 'sem_pesos_aprovados' | 'sem_tipos_com_peso' | 'sem_avaliacoes';

export interface ResultadoPesosPorTipo {
  desempenho: number | null;
  potencial: number | null;
  /** Pesos efetivamente usados no desempenho, já renormalizados. */
  pesosUsados: Record<string, number>;
  /** Pesos efetivamente usados no potencial (vazio quando não há regra). */
  pesosUsadosPotencial: Record<string, number>;
  /** Tipos que entraram na conta de desempenho. */
  tiposConsiderados: string[];
  /** Tipos presentes na avaliação mas sem peso aprovado (ficaram de fora). */
  tiposIgnorados: string[];
  /** Motivo por eixo — as duas regras falham independentemente. */
  motivoDesempenho: MotivoPeso;
  motivoPotencial: MotivoPeso;
  motivo: MotivoPeso;
}

/**
 * Combina as médias por tipo de avaliador usando pesos APROVADOS.
 *
 * Regras (todas explícitas, nada presumido):
 *  • cada EIXO tem a própria regra: sem pesos no eixo → aquele eixo fica `null`;
 *  • tipos presentes na avaliação sem peso aprovado são EXCLUÍDOS e listados em
 *    `tiposIgnorados` (nunca recebem peso "chutado");
 *  • os pesos restantes são renormalizados para somar 1 sobre os tipos que
 *    realmente têm nota;
 *  • `potencialSomenteDe` restringe quem pode definir potencial;
 *  • nenhum eixo herda a configuração do outro.
 */
export function combinarNotasPorTipo(
  notasPorTipo: ConsolidacaoColaborador['notasPorTipo'],
  {
    pesos = PESOS_POR_TIPO,
    pesosDesempenho,
    pesosPotencial = PESOS_POTENCIAL,
    potencialSomenteDe = null,
  }: OpcoesPesosPorTipo = {}
): ResultadoPesosPorTipo {
  const tipos = Object.keys(notasPorTipo ?? {});
  const vazio = (motivo: MotivoPeso): ResultadoPesosPorTipo => ({
    desempenho: null,
    potencial: null,
    pesosUsados: {},
    pesosUsadosPotencial: {},
    tiposConsiderados: [],
    tiposIgnorados: [],
    motivoDesempenho: motivo,
    motivoPotencial: motivo,
    motivo,
  });

  if (tipos.length === 0) return vazio('sem_avaliacoes');

  const regraDesempenho = pesosDesempenho ?? pesos;

  /** Média ponderada de um eixo, renormalizando sobre os tipos que têm valor. */
  const ponderar = (
    campo: 'desempenho' | 'potencial',
    pesosDoEixo: Record<string, number> | null,
    filtro: readonly string[] | null
  ) => {
    if (!pesosDoEixo || Object.keys(pesosDoEixo).length === 0) {
      return {
        valor: null as number | null,
        pesos: {} as Record<string, number>,
        motivo: 'sem_pesos_aprovados' as MotivoPeso,
      };
    }
    const elegiveis = tipos.filter(
      (t) => Number(pesosDoEixo[t]) > 0 && (filtro === null || filtro.includes(t)) && notasPorTipo[t]?.[campo] !== null
    );
    const totalPeso = elegiveis.reduce((soma, t) => soma + Number(pesosDoEixo[t]), 0);
    if (elegiveis.length === 0 || totalPeso <= 0) {
      return {
        valor: null as number | null,
        pesos: {} as Record<string, number>,
        motivo: 'sem_tipos_com_peso' as MotivoPeso,
      };
    }
    const valor =
      elegiveis.reduce((soma, t) => soma + Number(pesosDoEixo[t]) * (notasPorTipo[t][campo] as number), 0) / totalPeso;
    const usados = elegiveis.reduce<Record<string, number>>(
      (acc, t) => ({ ...acc, [t]: Math.round((Number(pesosDoEixo[t]) / totalPeso) * 1000) / 1000 }),
      {}
    );
    return { valor, pesos: usados, motivo: 'ok' as MotivoPeso };
  };

  const tiposIgnorados = tipos.filter((t) => !(Number(regraDesempenho?.[t]) > 0));

  const desemp = ponderar('desempenho', regraDesempenho, null);
  const pot = ponderar('potencial', pesosPotencial, tiposSomenteDeNormalizado(potencialSomenteDe));

  if (desemp.valor === null && pot.valor === null) {
    const motivo: MotivoPeso =
      desemp.motivo === 'sem_pesos_aprovados' && pot.motivo === 'sem_pesos_aprovados'
        ? 'sem_pesos_aprovados'
        : 'sem_tipos_com_peso';
    return { ...vazio(motivo), tiposIgnorados, motivoDesempenho: desemp.motivo, motivoPotencial: pot.motivo };
  }

  return {
    desempenho: desemp.valor,
    potencial: pot.valor,
    pesosUsados: desemp.pesos,
    pesosUsadosPotencial: pot.pesos,
    tiposConsiderados: Object.keys(desemp.pesos).length > 0 ? Object.keys(desemp.pesos) : Object.keys(pot.pesos),
    tiposIgnorados,
    motivoDesempenho: desemp.motivo,
    motivoPotencial: pot.motivo,
    motivo: 'ok',
  };
}

function tiposSomenteDeNormalizado(v: readonly string[] | null): readonly string[] | null {
  if (!v || v.length === 0) return null;
  return v.map((t) => t.trim().toLowerCase());
}

/* ─── Classificação (limites vigentes, PRESERVADOS) ───────────────────────── */

/** Faixa de classificação (1 = baixa, 2 = média, 3 = alta). */
export type FaixaScore = 1 | 2 | 3;

/** Chave do quadrante: `desempenho-potencial` (ex.: '3-3' = Estrela). */
export type QuadranteKey = '1-1' | '1-2' | '1-3' | '2-1' | '2-2' | '2-3' | '3-1' | '3-2' | '3-3';

/**
 * Limites vigentes do projeto (≤1,5 baixo · ≤3,5 médio · acima alto).
 * NÃO foram alterados — qualquer mudança aqui exige autorização explícita.
 */
export const LIMIARES_CLASSIFICACAO = { baixo: 1.5, medio: 3.5 } as const;

/** Classifica uma nota JÁ na escala. */
export function classifyScore(score: number): FaixaScore {
  if (score <= LIMIARES_CLASSIFICACAO.baixo) return 1;
  if (score <= LIMIARES_CLASSIFICACAO.medio) return 2;
  return 3;
}

/* ─── Consolidação por colaborador ────────────────────────────────────────── */

export interface ConsolidacaoColaborador {
  empresaId: string | null;
  cicloId: string | null;
  colaboradorId: string;
  /** Notas consolidadas. `null` = não deu para consolidar (dado insuficiente). */
  desempenhoConsolidado: number | null;
  potencialConsolidado: number | null;
  /** Registros no grupo (inclui duplicatas e incompletos). */
  quantidadeAvaliacoes: number;
  /** Registros com as duas notas na escala (base real da consolidação). */
  quantidadeAvaliacoesValidas: number;
  /** Registros SINALIZADOS por semelhança (preservados, para revisão humana). */
  quantidadeSinalizados: number;
  /** Ids dos registros sinalizados — rastreabilidade da revisão. */
  registrosSinalizados: string[];
  /** ETAPA 4 — id do registro que representa o colaborador (`null` em médias). */
  selecionadoId: string | null;
  /** Registros em que `performance` e `nota_geral` divergem (coluna legada). */
  quantidadeDivergenciasNota: number;
  notasForaDaEscala: number;
  /** Rastreabilidade: quais avaliações sustentam esta classificação. */
  feedbackIdsUtilizados: string[];
  /** Insumo pronto para a ponderação futura (média por tipo de avaliador). */
  notasPorTipo: Record<string, { desempenho: number | null; potencial: number | null; avaliacoes: number }>;
  estrategia: EstrategiaConsolidacao;
  classificacao: QuadranteKey | null;
  status: StatusConsolidacao;
  /** Qual nota faltou quando o colaborador não pôde ser classificado. */
  faltando: 'desempenho' | 'potencial' | 'ambos' | null;
  /** Nome que vem embutido na relação (`avaliado.nome_completo`), quando existe. */
  nomeRelacao: string | null;
  /** Data de criação da avaliação representante (ordenação por recência). */
  criadoEm: number;
  /** Tipos de avaliador que participaram (gestor, par, auto, subordinado...). */
  tiposAvaliadores: string[];
}

interface OpcoesConsolidacao {
  feedbacks: unknown[];
  /** Ciclo em foco. `null` = todos os ciclos carregados (uso interno/auditoria). */
  cicloId?: string | null;
  empresaId?: string | null;
  estrategia?: EstrategiaConsolidacao;
}

/**
 * Média aritmética em PRECISÃO CHEIA (sem arredondar).
 *
 * O arredondamento foi descartado de propósito: a classificação usa os mesmos
 * números, e arredondar poderia empurrar um caso de fronteira para a faixa
 * errada (ex.: média 1,54 → 1,5 cairia em "baixo" quando o valor real é
 * "médio"). Quem formata para o usuário é a camada de apresentação.
 */
function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const soma = valores.reduce((a, b) => a + b, 0);
  return soma / valores.length;
}

/* ─── Avaliação normalizada (1 linha de `feedbacks_360`) ──────────────────── */

export interface AvaliacaoNormalizada {
  id: string;
  empresaId: string | null;
  cicloId: string | null;
  colaboradorId: string | null;
  avaliadorId: string | null;
  /** Nome embutido na relação `avaliado:colaboradores(nome_completo)`. */
  nomeRelacao: string | null;
  tipo: string;
  status: string;
  /** Notas JÁ validadas pela escala (`null` = ausente ou fora da faixa). */
  nota: number | null;
  potencial: number | null;
  /** Valores crus, preservados para o relatório de qualidade do dado. */
  notaBruta: number | null;
  potencialBruta: number | null;
  foraDaEscala: boolean;
  criadoEm: number;
  atualizadoEm: number;
  /** `true` quando as duas notas estão na escala E o status permite consolidar. */
  valida: boolean;
  /** ETAPA 3 — elegibilidade. Igual a `valida` (mantido por compatibilidade). */
  elegivel: boolean;
  /**
   * ETAPA 1 — sinalizado por SEMELHANÇA com outro registro (mesma chave).
   * Não é descartado e NÃO afeta elegibilidade: entra na consolidação normalmente.
   */
  possivelDuplicata: boolean;
  /** ETAPA 2 — motivo da sinalização (`null` quando não sinalizado). */
  motivoSinalizacao: 'mesma_chave_avaliacao' | null;
  /** `performance` e `nota_geral` vieram os dois, com valores diferentes. */
  divergenciaNotas: boolean;
  /** Chave canônica usada na identificação de suspeita. */
  chaveSuspeita: string;
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Chave canônica de uma avaliação — dois registros com a mesma chave são o MESMO ato avaliativo. */
function chaveAvaliacao(a: {
  cicloId: string | null;
  colaboradorId: string | null;
  avaliadorId: string | null;
  tipo: string;
  notaBruta: number | null;
  potencialBruta: number | null;
}): string {
  return [
    a.cicloId ?? '',
    a.colaboradorId ?? '',
    a.avaliadorId ?? '',
    a.tipo,
    a.notaBruta ?? '',
    a.potencialBruta ?? '',
  ].join('|');
}

/**
 * Normaliza a lista crua de `feedbacks_360` e SINALIZA semelhanças.
 *
 * Duplicidade NÃO é decidida aqui: semelhança (mesma chave ciclo+colaborador+
 * avaliador+tipo+notas) apenas marca `possivelDuplicata`. Nenhum registro é
 * excluído — dois feedbacks de avaliadores diferentes, de tipos diferentes, sem
 * `avaliador_id` ou com as mesmas notas continuam na consolidação, rastreáveis.
 * A exclusão real só acontece na GRAVAÇÃO, por idempotência (backend).
 */
export function normalizarAvaliacoes(feedbacks: unknown[], empresaId?: string | null): AvaliacaoNormalizada[] {
  const normalizadas = feedbacks.map((f) => {
    const r = (f ?? {}) as Record<string, unknown>;
    const colaboradorId = String(r.avaliado_id ?? r.colaborador_id ?? '').trim() || null;
    const avaliadorId = String(r.avaliador_id ?? '').trim() || null;
    const cicloId = String(r.ciclo_id ?? '').trim() || null;
    const status = String(r.status ?? '')
      .trim()
      .toLowerCase();
    const desempenhoEmLegado = numero(r.performance);
    const desempenhoEmNotaGeral = numero(r.nota_geral);
    const notaBruta = desempenhoEmLegado ?? desempenhoEmNotaGeral;
    const potencialBruta = numero(r.potencial);
    const nota = notaNaEscala(notaBruta);
    const potencial = notaNaEscala(potencialBruta);
    const id = String(r.id ?? '');
    const tipo =
      String(r.tipo ?? '')
        .trim()
        .toLowerCase() || 'nao_informado';
    const criadoEm = new Date(String(r.created_at ?? 0)).getTime() || 0;

    const base = { cicloId, colaboradorId, avaliadorId, tipo, notaBruta, potencialBruta };
    const chave = chaveAvaliacao(base);
    const elegivel = avaliacaoElegivel({ colaboradorId, nota, potencial, status });

    return {
      id,
      empresaId: String(r.empresa_id ?? empresaId ?? '').trim() || null,
      cicloId,
      colaboradorId,
      avaliadorId,
      nomeRelacao: String((r.avaliado as Record<string, unknown>)?.nome_completo ?? '').trim() || null,
      tipo,
      status,
      nota,
      potencial,
      notaBruta,
      potencialBruta,
      foraDaEscala: foraDaEscala(notaBruta) || foraDaEscala(potencialBruta),
      criadoEm,
      atualizadoEm: new Date(String(r.updated_at ?? r.created_at ?? 0)).getTime() || 0,
      valida: elegivel,
      elegivel,
      // A suspeita é preenchida na etapa 1 do pipeline (`marcarSuspeitas`).
      possivelDuplicata: false,
      motivoSinalizacao: null,
      divergenciaNotas:
        desempenhoEmLegado !== null && desempenhoEmNotaGeral !== null && desempenhoEmLegado !== desempenhoEmNotaGeral,
      chaveSuspeita: chave,
    };
  });

  // ETAPA 1 — identificação de suspeita, isolada das demais decisões.
  return marcarSuspeitas(normalizadas);
}

/**
 * ETAPA 1 — IDENTIFICAÇÃO DE SUSPEITA (pura, sem efeito em elegibilidade).
 *
 * Marca `possivelDuplicata` quando a chave canônica da avaliação já apareceu
 * antes (mesmo ciclo + colaborador + avaliador + tipo + notas). A PRIMEIRA
 * ocorrência nunca é sinalizada, então cada chave tem sempre um registro
 * "original" livre de suspeita.
 */
export function marcarSuspeitas(avaliacoes: AvaliacaoNormalizada[]): AvaliacaoNormalizada[] {
  const vistas = new Set<string>();
  return avaliacoes.map((a) => {
    const sinalizado = vistas.has(a.chaveSuspeita);
    vistas.add(a.chaveSuspeita);
    return {
      ...a,
      possivelDuplicata: sinalizado,
      motivoSinalizacao: sinalizado ? ('mesma_chave_avaliacao' as const) : null,
    };
  });
}

/* ─── CONSOLIDAÇÃO: 1 colaborador + 1 ciclo = 1 classificação ─────────────── */

/**
 * Consolida os feedbacks em UMA linha por (empresa + ciclo + colaborador).
 *
 * Só entram avaliações ELEGÍVEIS (etapa 3: duas notas na escala 1–5, identidade
 * e status autorizado). Semelhança (etapa 1) NÃO torna ninguém inelegível: o
 * registro sinalizado participa normalmente e o representante é escolhido pela
 * etapa 4. Sem desempenho OU potencial válidos, o colaborador sai com
 * `classificacao: null` — nunca distribuído arbitrariamente entre os quadrantes.
 */
export function consolidarNineBox({
  feedbacks,
  cicloId = null,
  empresaId = null,
  estrategia = ESTRATEGIA_ATIVA,
}: OpcoesConsolidacao): ConsolidacaoColaborador[] {
  const doCiclo = normalizarAvaliacoes(feedbacks, empresaId).filter((a) => {
    // Ciclo: `null` = todos os ciclos carregados (auditoria); senão, só o pedido.
    if (cicloId !== null && a.cicloId !== String(cicloId)) return false;
    // Isolamento por empresa quando o chamador informa uma: registros legados
    // sem `empresa_id` herdam o valor informado (ver `normalizarAvaliacoes`).
    if (empresaId !== null && a.empresaId !== null && a.empresaId !== empresaId) return false;
    return true;
  });

  // Agrupamento pela chave canônica — é isto que impede contagem dupla.
  const grupos = new Map<string, AvaliacaoNormalizada[]>();
  doCiclo
    .filter((a) => a.colaboradorId !== null)
    .forEach((a) => {
      const chave = `${a.empresaId ?? ''}|${a.cicloId ?? ''}|${a.colaboradorId}`;
      grupos.set(chave, [...(grupos.get(chave) ?? []), a]);
    });

  return Array.from(grupos.values()).map((grupo) => {
    const amostra = grupo[0];
    // ETAPA 3 — elegibilidade (independe de suspeita).
    const validas = grupo.filter((a) => a.elegivel);
    const sinalizados = grupo.filter((a) => a.possivelDuplicata);
    const divergencias = grupo.filter((a) => a.divergenciaNotas).length;
    const foraEscala = grupo.filter((a) => a.foraDaEscala).length;

    // ETAPA 4 — seleção do representante entre os elegíveis.
    const representante = selecionarRepresentante(validas, estrategia);
    const temElegivel = validas.length > 0;

    // Insumo da ponderação: média por tipo de avaliador (calculado ANTES de
    // decidir as notas, porque `media_por_tipo` consome exatamente isto).
    const notasPorTipo: ConsolidacaoColaborador['notasPorTipo'] = {};
    Array.from(new Set(validas.map((a) => a.tipo)))
      .sort()
      .forEach((tipo) => {
        const doTipo = validas.filter((a) => a.tipo === tipo);
        notasPorTipo[tipo] = {
          desempenho: media(doTipo.map((a) => a.nota as number)),
          potencial: media(doTipo.map((a) => a.potencial as number)),
          avaliacoes: doTipo.length,
        };
      });

    const usaMedia = estrategia === 'media_simples';
    const porTipo = estrategia === 'media_por_tipo' ? combinarNotasPorTipo(notasPorTipo) : null;

    const desempenhoConsolidado = !temElegivel
      ? null
      : usaMedia
        ? media(validas.map((a) => a.nota as number))
        : porTipo
          ? porTipo.desempenho
          : (representante?.nota ?? null);
    const potencialConsolidado = !temElegivel
      ? null
      : usaMedia
        ? media(validas.map((a) => a.potencial as number))
        : porTipo
          ? porTipo.potencial
          : (representante?.potencial ?? null);

    const feedbackIdsUtilizados = !temElegivel
      ? []
      : usaMedia || porTipo
        ? validas.map((a) => a.id)
        : [representante?.id ?? ''].filter(Boolean);

    const classificacao =
      desempenhoConsolidado !== null && potencialConsolidado !== null
        ? (`${classifyScore(desempenhoConsolidado)}-${classifyScore(potencialConsolidado)}` as QuadranteKey)
        : null;

    // Qual nota faltou (só importa quando não houve classificação).
    const semNota = grupo.every((a) => a.nota === null);
    const semPotencial = grupo.every((a) => a.potencial === null);
    const faltando: ConsolidacaoColaborador['faltando'] =
      classificacao !== null
        ? null
        : semNota && semPotencial
          ? 'ambos'
          : semPotencial
            ? 'potencial'
            : semNota
              ? 'desempenho'
              : null;

    return {
      empresaId: amostra.empresaId,
      cicloId: amostra.cicloId,
      colaboradorId: amostra.colaboradorId as string,
      desempenhoConsolidado,
      potencialConsolidado,
      quantidadeAvaliacoes: grupo.length,
      quantidadeAvaliacoesValidas: validas.length,
      quantidadeSinalizados: sinalizados.length,
      registrosSinalizados: sinalizados.map((a) => a.id).sort(),
      /** ETAPA 4 — id do registro escolhido (ou `null` nas estratégias de média). */
      selecionadoId: representante?.id ?? null,
      quantidadeDivergenciasNota: divergencias,
      notasForaDaEscala: foraEscala,
      feedbackIdsUtilizados,
      notasPorTipo,
      estrategia,
      classificacao,
      status: classificacao ? 'consolidado' : validas.length === 0 ? 'sem_base' : 'incompleto',
      faltando,
      nomeRelacao: amostra.nomeRelacao,
      criadoEm: representante?.criadoEm ?? 0,
      tiposAvaliadores: Array.from(new Set(validas.map((a) => a.tipo))).sort(),
    } satisfies ConsolidacaoColaborador;
  });
}

/* ─── Invariantes (usado pelos testes e por auditorias) ───────────────────── */

export interface RelatorioInvariantes {
  /** Chaves (empresa|ciclo|colaborador) que apareceram mais de uma vez. */
  chavesDuplicadas: string[];
  /** Colaboradores classificados (com quadrante). */
  classificados: number;
  /** Colaboradores fora da matriz (avaliação incompleta). */
  naoClassificados: number;
  /** Colaboradores sem avaliação válida no ciclo. */
  semBase: number;
  /** Soma das contagens dos nove quadrantes. */
  somaQuadrantes: number;
  /** `true` quando não há chave duplicada e a soma fecha com os classificados. */
  consistente: boolean;
}

/**
 * Confere as duas garantias estruturais do Nine-Box:
 *   1. nenhuma chave (empresa+ciclo+colaborador) repetida;
 *   2. soma dos nove quadrantes = colaboradores únicos classificados.
 */
export function validarInvariantes(consolidacoes: ConsolidacaoColaborador[]): RelatorioInvariantes {
  const vistos = new Set<string>();
  const chavesDuplicadas: string[] = [];
  consolidacoes.forEach((c) => {
    const chave = `${c.empresaId ?? ''}|${c.cicloId ?? ''}|${c.colaboradorId}`;
    if (vistos.has(chave)) chavesDuplicadas.push(chave);
    vistos.add(chave);
  });

  const classificados = consolidacoes.filter((c) => c.classificacao !== null);
  const naoClassificados = consolidacoes.filter((c) => c.status === 'incompleto').length;
  const semBase = consolidacoes.filter((c) => c.status === 'sem_base').length;

  // A contagem por quadrante só pode considerar os classificados.
  const somaQuadrantes = classificados.length;

  return {
    chavesDuplicadas,
    classificados: classificados.length,
    naoClassificados,
    semBase,
    somaQuadrantes,
    consistente: chavesDuplicadas.length === 0 && somaQuadrantes === classificados.length,
  };
}

/* ─── MOVIMENTAÇÃO POR EIXO (proposta; NÃO ligada aos KPIs) ──────────────── */

/**
 * Sentido em um eixo (desempenho ou potencial), comparando FAIXAS — não notas
 * cruas. Comparar faixa é o que corresponde à posição na matriz: 3,6 → 4,4 muda
 * de nota mas NÃO muda de quadrante.
 */
export type SentidoEixo = 'subiu' | 'desceu' | 'estavel';

/** Sentido combinado dos dois eixos. */
export type SentidoMovimento = 'evoluiu' | 'regrediu' | 'estavel' | 'mista';

export interface ItemMovimentoPorEixo {
  id: string;
  colaboradorId: string;
  nome: string;
  sentido: SentidoMovimento;
  /** Eixo vertical da matriz (desempenho). */
  desempenho: { de: FaixaScore; para: FaixaScore; sentido: SentidoEixo };
  /** Eixo horizontal da matriz (potencial). */
  potencial: { de: FaixaScore; para: FaixaScore; sentido: SentidoEixo };
  /** Explicação curta do porquê (para tooltip/lista). */
  leitura: string;
}

export interface LeituraMovimentoPorEixo {
  comparaveis: number;
  evoluiram: number;
  permaneceram: number;
  regrediram: number;
  /** Um eixo subiu e o outro desceu — não é evolução nem regressão. */
  mistas: number;
  itens: ItemMovimentoPorEixo[];
}

/** Estado mínimo necessário para comparar (estruturalmente compatível com `PontoNineBox`). */
export interface PontoComparavel {
  id: string;
  colaboradorId: string | null;
  nome: string;
  desempenho: FaixaScore | null;
  potencialFaixa: FaixaScore | null;
}

const sentidoDoEixo = (de: FaixaScore, para: FaixaScore): SentidoEixo =>
  para > de ? 'subiu' : para < de ? 'desceu' : 'estavel';

/**
 * Lê a movimentação entre ciclos por EIXO, em vez de pela soma das notas.
 *
 * Por que a soma era frágil: ela somava desempenho + potencial e classificava o
 * resultado como "evoluiu/permaneceu/regrediu". Isso esconde casos opostos —
 * subir 1 ponto de desempenho e cair 1 de potencial dava resultado ZERO e o
 * colaborador era lido como "permaneceu", quando na verdade houve troca de
 * eixo. Aqui cada eixo é comparado separadamente e o combinado vira:
 *   • ambos subiram (um deles ao menos)   → evoluiu;
 *   • ambos desceram (um deles ao menos)  → regrediu;
 *   • ambos iguais                        → estavel;
 *   • um subiu e o outro desceu           → **mista** (exige leitura humana).
 *
 * Só entram colaboradores com as DUAS faixas nos DOIS ciclos (mesma exigência de
 * comparabilidade da leitura atual). A regra oficial segue sendo a antiga até
 * esta ser aprovada.
 */
export function lerMovimentoPorEixo(atual: PontoComparavel[], anterior: PontoComparavel[]): LeituraMovimentoPorEixo {
  const antes = new Map(
    anterior
      .filter((p) => p.colaboradorId && p.desempenho !== null && p.potencialFaixa !== null)
      .map((p) => [p.colaboradorId as string, p] as const)
  );

  const itens = atual
    .filter((p) => p.colaboradorId && p.desempenho !== null && p.potencialFaixa !== null && antes.has(p.colaboradorId))
    .map((p) => {
      const antesDoItem = antes.get(p.colaboradorId as string) as PontoComparavel;
      const desempenhoDe = antesDoItem.desempenho as FaixaScore;
      const potencialDe = antesDoItem.potencialFaixa as FaixaScore;
      const desempenhoPara = p.desempenho as FaixaScore;
      const potencialPara = p.potencialFaixa as FaixaScore;
      const dDesempenho = sentidoDoEixo(desempenhoDe, desempenhoPara);
      const dPotencial = sentidoDoEixo(potencialDe, potencialPara);

      const subiu = dDesempenho === 'subiu' || dPotencial === 'subiu';
      const desceu = dDesempenho === 'desceu' || dPotencial === 'desceu';
      const sentido: SentidoMovimento = subiu && desceu ? 'mista' : subiu ? 'evoluiu' : desceu ? 'regrediu' : 'estavel';

      const leitura =
        sentido === 'mista'
          ? `Desempenho ${dDesempenho} e potencial ${dPotencial} — leitura exige análise`
          : sentido === 'estavel'
            ? 'Mesma faixa nos dois eixos'
            : `Desempenho ${dDesempenho}, potencial ${dPotencial}`;

      return {
        id: p.id,
        colaboradorId: p.colaboradorId as string,
        nome: p.nome,
        sentido,
        desempenho: { de: desempenhoDe, para: desempenhoPara, sentido: dDesempenho },
        potencial: { de: potencialDe, para: potencialPara, sentido: dPotencial },
        leitura,
      };
    });

  return {
    comparaveis: itens.length,
    evoluiram: itens.filter((i) => i.sentido === 'evoluiu').length,
    permaneceram: itens.filter((i) => i.sentido === 'estavel').length,
    regrediram: itens.filter((i) => i.sentido === 'regrediu').length,
    mistas: itens.filter((i) => i.sentido === 'mista').length,
    itens,
  };
}

/* ─── PROPOSTAS (todas pendentes de aprovação; nada ligado por conta própria) ── */

/**
 * PROPOSTA de correção da MOVIMENTAÇÃO — decide-se entre:
 *
 *  1. `soma_das_notas` (REGRA OFICIAL HOJE, em `nineBoxCommon.lerMovimento`):
 *     soma desempenho+potencial e compara. Rápida, porém esconde trocas de eixo
 *     (subir 1 no desempenho e cair 1 no potencial dá "permaneceu").
 *  2. `por_eixo` (`lerMovimentoPorEixo`, PRONTA e testada aqui): compara cada
 *     eixo pela FAIXA e separa positivo / negativo / estável / MISTO.
 *
 * IMPACTO de trocar: `mistas` passa a existir (hoje esses casos entram como
 * "permaneceu" ou como "evoluiu/regrediu" indevidamente) e o total dos KPIs
 * (Evoluíram/Permaneceram/Regrediram) muda de valor. Por isso não foi ligado.
 */
export const PROPOSTA_MOVIMENTACAO = {
  regra_oficial_hoje: 'soma_das_notas',
  candidata: 'por_eixo',
  implementada: true,
  impactos: [
    'Novo grupo "mista" (um eixo subiu e o outro desceu) — exige rótulo próprio no KPI.',
    'Colaboradores hoje contados como "permaneceu" podem se tornar "mista"/"evoluiu"/"regrediu".',
    'As notas `de`/`para` passariam a ser FAIXAS (1..3) em vez de soma de pontos.',
  ],
  precisa_aprovacao: 'Definir se "mista" conta como evolução, regressão ou coluna própria no KPI.',
} as const;

/**
 * PROPOSTA de reconciliação das CONTAGENS — de onde cada número vem (é isto
 * que explica a diferença entre "15" e "25" vista em telas diferentes):
 *
 *  • `avaliados` (Nine-Box KPI "Colaboradores avaliados") = pessoas com
 *    classificação válida NO CICLO selecionado, agrupadas por
 *    empresa+ciclo+colaborador. Fonte: `feedbacks_360`;
 *  • `naoClassificados` = pessoas do ciclo sem as duas notas válidas (somadas
 *    à parte, nunca dentro dos nove quadrantes);
 *  • `catalogoDeColaboradores` = `colaboradorService.list()`, que devolve no
 *    máximo **25** registros (pageSize padrão!). Serve só para resolver
 *    nome/cargo/departamento/foto — NÃO é contagem de avaliados. Qualquer
 *    número derivado dele fica limitado a 25 e não representa avaliação.
 */
export const PROPOSTA_CONTAGENS = {
  avaliados: 'feedbacks_360 → distinct (empresa_id, ciclo_id, avaliado_id) do ciclo',
  naoClassificados: 'mesma base, menos quem não tem as duas notas válidas',
  catalogoDeColaboradores: 'colaboradorService.list() — capado em 25 por paginação; só enriquece nome/cargo/foto',
  regra: 'A soma dos nove quadrantes deve ser igual a `avaliados` (invariante coberto por teste).',
} as const;
