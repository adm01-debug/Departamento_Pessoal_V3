/**
 * ============================================================================
 * APROVAÇÃO DO GESTOR — CAMADA PURA (derivação, regras e rótulos).
 *
 * Implementa, no front, o MESMO fluxo da migration
 * `20261017090000_ninebox_aprovacao_gestor.sql`:
 *
 *   RH prepara (1) → RH conclui os feedbacks (2) → RH envia ao gestor (3) →
 *   gestor aprova ou devolve com justificativa (4) → RH corrige e reenvia (5) →
 *   RH valida o Potencial (6) → o Nine-Box classifica automaticamente (7).
 *
 * ── O QUE ESTE ARQUIVO É (E NÃO É) ─────────────────────────────────────────
 *  • É a fonte ÚNICA da leitura de status no front: `situacaoAprovacao` espelha
 *    `public.situacao_aprovacao(colaborador, ciclo)` para que a tela e o banco
 *    NUNCA discordem;
 *  • NÃO autoriza nada: as funções `pode*` só evitam OFERECER um controle que o
 *    servidor vai recusar (a RPC revalida papel, vínculo gestor↔colaborador e
 *    empresa). `disponivel: true` não é permissão;
 *  • NÃO fala com o Supabase (sem React, sem I/O) — por isso é testável.
 *
 * ── TIPOS × STATUS (não se misturam) ───────────────────────────────────────
 * `gestor`/`par`/`auto`/`subordinado` são CATEGORIAS de avaliação 360°.
 * `aguardando_gestor`/`devolvida`/... são STATUS de APROVAÇÃO. Este módulo só
 * conhece os segundos; a categoria do feedback aparece somente na COLUNA de
 * origem, nunca como status.
 * ============================================================================
 */

import { notaNaEscala } from './nineBoxConsolidacao';
import { tipoFeedback } from './feedbacksComum';

/* ─── Status de aprovação (o CHECK da tabela é a autoridade) ──────────────── */

export const STATUS_APROVACAO = {
  EM_PREPARACAO: 'em_preparacao',
  AGUARDANDO_GESTOR: 'aguardando_gestor',
  DEVOLVIDA: 'devolvida',
  APROVADA_GESTOR: 'aprovada_gestor',
  AGUARDANDO_RH: 'aguardando_rh',
  CONCLUIDA_VALIDADA: 'concluida_validada',
} as const;

export type StatusAprovacao = (typeof STATUS_APROVACAO)[keyof typeof STATUS_APROVACAO];
export type StatusAprovacaoLido = StatusAprovacao | 'desconhecido';

/** Normaliza o status cru (texto livre no banco até o CHECK ser encontrado). */
export function normalizarStatusAprovacao(valor: unknown): StatusAprovacaoLido {
  const s = String(valor ?? '')
    .trim()
    .toLowerCase();
  return (Object.values(STATUS_APROVACAO) as string[]).includes(s) ? (s as StatusAprovacao) : 'desconhecido';
}

export const ROTULO_STATUS_APROVACAO: Record<StatusAprovacaoLido, string> = {
  em_preparacao: 'Em preparação',
  aguardando_gestor: 'Aguardando gestor',
  devolvida: 'Devolvida para correção',
  aprovada_gestor: 'Aprovada pelo gestor',
  aguardando_rh: 'Aguardando validação do RH',
  concluida_validada: 'Concluída e validada',
  desconhecido: 'Status desconhecido',
};

/**
 * Pele do badge de status — os MESMOS tokens semânticos já usados pelos badges
 * do módulo (`--warning`, `--info`, `--success`, `--destructive-vivid`).
 * Nenhuma cor nova entra no Design System.
 */
