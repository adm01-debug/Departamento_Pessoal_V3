/**
 * ============================================================================
 * FEEDBACKS 360 — MODELO CANÔNICO DE APRESENTAÇÃO (fonte única).
 *
 * PROBLEMA QUE ESTE ARQUIVO RESOLVE: a aba "Feedbacks" montava o card, o modal e
 * a fila "Aguardando gestor" com leituras PARALELAS do mesmo registro — cada
 * superfície decidia sozinha o que exibir e quando exibir um botão. O resultado
 * eram ciclos com estruturas diferentes (campo sumindo quando vazio, controle
 * desaparecendo quando o papel/vínculo não permitia, gestor responsável
 * confundido com o avaliador).
 *
 * Aqui ficam DUAS coisas, e só elas, para TODAS as superfícies:
 *   1. `normalizarFeedback` → converte o registro (novo ou histórico) no modelo
 *      `FeedbackCanonico`, com TODOS os campos/regiões e o estado de cada campo
 *      (`informado` · `nao_informado` · `nao_aplicavel`). Nada é inventado:
 *      campo vazio continua vazio — a interface é que passa a mostrar um estado
 *      vazio padronizado em vez de sumir com a seção.
 *   2. `getFeedbackActions` → o conjunto ÚNICO de ações (quais existem, quais
 *      estão habilitadas, o motivo da indisponibilidade). A autorização REAL
 *      continua no servidor (RPC `pode_aprovar_colaborador`,
 *      `decidir_aprovacao_gestor`); aqui só se evita oferecer um controle que a
 *      regra recusaria — e, quando recusa, o controle permanece VISÍVEL e
 *      DESABILITADO com a explicação, como a padronização exige.
 *
 * ── O QUE NÃO FAZ ──────────────────────────────────────────────────────────
 *  • Não consulta, não grava, não muda status e não chama RPC;
 *  • Não troca o avaliador pelo gestor (são campos distintos: o avaliador vem
 *    do registro — `avaliador_id`/`avaliador` — e o gestor responsável vem do
 *    VÍNCULO do colaborador — `supervisor_id`, ver `derivarPendencias`);
 *  • Não promove demonstração a gravação: `origemDemonstrativa` continua
 *    separando `mock-*`/`demo-*` dos registros reais.
 * ============================================================================
 */

import { capacidadesAvaliacao, type PapeisAvaliacao } from './papeisAvaliacao';
import { acoesDisponiveis, perfisOperadorEfetivos, type AcaoDisponivel } from './acoesFeedback';
import {
  MOTIVO_FALTA_AVALIACAO_GESTOR,
  ROTULO_STATUS_APROVACAO,
  TOM_STATUS_APROVACAO,
  type EstadoAprovacao,
  type PendenciaAprovacao,
  type StatusAprovacaoLido,
} from './aprovacaoGestor';
import type { FeedbackDerivado } from './feedbacksComum';
import { idDemonstrativo } from './escritaOperacional';
import { normalizarStatus as normalizarStatusFeedback, type StatusLido } from './statusFeedback';

/* ─── Campo normalizado (ausente ≠ não aplicável ≠ não preenchido) ────────── */

/**
 * Estado de um campo do modelo:
 *  • `informado`     → existe valor utilizável;
 *  • `nao_informado` → o registro não traz o dado (vazio/nulo) — exibe "Não informado";
 *  • `nao_aplicavel` → o dado não se aplica àquele contexto — exibe "Não aplicável".
 *
 * A distinção é obrigatória: um registro histórico sem `pontos_fortes` NÃO é a
 * mesma coisa que uma avaliação em que o campo não existe por desenho.
 */
export type EstadoCampo = 'informado' | 'nao_informado' | 'nao_aplicavel';

export interface Campo<T> {
  estado: EstadoCampo;
  valor: T | null;
}

/** Texto padronizado de campo vazio (nunca inventa conteúdo). */
export const TEXTO_NAO_INFORMADO = 'Não informado';