export const TOM_STATUS_APROVACAO: Record<StatusAprovacaoLido, string> = {
  em_preparacao: 'border-border/50 bg-muted/40 text-muted-foreground',
  aguardando_gestor: 'border-warning/45 bg-warning/20 text-warning',
  devolvida: 'border-destructive-vivid/45 bg-destructive-vivid/20 text-destructive-vivid',
  aprovada_gestor: 'border-info/45 bg-info/20 text-info',
  aguardando_rh: 'border-info/45 bg-info/20 text-info',
  concluida_validada: 'border-success/45 bg-success/20 text-success',
  desconhecido: 'border-border/50 bg-muted/40 text-muted-foreground',
};

/** Ordem de urgência da fila (o que exige ação aparece primeiro). */
export const ORDEM_FILA_APROVACAO: StatusAprovacaoLido[] = [
  'aguardando_gestor',
  'devolvida',
  'em_preparacao',
  'aguardando_rh',
  'aprovada_gestor',
  'concluida_validada',
  'desconhecido',
];

/* ─── Regra de situação (espelho exato de `public.situacao_aprovacao`) ────── */

export interface DecisaoAprovacaoLida {
  decisao?: unknown;
  versao_avaliacao?: unknown;
  decidido_em?: unknown;
  justificativa?: unknown;
}

/**
 * Estado do fluxo de aprovação, na MESMA ordem da função SQL (e devolvendo o
 * mesmo subconjunto de valores):
 *
 *   1. sem versão da avaliação do gestor  → `em_preparacao`;
 *   2. sem decisão registrada             → `aguardando_gestor`;
 *   3. decisão de OUTRA versão (registro mudou/reabriu) → `devolvida`;
 *   4. decisão = devolvido                → `devolvida`;
 *   5. validação do RH vigente            → `concluida_validada`;
 *   6. caso contrário                     → `aprovada_gestor`.
 *
 * `aguardando_rh` existe no CHECK da tabela mas NUNCA é derivado aqui — o SQL
 * também não o devolve; fica reservado para uso futuro.
 */
export function situacaoAprovacao({
  versaoGestor,
  decisao,
  validada,
}: {
  versaoGestor: string | null;
  decisao: DecisaoAprovacaoLida | null;
  validada: boolean;
}): StatusAprovacaoLido {
  if (!versaoGestor) return 'em_preparacao';
  if (!decisao) return 'aguardando_gestor';
  const versaoDecidida = String(decisao.versao_avaliacao ?? '').trim();
  if (versaoDecidida !== versaoGestor) return 'devolvida';
  if (String(decisao.decisao ?? '').trim().toLowerCase() !== 'aprovado') return 'devolvida';
  if (validada) return 'concluida_validada';
  return 'aprovada_gestor';
}

/* ─── Permissões (espelho do front; o servidor revalida) ─────────────────── */

/** Enviar/reenviar ao gestor: mesma dupla de `pode_gerir_avaliacoes()` (RH/admin). */
export function podeEnviarParaGestor(papel: unknown): boolean {
  const p = String(papel ?? '').trim().toLowerCase();
  return p === 'rh' || p === 'admin';
}

/** Decidir (aprovar/devolver): SOMENTE o gestor — o RH não substitui (RPC §5). */
export function podeDecidirAprovacao(papel: unknown): boolean {
  return String(papel ?? '').trim().toLowerCase() === 'gestor';
}

/** Mínimo de caracteres da devolução (igual ao `length(v_just) < 10` do SQL). */
export const MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO = 10;

export interface ValidacaoJustificativa {
  pode: boolean;
  /** Código estável para teste/diagnóstico. */
  motivo: 'ok' | 'vazia' | 'curta';
  /** Texto para o usuário. */
  descricao: string;
}

/** Justificativa é OBRIGATÓRIA na devolução (regra do fluxo aprovado). */
export function validarJustificativaDevolucao(texto: unknown): ValidacaoJustificativa {
  const t = String(texto ?? '').trim();
  if (!t) return { pode: false, motivo: 'vazia', descricao: 'Informe a justificativa da devolução.' };
  if (t.length < MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO) {
    return {
      pode: false,
      motivo: 'curta',
      descricao: `A justificativa precisa de pelo menos ${MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO} caracteres.`,
    };
  }
  return { pode: true, motivo: 'ok', descricao: '' };
}

/* ─── Utilitários de leitura (nunca inventam campo) ─────────────────────── */

const texto = (valor: unknown): string => String(valor ?? '').trim();

const instante = (valor: unknown): number => {
  const t = new Date(String(valor ?? '')).getTime();
  return Number.isFinite(t) ? t : 0;
};

export interface OpcoesPendencias {
  /** Feedbacks do ciclo (mocks e/ou reais — a MESMA derivação serve aos dois). */
  feedbacks: unknown[];
  colaboradores?: {
    id?: string | null;
    nome_completo?: string | null;
    cargo?: string | null;
    departamento?: string | null;
  }[];
  ciclos?: { id?: string | null; nome?: string | null }[];
  /** Versão canônica por feedback (`vw_feedbacks_360_versao`) — vazia na demonstração. */
  versoesPorFeedback?: Record<string, string>;
  /** Histórico append-only das decisões do gestor. */
  aprovacoes?: unknown[];
  /** Cabeçalho do fluxo (1 linha por colaborador+ciclo): traz `enviado_em`. */
  consolidacoes?: unknown[];
  /** Validações de Potencial do RH (a vigente casa com a versão da avaliação). */
  validacoes?: unknown[];
  /** Classificação do Nine-Box por colaborador (saída de `pontos360`). */
  classificacoes?: Record<string, ClassificacaoNineBox>;
  /**
   * `demonstracao` (PADRÃO): fora do modo real a view de versão não existe, então
   * a avaliação do gestor CONCLUÍDA é tratada como "avaliação pronta" (versão
   * sintetizada) e a data do próprio registro vale como data de envio. É a MESMA
   * regra sobre a lista já carregada — nenhuma fixture nova e nenhuma gravação.
   * `real`: só vale a versão canônica lida do banco.
   */
  modo?: 'real' | 'demonstracao';
}

/* ─── Pendência (uma linha da fila de aprovação) ─────────────────────────── */

export interface PendenciaAprovacao {
  /** Chave estável da linha (`ciclo:colaborador`). */
  id: string;
  colaboradorId: string;
  colaborador: string;
  cargo: string | null;
  departamento: string | null;
  cicloId: string | null;
  cicloNome: string;
  /** Gestor responsável (quem avalia e aprova) — nunca o avaliador Par/Auto. */
  gestorResponsavel: string;
  /** Feedback CANÔNICO da avaliação do gestor — âncora de toda a decisão. */
  feedbackId: string;
  /** Registro completo (o dialog "Ver avaliação" o consome sem nova consulta). */
  feedback: Record<string, unknown>;
  versaoAvaliacao: string | null;
  /** Desempenho CONSOLIDADO (motor 360°) ou a nota do gestor como fallback. */
  desempenho: number | null;
  /** Potencial ATRIBUÍDO pelo gestor (o motor só classifica após o RH validar). */
  potencial: number | null;
  /** Data do envio ao gestor (ISO) — `null` enquanto o RH não enviou. */
  enviadoEm: string | null;
  /** Última justificativa registrada (devolução). */
  justificativa: string | null;
  decididoEm: string | null;
  status: StatusAprovacaoLido;
  /** REGRA ÚNICA: o mesmo estado que a fila, o contador e o modal consomem. */
  estado: EstadoAprovacao;
  /** Classificação do Nine-Box — preenchida quando o fluxo chega em `concluida_validada`. */
  quadrante: string | null;
  /** Por que ainda NÃO classifica (texto do motor 360°). */
  motivoNaoClassificado: string | null;
}

/** Classificação oficial por colaborador (saída de `pontos360`). */
export interface ClassificacaoNineBox {
  desempenho?: number | null;
  potencial?: number | null;
  quadrante?: string | null;
  nomeQuadrante?: string | null;
  motivoNaoClassificado?: string | null;
}

/* ─── REGRA ÚNICA DE ESTADO DA APROVAÇÃO (§5 do pedido) ──────────────────── */