/** Texto padronizado de campo que não se aplica ao contexto. */
export const TEXTO_NAO_APLICAVEL = 'Não aplicável';

/** Normaliza um valor bruto em `Campo`: vazio/nulo/NaN → `nao_informado`. */
export function campo<T>(valor: T | null | undefined): Campo<T> {
  if (valor === null || valor === undefined) return { estado: 'nao_informado', valor: null };
  if (typeof valor === 'string') {
    const texto = valor.trim();
    return texto ? { estado: 'informado', valor: texto as unknown as T } : { estado: 'nao_informado', valor: null };
  }
  if (typeof valor === 'number' && !Number.isFinite(valor)) return { estado: 'nao_informado', valor: null };
  return { estado: 'informado', valor };
}

/** Campo que não se aplica ao contexto (ex.: Potencial de avaliação cancelada). */
export function campoNaoAplicavel<T>(): Campo<T> {
  return { estado: 'nao_aplicavel', valor: null };
}

/** Texto a exibir para um campo (com os estados vazios padronizados). */
export function textoDoCampo(valor: Campo<unknown>, vazio: string = TEXTO_NAO_INFORMADO): string {
  if (valor.estado === 'informado' && valor.valor !== null) return String(valor.valor);
  return valor.estado === 'nao_aplicavel' ? TEXTO_NAO_APLICAVEL : vazio;
}

/* ─── Status do registro (nomenclaturas históricas normalizadas) ──────────── */

export type StatusCanonicoChave = 'pendente' | 'em_revisao' | 'concluido' | 'cancelado' | 'desconhecido';

export interface StatusCanonico {
  chave: StatusCanonicoChave;
  rotulo: string;
  tom: string;
}

/** Tons semânticos já usados pelo módulo (nenhuma cor nova). */
const TOM_STATUS: Record<StatusCanonicoChave, string> = {
  pendente: 'border-warning/45 bg-warning/20 text-warning',
  em_revisao: 'border-info/45 bg-info/20 text-info',
  concluido: 'border-success/45 bg-success/20 text-success',
  cancelado: 'border-destructive-vivid/45 bg-destructive-vivid/20 text-destructive-vivid',
  desconhecido: 'border-border/50 bg-muted/40 text-muted-foreground',
};

/** Rótulo curto de cada estado canônico (o texto histórico não é reescrito). */
const ROTULO_STATUS_CANONICO: Record<StatusCanonicoChave, string> = {
  pendente: 'Pendente',
  em_revisao: 'Em revisão',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  desconhecido: TEXTO_NAO_INFORMADO,
};

/**
 * Compara status sem depender de acento/caixa: os dados reais e os mocks usam
 * `concluido`/`concluída`/`Concluído`, e a coluna do banco é TEXT livre.
 */