/**
 * Estado da APROVAÇÃO FORMAL do gestor para UMA avaliação (colaborador+ciclo).
 *
 * É a ÚNICA fonte da verdade compartilhada por:
 *   1. a fila/subaba "Aguardando gestor" (quem aparece e por quê);
 *   2. o contador dinâmico da subaba;
 *   3. as ações e o badge do modal "Ver feedback" (`FeedbackAcoesRodape`);
 *   4. a etapa do RH (quando o Potencial pode ser validado);
 *   5. a elegibilidade ao Nine-Box (só com a validação vigente).
 *
 * NÃO é `tipo = 'gestor'` nem `status = 'pendente'`: uma avaliação
 * `status = 'concluido'` continua AGUARDANDO APROVAÇÃO enquanto não existir
 * decisão para a VERSÃO canônica vigente (é o contrato do fluxo).
 */
export interface EstadoAprovacao {
  /** Já existe solicitação de aprovação aguardando decisão do gestor? */
  pendente: boolean;
  /** Situação derivada (mesma régua do banco). */
  status: StatusAprovacaoLido;
  /** Rótulo pronto para badge (fonte única). */
  rotulo: string;
  /** Pele do badge (tokens semânticos já existentes). */
  tom: string;
  /**
   * Já existe REGISTRO de aprovação para esta avaliação (pendente, aprovada ou
   * devolvida)? `false` = o fluxo de aprovação não foi iniciado.
   */
  iniciada: boolean;
  /** Última justificativa de devolução, quando houver. */
  justificativa: string | null;
  /** Quando a decisão vigente foi registrada (ISO) — `null` se não houver. */
  decididoEm: string | null;
  /**
   * O RH pode validar o Potencial AGORA? Só com a aprovação do gestor vigente
   * (mesma versão) e sem validação aplicável — o servidor recusa fora disso.
   */
  podeValidarPotencial: boolean;
  /** Só com a validação vigente o Nine-Box classifica (motor exige a versão). */
  elegivelNineBox: boolean;
  /**
   * O usuário autenticado pode EXECUTAR a decisão agora? Exige pendência + ser o
   * gestor responsável (vínculo provado no front; reconferido no servidor por
   * `pode_aprovar_colaborador`).
   */
  podeDecidir: boolean;
}

/**
 * Deriva o estado da aprovação a partir das MESMAS entradas do banco:
 * versão canônica da avaliação do gestor, decisão vigente e validação do RH.
 *
 * `responsavel` é o vínculo provado no front (`ehGestorResponsavel`) e serve
 * apenas para decidir se o CONTROLE pode ser oferecido — a autorização real é
 * do servidor.
 */
export function estadoAprovacao({
  versaoGestor,
  decisao,
  validada,
  responsavel = false,
}: {
  versaoGestor: string | null;
  decisao: DecisaoAprovacaoLida | null;
  validada: boolean;
  responsavel?: boolean;
}): EstadoAprovacao {
  const status = situacaoAprovacao({ versaoGestor, decisao, validada });
  const iniciada = status !== 'em_preparacao';
  const decididoEm = texto(decisao?.decidido_em) || null;

  return {
    status,
    rotulo: ROTULO_STATUS_APROVACAO[status],
    tom: TOM_STATUS_APROVACAO[status],
    pendente: status === 'aguardando_gestor',
    iniciada,
    justificativa: texto(decisao?.justificativa) || null,
    decididoEm,
    // O RH valida depois do "aprovado" vigente — e uma devolução devolve ao RH
    // corrigir/reenviar (não valida).
    podeValidarPotencial: status === 'aprovada_gestor',
    elegivelNineBox: status === 'concluida_validada',
    podeDecidir: status === 'aguardando_gestor' && responsavel === true,
  };
}