function chaveDeStatus(valor: unknown): string {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

/**
 * Normaliza o `status` do registro (`feedbacks_360.status`, texto livre) para o
 * estado canônico. Reconhece as variações históricas conhecidas; qualquer outro
 * valor é preservado como ESTÁ (rótulo = valor original) com tom neutro — o
 * sistema não inventa "concluído" para um texto desconhecido.
 */
export function statusCanonico(status: unknown): StatusCanonico {
  const bruto = String(status ?? '').trim();
  const chave = chaveDeStatus(bruto);
  if (!chave)
    return { chave: 'desconhecido', rotulo: ROTULO_STATUS_CANONICO.desconhecido, tom: TOM_STATUS.desconhecido };

  if (['concluido', 'concluida', 'finalizado', 'finalizada', 'aprovado', 'aprovada', 'validado'].includes(chave)) {
    return { chave: 'concluido', rotulo: ROTULO_STATUS_CANONICO.concluido, tom: TOM_STATUS.concluido };
  }
  if (['cancelado', 'cancelada', 'cancel'].includes(chave)) {
    return { chave: 'cancelado', rotulo: ROTULO_STATUS_CANONICO.cancelado, tom: TOM_STATUS.cancelado };
  }
  if (['em_revisao', 'revisao', 'em_analise', 'analise', 'em_aprovacao'].includes(chave)) {
    return { chave: 'em_revisao', rotulo: ROTULO_STATUS_CANONICO.em_revisao, tom: TOM_STATUS.em_revisao };
  }
  if (['pendente', 'em_andamento', 'aberto', 'aberta', 'rascunho', 'em_preparacao'].includes(chave)) {
    return { chave: 'pendente', rotulo: ROTULO_STATUS_CANONICO.pendente, tom: TOM_STATUS.pendente };
  }

  const lido: StatusLido = normalizarStatusFeedback(bruto);
  if (lido !== 'desconhecido') {
    const mapa: Record<Exclude<StatusLido, 'desconhecido'>, StatusCanonicoChave> = {
      pendente: 'pendente',
      concluido: 'concluido',
      cancelado: 'cancelado',
    };
    const canonica = mapa[lido];
    return { chave: canonica, rotulo: ROTULO_STATUS_CANONICO[canonica], tom: TOM_STATUS[canonica] };
  }

  // Texto desconhecido: exibe o valor REAL, sem traduzir para um estado que o
  // registro não declara.
  return { chave: 'desconhecido', rotulo: bruto, tom: TOM_STATUS.desconhecido };
}

/* ─── Situação da aprovação (consolidação colaborador × ciclo) ────────────── */

export interface SituacaoAprovacaoCanonica {
  /** Existe linha de consolidação para (colaborador × ciclo)? */
  existe: boolean;
  status: StatusAprovacaoLido;
  rotulo: string;
  tom: string;
  /** Já existe solicitação aguardando decisão do gestor? */
  pendente: boolean;
  /** A avaliação do GESTOR (obrigatória) existe e está concluída? */
  avaliacaoGestorValida: boolean;
  /** O gestor responsável foi resolvido pelo vínculo (`supervisor_id`)? */
  gestorIdentificado: boolean;
  /**
   * Autorização confirmada pelo SERVIDOR (`pode_aprovar_colaborador`) — inclui
   * exceção temporária de homologação. Não substitui a avaliação obrigatória.
   */
  autorizadoServidor: boolean;
  /** Por que a decisão NÃO pode ser executada (texto pronto; `null` = pode). */
  motivoBloqueio: string | null;
  justificativa: string | null;
  enviadoEm: string | null;
}

export const APROVACAO_AUSENTE: SituacaoAprovacaoCanonica = {
  existe: false,
  status: 'desconhecido',
  rotulo: ROTULO_STATUS_APROVACAO.desconhecido,
  tom: TOM_STATUS_APROVACAO.desconhecido,
  pendente: false,
  avaliacaoGestorValida: false,
  gestorIdentificado: false,
  autorizadoServidor: false,
  motivoBloqueio: 'Sem consolidação para este colaborador e ciclo.',
  justificativa: null,
  enviadoEm: null,
};

/** Monta a situação canônica a partir da linha da fila (mesma instância). */
export function situacaoDaPendencia(p: PendenciaAprovacao | null | undefined): SituacaoAprovacaoCanonica {
  if (!p) return APROVACAO_AUSENTE;
  const status: StatusAprovacaoLido = p.status ?? 'desconhecido';
  return {
    existe: true,
    status,
    rotulo: ROTULO_STATUS_APROVACAO[status] ?? ROTULO_STATUS_APROVACAO.desconhecido,
    tom: TOM_STATUS_APROVACAO[status] ?? TOM_STATUS_APROVACAO.desconhecido,
    pendente: p.estado?.pendente === true,
    avaliacaoGestorValida: p.avaliacaoGestorValida === true,
    /* Identificação do gestor: o id do vínculo (modo real) OU o nome resolvido
       (vitrine, quando a derivação usa a avaliação do gestor). `Não
       identificado` = pendência de atribuição. */
    gestorIdentificado:
      Boolean(p.gestorResponsavelId) || (Boolean(p.gestorResponsavel) && p.gestorResponsavel !== 'Não identificado'),
    autorizadoServidor: p.estado?.autorizadoServidor === true || p.autorizadoServidor === true,
    /* O motivo vem da MESMA instância derivada. A ausência da avaliação do
       gestor OU do gestor responsável BLOQUEIA a aprovação (requisitos do
       servidor), não é apenas informativa. */
    motivoBloqueio: p.estado?.motivoBloqueio ?? p.motivoBloqueioAprovacao ?? null,
    justificativa: p.justificativa ?? null,
    enviadoEm: p.enviadoEm ?? null,
  };
}

/* ─── Ações: UMA regra para lista, fila e modal ───────────────────────────── */

export type AcaoFeedbackId =
  | 'ver'
  | 'editar'
  | 'verColaborador'
  | 'enviar'
  | 'concluir'
  | 'cancelar'
  | 'reabrir'
  | 'devolver'
  | 'aprovar'
  | 'validarPotencial';

export type VarianteAcao = 'outline' | 'sucesso' | 'destrutiva' | 'primaria';

export interface AcaoFeedback {
  id: AcaoFeedbackId;
  rotulo: string;
  variante: VarianteAcao;
  /** Pode ser executada AGORA? (a autorização real continua no servidor) */
  habilitado: boolean;
  /** Por que não pode (texto exibido no `title` do controle). */
  motivo: string | null;
  /** `true` = escrita (RPC/local); `false` = navegação/abertura. */
  escrita: boolean;
  exigeJustificativa?: boolean;
}

/** Motivos padronizados das ações (texto único, sem duplicação). */
export const MOTIVO = {
  somenteGestor: 'Somente o gestor responsável pela avaliação pode executar esta ação.',
  semVinculo: 'Sua conta não é o gestor responsável por este colaborador.',
  semConsolidacao: 'Sem consolidação para este colaborador e ciclo.',
  semAvaliacaoGestor: MOTIVO_FALTA_AVALIACAO_GESTOR,
  semGestor: 'Gestor responsável não identificado (colaborador sem supervisor_id).',
  semGestorFallback: 'Sem vínculo de gestor para este colaborador — a aprovação está disponível ao RH/admin.',
  naoAguardando: 'A avaliação não está aguardando decisão do gestor.',
  somenteRh: 'Somente o RH pode validar o Potencial.',
  somenteRhAdmin: 'Somente RH/admin podem encaminhar ao gestor.',
  foraDaEtapa: 'A ação não pertence à etapa atual do fluxo.',
  semEscrita: 'Os controles de escrita não estão liberados neste ambiente.',
  demonstrativa: 'Operação demonstrativa: a decisão é salva LOCALMENTE e não é enviada ao banco.',
} as const;

interface OpcoesAcoes {
  papeis?: PapeisAvaliacao;
  /** Vínculo PROVADO (`pode_aprovar_colaborador` no front). Padrão: fail-closed. */
  responsavel?: boolean;
  /**
   * Autorização de CONCLUSÃO do registro (avaliador designado, gestor
   * responsável, exceção ou RH/admin). Separada da aprovação consolidada.
   */
  autorizadoConcluir?: boolean;
  /** Escrita liberada (modo real ou demonstração com persistência local). */
  acoesHabilitadas?: boolean;
  /** Ação de navegação disponível? (filtro por colaborador na listagem) */
  podeVerColaborador?: boolean;
}

/**
 * Determinador das ações do registro. Devolve SEMPRE o conjunto completo — a
 * superfície escolhe quais renderizar (card/fila/modal), mas o ESTADO de cada
 * botão vem daqui e de nenhum outro lugar.
 */
export function getFeedbackActions(registro: FeedbackCanonico, opcoes: OpcoesAcoes = {}): AcaoFeedback[] {
  const { papeis = null, acoesHabilitadas = false, podeVerColaborador = false } = opcoes;
  const responsavel = opcoes.responsavel === true;
  const autorizadoConcluir = opcoes.autorizadoConcluir ?? responsavel;
  const caps = capacidadesAvaliacao(papeis);
  const aprov = registro.aprovacao;
  const escrita = registro.origemDemonstrativa || acoesHabilitadas;

  /**
   * DECISÃO (Devolver/Aprovar) — visível SEMPRE que existe consolidação, para
   * que o conjunto de controles não mude entre ciclos/status.
   *
   * HABILITAÇÃO (regra ÚNICA, a MESMA do servidor — `pode_aprovar_colaborador`
   * + `decidir_aprovacao_gestor`):
   *   • PAPEL: `gestor`. RH/admin NÃO aprovam nem devolvem (sem substituto);
   *   • ESCOPO: ser o gestor vinculado (`responsavel`). Na vitrine, quando o
   *     vínculo não é carregado, o PAPEL `gestor` decide;
   *   • GESTOR: precisa existir gestor responsável resolvido (senão é pendência
   *     de ATRIBUIÇÃO e a aprovação fica bloqueada);
   *   • REQUISITO: a avaliação do GESTOR precisa existir e estar CONCLUÍDA;
   *   • ETAPA: a consolidação precisa estar pendente (`aguardando_gestor` ou
   *     `sem_gestor`) e a escrita liberada.
   *
   * NÃO entram aqui o status do REGISTRO (`concluido`/`pendente`) nem o TIPO da
   * avaliação: conclusão ≠ aprovação e a aprovação é do CONJUNTO.
   */
  const decidePorPapel = caps.podeDecidirAprovacao;
  const motivosDecisao: string[] = [];
  if (!aprov.existe) motivosDecisao.push(MOTIVO.semConsolidacao);
  if (!aprov.gestorIdentificado && !aprov.autorizadoServidor) motivosDecisao.push(MOTIVO.semGestor);
  if (!decidePorPapel && !aprov.autorizadoServidor) {
    motivosDecisao.push(MOTIVO.somenteGestor);
  } else if (!aprov.autorizadoServidor && aprov.gestorIdentificado) {
    // Gestor: só o próprio time. Na vitrine o vínculo pode não estar carregado
    // (`responsavelDemonstrativo === null`) — aí o papel já foi exigido acima.
    if (registro.origemDemonstrativa) {
      if (registro.responsavelDemonstrativo === false) motivosDecisao.push(MOTIVO.semVinculo);
    } else if (!responsavel) {
      motivosDecisao.push(MOTIVO.semVinculo);
    }
  }
  if (!aprov.avaliacaoGestorValida) {
    motivosDecisao.push(MOTIVO.semAvaliacaoGestor);
  }
  if (aprov.existe && !aprov.pendente) {
    motivosDecisao.push(`${MOTIVO.naoAguardando} (${aprov.rotulo})`);
  }
  if (!escrita) motivosDecisao.push(MOTIVO.semEscrita);
  const decisaoHabilitada = motivosDecisao.length === 0;
  const motivoDecisao = motivosDecisao[0] ?? null;

  const acoes: AcaoFeedback[] = [
    {
      id: 'ver',
      rotulo: 'Ver avaliação',
      variante: 'outline',
      habilitado: true,
      motivo: null,
      escrita: false,
    },
    {
      /**
       * EDIÇÃO — a ação dos FILTROS NORMAIS (Todos/Gestor/Pares/Auto). Edita o
       * registro existente no mesmo formulário; é exclusiva de quem gerencia
       * avaliações (RH/admin). Concluída continua editável, porém a gravação
       * REABRE a avaliação e invalida as aprovações da versão anterior.
       */
      id: 'editar',
      rotulo: 'Editar feedback',
      variante: 'outline',
      habilitado: escrita && caps.podeGerirAvaliacoes,
      motivo: !caps.podeGerirAvaliacoes ? MOTIVO.somenteRhAdmin : escrita ? null : MOTIVO.semEscrita,
      escrita: true,
    },
  ];

  if (podeVerColaborador) {
    acoes.push({
      id: 'verColaborador',
      rotulo: 'Ver só deste colaborador',
      variante: 'outline',
      habilitado: true,
      motivo: null,
      escrita: false,
    });
  }

  /* ENCAMINHAMENTO (RH/admin) — visível apenas para quem pode encaminhar E na
     etapa em que a ação existe (`em_preparacao`/`devolvida`). Fora dela o
     encaminhamento é AUTOMÁTICO (trigger da migration) e o botão só ocuparia
     espaço desabilitado na linha de ações. */
  if (caps.podeGerirAvaliacoes && ['em_preparacao', 'devolvida'].includes(aprov.status)) {
    const reenviar = aprov.status === 'devolvida';
    const motivosEnvio: string[] = [];
    if (!aprov.existe) motivosEnvio.push(MOTIVO.semConsolidacao);
    if (!aprov.gestorIdentificado) motivosEnvio.push(MOTIVO.semGestor);
    if (!escrita) motivosEnvio.push(MOTIVO.semEscrita);
    acoes.push({
      id: 'enviar',
      rotulo: reenviar ? 'Reenviar ao gestor' : 'Enviar ao gestor',
      variante: 'outline',
      habilitado: motivosEnvio.length === 0,
      motivo: motivosEnvio[0] ?? null,
      escrita: true,
    });
  }

  /* STATUS do registro (Concluir/Cancelar/Reabrir) — mesma tabela de sempre. */
  const statusAcoes: AcaoDisponivel[] = acoesDisponiveis({
    statusAtual: registro.feedback?.status,
    papel: null,
    perfis: perfisOperadorEfetivos(papeis, responsavel),
    responsavel,
    autorizadoConcluir,
  });
  const rotuloStatus: Record<'concluir' | 'cancelar' | 'reabrir', string> = {
    concluir: 'Concluir avaliação',
    cancelar: 'Cancelar avaliação',
    reabrir: 'Reabrir avaliação',
  };
  (['concluir', 'cancelar', 'reabrir'] as const).forEach((id) => {
    const a = statusAcoes.find((x) => x.acao === id);
    if (!a) return;
    acoes.push({
      id,
      rotulo: rotuloStatus[id],
      variante: id === 'cancelar' ? 'destrutiva' : 'outline',
      habilitado: a.disponivel && escrita,
      motivo: a.disponivel ? (escrita ? null : MOTIVO.semEscrita) : a.motivoBloqueio,
      escrita: true,
      exigeJustificativa: a.exigeJustificativa,
    });
  });

  /* DECISÃO do gestor — sempre visíveis, com o motivo da indisponibilidade. */
  acoes.push({
    id: 'devolver',
    rotulo: 'Devolver para correção',
    variante: 'outline',
    habilitado: decisaoHabilitada,
    motivo: motivoDecisao,
    escrita: true,
    exigeJustificativa: true,
  });
  acoes.push({
    id: 'aprovar',
    rotulo: 'Aprovar avaliação',
    variante: 'sucesso',
    habilitado: decisaoHabilitada,
    motivo: motivoDecisao,
    escrita: true,
  });

  /* VALIDAÇÃO DO POTENCIAL (RH) — controle LEGADO. O fluxo atual termina na
     aprovação do gestor; o botão permanece no DOM (layout aprovado), porém
     desabilitado. Nenhuma nova validação é exigida para classificar. */
  if (caps.podeValidarPotencial && aprov.status === 'concluida_validada') {
    acoes.push({
      id: 'validarPotencial',
      rotulo: 'Validar Potencial',
      variante: 'outline',
      habilitado: false,
      motivo: 'Fluxo atual: a aprovação do gestor já classifica; a validação posterior do RH não é necessária.',
      escrita: true,
    });
  }

  return acoes;
}

/** Ação por id (atalho para as superfícies). */
export function acaoDe(acoes: AcaoFeedback[], id: AcaoFeedbackId): AcaoFeedback | null {
  return acoes.find((a) => a.id === id) ?? null;
}

/** Habilita uma ação específica (usado pelos testes e pelas superfícies). */
export function habilitadoPara(acoes: AcaoFeedback[], id: AcaoFeedbackId): boolean {
  return acaoDe(acoes, id)?.habilitado === true;
}

/* ─── Modelo canônico ─────────────────────────────────────────────────────── */

/**
 * Registro pronto para QUALQUER superfície da aba. Estende `FeedbackDerivado`
 * (nota, faixa, agrupamento por mês, busca) para que os cálculos já aprovados
 * continuem valendo sem conversão.
 *
 * REGIÕES (as mesmas no card, na fila e no modal):
 *   1. colaborador  → `avaliado`, `cargo`, `departamento`, `cicloNome`;
 *   2. responsáveis → `gestorResponsavel`, `avaliadorCampo`, `tipoCampo`, `dataCampo`;
 *   3. resultados   → `desempenho`, `potencial`, `faixa`, `status`, `aprovacao`;
 *   4. ações        → `acoes`.
 */
export interface FeedbackCanonico extends FeedbackDerivado {
  /** Nome do ciclo do registro (campo normalizado). */
  cicloNome: Campo<string>;
  /** Gestor RESPONSÁVEL (vínculo `supervisor_id`), nunca o avaliador. */
  gestorResponsavel: Campo<string>;
  /** Nome do avaliador como campo normalizado (pode faltar em histórico). */
  avaliadorCampo: Campo<string>;
  /** Data do registro como campo normalizado. */
  dataCampo: Campo<string>;
  /** Tipo como campo normalizado (a coluna é texto livre; a UI usa `tipo`). */
  tipoCampo: Campo<string>;
  /** Desempenho (nota do registro) — `nao_informado` quando não preenchido. */
  desempenho: Campo<number>;
  /** Potencial ATRIBUÍDO no registro — `nao_informado` quando ausente. */
  potencial: Campo<number>;
  /** Status canônico (nomenclaturas históricas normalizadas). */
  status: StatusCanonico;
  /** Situação da aprovação (consolidação colaborador × ciclo). */
  aprovacao: SituacaoAprovacaoCanonica;
  /** Conteúdo textual — TODAS as seções existem, mesmo vazias. */
  conteudo: {
    pontosFortes: Campo<string>;
    pontosMelhoria: Campo<string>;
    comentarios: Campo<string>;
  };
  /** Competência em foco no PDI (informação complementar). */
  pdi: Campo<string>;
  /** Registro fictício (`mock-*`/`demo-*`) — decisão local, nunca gravação real. */
  origemDemonstrativa: boolean;
  /**
   * Vínculo DEMONSTRATIVO desmentido (`false` esconde a decisão na vitrine);
   * `null` = não avaliável (sem vínculos carregados).
   */
  responsavelDemonstrativo: boolean | null;
  /** Ações canônicas deste registro. */
  acoes: AcaoFeedback[];
}

export interface OpcoesCanonicas {
  /** Nome do ciclo (a lista de ciclos já está carregada pela página). */
  cicloNome?: string | null;
  /** Linha da fila de aprovação do MESMO colaborador × ciclo (fonte do gestor). */
  pendencia?: PendenciaAprovacao | null;
  /** Nome do gestor resolvido por vínculo quando não há linha de fila. */
  gestorResponsavel?: string | null;
  papeis?: PapeisAvaliacao;
  /** Autorização efetiva para concluir (separada da aprovação). */
  autorizadoConcluir?: boolean;
  /** Escrita liberada (modo real ou vitrine com persistência local). */
  acoesHabilitadas?: boolean;
  /** Navegação "Ver só deste colaborador" disponível. */
  podeVerColaborador?: boolean;
}

/** Nome de gestor válido: descarta o marcador de "não atribuído". */
export function nomeDeGestor(valor: unknown): string | null {
  const texto = String(valor ?? '').trim();
  if (!texto || texto === 'Não identificado' || texto === '—') return null;
  return texto;
}

/**
 * Normaliza UM registro derivado no modelo canônico. Puro: mesma entrada →
 * mesma saída, sem consulta e sem mutação.
 */
export function normalizarFeedback(item: FeedbackDerivado, opcoes: OpcoesCanonicas = {}): FeedbackCanonico {
  const f = (item.feedback ?? {}) as Record<string, unknown>;
  const pendencia = opcoes.pendencia ?? null;
  const aprovacao = situacaoDaPendencia(pendencia);

  const gestorDaPendencia = nomeDeGestor(pendencia?.gestorResponsavel);
  const gestorDoVinculo = nomeDeGestor(opcoes.gestorResponsavel);

  const nota = Number(f?.nota_geral ?? 0);
  const potencialBruto = Number(f?.potencial ?? 0);

  const base: Omit<FeedbackCanonico, 'acoes'> = {
    ...item,
    cicloNome: campo(opcoes.cicloNome ?? ''),
    gestorResponsavel: campo(gestorDaPendencia ?? gestorDoVinculo),
    avaliadorCampo: campo(item.avaliador === '—' ? null : item.avaliador),
    dataCampo: campo(item.data === '—' ? null : item.data),
    tipoCampo: campo(item.tipoRotulo),
    desempenho: campo(Number.isFinite(nota) && nota > 0 ? nota : null),
    potencial: campo(Number.isFinite(potencialBruto) && potencialBruto > 0 ? potencialBruto : null),
    status: statusCanonico(f?.status),
    aprovacao,
    conteudo: {
      pontosFortes: campo(f?.pontos_fortes as string | null | undefined),
      pontosMelhoria: campo(f?.pontos_melhoria as string | null | undefined),
      comentarios: campo(f?.comentarios as string | null | undefined),
    },
    pdi: campo(item.competencia),
    /**
     * ORIGEM: o id do registro OU o id canônico da pendência (o mesmo que a fila
     * usa em `feedbackId`). Sem esse recuo, uma linha cujo `feedback` não traz o
     * identificador era tratada como REAL e a vitrine perdia a decisão local.
     */
    origemDemonstrativa: idDemonstrativo(f?.id ?? pendencia?.feedbackId ?? ''),
    responsavelDemonstrativo: pendencia?.responsavel ?? null,
  };

  const acoes = getFeedbackActions(base as FeedbackCanonico, {
    papeis: opcoes.papeis ?? null,
    responsavel: pendencia?.responsavel === true,
    autorizadoConcluir: opcoes.autorizadoConcluir,
    acoesHabilitadas: opcoes.acoesHabilitadas === true,
    podeVerColaborador: opcoes.podeVerColaborador === true,
  });

  return { ...base, acoes };
}

/** Texto de exibição de um campo numérico com uma casa (ou o estado vazio). */
export function textoNota(valor: Campo<number>, vazio: string = TEXTO_NAO_INFORMADO): string {
  if (valor.estado === 'informado' && valor.valor !== null) {
    return Number(valor.valor).toFixed(1).replace('.', ',');
  }
  return valor.estado === 'nao_aplicavel' ? TEXTO_NAO_APLICAVEL : vazio;
}

/**
 * Resumo da aprovação para o cabeçalho/filtros a partir do estado derivado pela
 * fila — mantém o modal e a listagem falando do MESMO estado.
 */
export function resumoAprovacao(estado: EstadoAprovacao | null | undefined): SituacaoAprovacaoCanonica | null {
  if (!estado) return null;
  return {
    existe: estado.iniciada === true,
    status: estado.status,
    rotulo: estado.rotulo,
    tom: estado.tom,
    pendente: estado.pendente === true,
    avaliacaoGestorValida: estado.avaliacaoGestorValida === true,
    gestorIdentificado: estado.gestorIdentificado === true,
    autorizadoServidor: estado.autorizadoServidor === true,
    motivoBloqueio: estado.motivoBloqueio ?? null,
    justificativa: estado.justificativa ?? null,
    enviadoEm: null,
  };
}