/**
 * Deriva a fila de aprovação: UMA linha por (colaborador × ciclo) que tenha a
 * avaliação do GESTOR — a avaliação consolidada que o fluxo aprova.
 *
 * Fontes (todas já carregadas pela página; nenhuma consulta nova):
 *   • feedbacks do ciclo    → versão, desempenho/potencial (fallback);
 *   • `versoesPorFeedback`  → versão canônica do banco (autoridade);
 *   • `aprovacoes`          → decisão vigente (mais recente por `decidido_em`);
 *   • `validacoes`          → validação do RH NA MESMA versão;
 *   • `consolidacoes`       → `enviado_em` do envio ao gestor;
 *   • `classificacoes`      → desempenho consolidado + quadrante do Nine-Box.
 */
export function derivarPendencias({
  feedbacks,
  colaboradores = [],
  ciclos = [],
  versoesPorFeedback = {},
  aprovacoes = [],
  consolidacoes = [],
  validacoes = [],
  classificacoes = {},
  modo = 'demonstracao',
}: OpcoesPendencias): PendenciaAprovacao[] {
  const pessoa = new Map<string, { nome: string; cargo: string | null; departamento: string | null }>();
  colaboradores.forEach((c) => {
    const id = texto(c?.id);
    if (!id) return;
    pessoa.set(id, {
      nome: texto(c?.nome_completo) || 'Sem nome',
      cargo: texto(c?.cargo) || null,
      departamento: texto(c?.departamento) || null,
    });
  });

  const nomeDoCiclo = new Map<string, string>();
  ciclos.forEach((c) => {
    const id = texto(c?.id);
    if (id) nomeDoCiclo.set(id, texto(c?.nome) || 'Ciclo');
  });

  // 1) A avaliação do GESTOR de cada (ciclo, colaborador) — a mais recente.
  const gestorPorChave = new Map<string, Record<string, unknown>>();
  feedbacks.forEach((bruto) => {
    const f = (bruto ?? {}) as Record<string, unknown>;
    if (tipoFeedback(f.tipo) !== 'gestor') return;
    const avaliado = texto(f.avaliado_id);
    if (!avaliado) return;
    const chave = `${texto(f.ciclo_id)}::${avaliado}`;
    const atual = gestorPorChave.get(chave);
    const quando = instante(f.updated_at) || instante(f.created_at);
    const quandoAtual = atual ? instante(atual.updated_at) || instante(atual.created_at) : -1;
    if (!atual || quando >= quandoAtual) gestorPorChave.set(chave, f);
  });

  // 2) Índices das tabelas do fluxo (decisão vigente / envio).
  const decisaoPorChave = new Map<string, DecisaoAprovacaoLida>();
  aprovacoes.forEach((bruto) => {
    const a = (bruto ?? {}) as Record<string, unknown>;
    if (!texto(a.colaborador_id)) return;
    const chave = `${texto(a.ciclo_id)}::${texto(a.colaborador_id)}`;
    const atual = decisaoPorChave.get(chave);
    if (!atual || instante(a.decidido_em) >= instante(atual.decidido_em)) decisaoPorChave.set(chave, a);
  });

  const enviadoPorChave = new Map<string, string>();
  consolidacoes.forEach((bruto) => {
    const c = (bruto ?? {}) as Record<string, unknown>;
    if (!texto(c.colaborador_id)) return;
    const enviado = texto(c.enviado_em);
    const chave = `${texto(c.ciclo_id)}::${texto(c.colaborador_id)}`;
    if (enviado && !enviadoPorChave.has(chave)) enviadoPorChave.set(chave, enviado);
  });

  const validacoesLidas = validacoes.map((bruto) => {
    const v = (bruto ?? {}) as Record<string, unknown>;
    return { chave: `${texto(v.ciclo_id)}::${texto(v.colaborador_id)}`, versao: texto(v.versao_avaliacao) };
  });

  const linhas: PendenciaAprovacao[] = [];
  gestorPorChave.forEach((f, chave) => {
    const [cicloId, colaboradorId] = chave.split('::');
    const feedbackId = texto(f.id);
    const concluido = texto(f.status).toLowerCase() === 'concluido';
    const versaoReal = texto(versoesPorFeedback[feedbackId]);
    // Demonstração: a view de versão não existe — a avaliação CONCLUÍDA do gestor
    // é o que o RH enviaria, então a versão é sintetizada para a MESMA regra valer.
    const versao = versaoReal || (modo === 'demonstracao' && concluido ? `demonstracao:${feedbackId}` : null);

    const decisao = decisaoPorChave.get(chave) ?? null;
    const validada = !!versao && validacoesLidas.some((v) => v.chave === chave && v.versao === versao);
    // REGRA ÚNICA: a linha da fila carrega o estado já derivado — o modal, o
    // contador e a etapa do RH consomem EXATAMENTE esta instância.
    const estado = estadoAprovacao({ versaoGestor: versao, decisao, validada });
    const status = estado.status;

    const quem = pessoa.get(colaboradorId);
    const avaliador = pessoa.get(texto(f.avaliador_id));
    const classificacao = classificacoes[colaboradorId];
    const enviado = enviadoPorChave.get(chave) ?? '';

    linhas.push({
      id: chave,
      colaboradorId,
      colaborador: quem?.nome ?? 'Sem nome',
      cargo: quem?.cargo ?? null,
      departamento: quem?.departamento ?? null,
      cicloId: cicloId || null,
      cicloNome: nomeDoCiclo.get(cicloId) ?? 'Ciclo',
      gestorResponsavel: avaliador?.nome ?? 'Não identificado',
      feedbackId,
      feedback: f,
      versaoAvaliacao: versao,
      desempenho: classificacao?.desempenho ?? notaNaEscala(f.nota_geral),
      potencial: classificacao?.potencial ?? notaNaEscala(f.potencial),
      enviadoEm: enviado || (modo === 'demonstracao' ? texto(f.updated_at) || texto(f.created_at) : null),
      justificativa: texto(decisao?.justificativa) || null,
      decididoEm: texto(decisao?.decidido_em) || null,
      status,
      estado,
      quadrante: status === 'concluida_validada' ? (classificacao?.nomeQuadrante ?? null) : null,
      motivoNaoClassificado: classificacao?.motivoNaoClassificado ?? null,
    });
  });

  return ordenarPendencias(linhas);
}

/* ─── Ordenação e contadores da subaba ───────────────────────────────────── */

/** Ordem da fila: status por urgência e, dentro do status, envio mais recente. */
export function ordenarPendencias(lista: PendenciaAprovacao[]): PendenciaAprovacao[] {
  const peso = (s: StatusAprovacaoLido) => {
    const i = ORDEM_FILA_APROVACAO.indexOf(s);
    return i === -1 ? ORDEM_FILA_APROVACAO.length : i;
  };
  return [...lista].sort((a, b) => {
    const d = peso(a.status) - peso(b.status);
    if (d !== 0) return d;
    const e = instante(b.enviadoEm) - instante(a.enviadoEm);
    if (e !== 0) return e;
    return a.colaborador.localeCompare(b.colaborador, 'pt-BR');
  });
}

/** Contador dinâmico da subaba: quantas avaliações aguardam o GESTOR agora. */
export function contarAguardandoGestor(lista: PendenciaAprovacao[]): number {
  return lista.filter((p) => p.status === 'aguardando_gestor').length;
}

/** Quantas linhas ainda exigem ação de alguém (nem concluída, nem desconhecida). */
export function contarEmAndamento(lista: PendenciaAprovacao[]): number {
  return lista.filter((p) => p.status !== 'concluida_validada' && p.status !== 'desconhecido').length;
}

/** Histograma por status — base de leituras rápidas sem consulta nova. */
export function resumoPorStatus(lista: PendenciaAprovacao[]): Record<StatusAprovacaoLido, number> {
  const base = ORDEM_FILA_APROVACAO.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<StatusAprovacaoLido, number>
  );
  lista.forEach((p) => {
    base[p.status] = (base[p.status] ?? 0) + 1;
  });
  return base;
}
