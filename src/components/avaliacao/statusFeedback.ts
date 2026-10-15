/**
 * ============================================================================
 * FEEDBACKS — MÁQUINA DE ESTADOS E VALIDAÇÕES PURAS (`statusFeedback`).
 *
 * Este arquivo NÃO grava nada: não importa `supabase`, não faz `INSERT`/`UPDATE`
 * e não é chamado por nenhum componente. É a camada de DECISÃO que o passo
 * autorizado (finalização de feedbacks) vai consumir quando o backend existir.
 *
 * ── CORREÇÕES OBRIGATÓRIAS DO PLANO, JÁ REFLETIDAS AQUI ────────────────────
 *  1. AUTORIZAÇÃO É DO BACKEND. `validarTransicao` devolve `exigeBackend: true`
 *     em TODA resposta: o resultado serve para a interface não oferecer uma ação
 *     que vai falhar, mas NÃO é autorização. Quem autoriza de fato é a rotina de
 *     servidor (RPC/edge function), com o papel lido do banco — o
 *     `usePermissions()` do frontend não é enforcement.
 *  2. ATOMICIDADE. Mudar o status e gravar a auditoria acontece na MESMA
 *     transação, do lado do servidor. Este módulo só descreve o "de → para";
 *     `montarOperacao()` empacota status + auditoria + chave de idempotência no
 *     MESMO payload, para o backend executar tudo ou nada.
 *  3. IDEMPOTÊNCIA POR OPERAÇÃO. `montarChaveIdempotencia` recebe um
 *     `idOperacao` gerado por operação — NÃO é hash do conteúdo da avaliação.
 *     Hash permanente de conteúdo impediria duas avaliações legítimas com as
 *     mesmas notas; a chave por operação protege apenas o reenvio do MESMO ato.
 *  4. POTENCIAL NÃO BLOQUEIA A CONCLUSÃO. `validarConclusao` exige apenas
 *     avaliado, avaliador, ciclo e nota de desempenho na escala. Potencial
 *     ausente vira AVISO, nunca impedimento — quem pode avaliar potencial ainda
 *     será definido pelo RH.
 * ============================================================================
 */

import { notaNaEscala } from './nineBoxConsolidacao';
import { montarRegistroAuditoria, type RegistroAuditoria } from './auditoriaFeedback';

/* ─── Estados ─────────────────────────────────────────────────────────────── */

/** Os três estados oficiais do fluxo. */
export const STATUS_FEEDBACK = {
  PENDENTE: 'pendente',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado',
} as const;

export type StatusFeedback = (typeof STATUS_FEEDBACK)[keyof typeof STATUS_FEEDBACK];

/** Ações possíveis sobre um feedback. */
export type AcaoStatus = 'concluir' | 'cancelar' | 'reabrir';

/**
 * Perfil do operador. `admin_rh` é o único que reabre; `gestor` e `avaliador`
 * concluem/cancelam dentro do escopo que o BACKEND validar.
 */
export type PerfilOperador = 'admin_rh' | 'gestor' | 'avaliador' | 'desconhecido';

/** Status lido da base: qualquer texto ≠ dos três é tratado como desconhecido. */
export type StatusLido = StatusFeedback | 'desconhecido';

/** Normaliza o `status` cru (a coluna é TEXT livre, sem CHECK no banco). */
export function normalizarStatus(valor: unknown): StatusLido {
  const s = String(valor ?? '')
    .trim()
    .toLowerCase();
  if (s === STATUS_FEEDBACK.PENDENTE || s === STATUS_FEEDBACK.CONCLUIDO || s === STATUS_FEEDBACK.CANCELADO) return s;
  return 'desconhecido';
}

/* ─── Transições permitidas ───────────────────────────────────────────────── */

export interface Transicao {
  de: StatusFeedback;
  para: StatusFeedback;
  acao: AcaoStatus;
  /** Perfis autorizados. Vazio = transição PROIBIDA (existe para documentar). */
  perfis: readonly PerfilOperador[];
}

/**
 * Tabela de transições — a regra fica visível e testável em um só lugar.
 * `concluido → cancelado` é DELIBERADAMENTE proibida: exige reabrir primeiro,
 * para não apagar a nota de uma avaliação já concluída sem trilha.
 */
export const TRANSICOES: readonly Transicao[] = [
  { de: 'pendente', para: 'concluido', acao: 'concluir', perfis: ['admin_rh', 'gestor', 'avaliador'] },
  { de: 'pendente', para: 'cancelado', acao: 'cancelar', perfis: ['admin_rh', 'gestor'] },
  { de: 'concluido', para: 'cancelado', acao: 'cancelar', perfis: [] },
  { de: 'concluido', para: 'pendente', acao: 'reabrir', perfis: ['admin_rh'] },
  { de: 'cancelado', para: 'pendente', acao: 'reabrir', perfis: ['admin_rh'] },
];

export interface ResultadoTransicao {
  permitido: boolean;
  /** Estado de destino quando permitido; `null` quando bloqueado. */
  para: StatusFeedback | null;
  /** Código curto para teste/log (não é texto de interface). */
  motivo: 'ok' | 'status_desconhecido' | 'transicao_inexistente' | 'transicao_proibida' | 'perfil_nao_autorizado';
  /** Texto para a interface; o backend revalida de qualquer forma. */
  descricao: string;
  /** SEMPRE `true`: autorização real e atomicidade são do backend. */
  exigeBackend: true;
}

/**
 * Decide se uma ação pode ser OFERECIDA. Puro, sem I/O.
 *
 * ATENÇÃO: `permitido: true` significa "a interface pode enviar a operação".
 * NÃO significa autorizado — a validação definitiva é do servidor.
 */
export function validarTransicao({
  statusAtual,
  acao,
  perfil,
}: {
  statusAtual: unknown;
  acao: AcaoStatus;
  perfil: PerfilOperador;
}): ResultadoTransicao {
  const base = { exigeBackend: true } as const;
  const status = normalizarStatus(statusAtual);

  if (status === 'desconhecido') {
    return {
      ...base,
      permitido: false,
      para: null,
      motivo: 'status_desconhecido',
      descricao: 'Status atual não reconhecido — regularize o registro antes de mudar o estado.',
    };
  }

  const candidatas = TRANSICOES.filter((t) => t.de === status && t.acao === acao);
  if (candidatas.length === 0) {
    return {
      ...base,
      permitido: false,
      para: null,
      motivo: 'transicao_inexistente',
      descricao: `Não existe transição de "${status}" pela ação "${acao}".`,
    };
  }

  const permitidas = candidatas.filter((t) => t.perfis.length > 0);
  if (permitidas.length === 0) {
    return {
      ...base,
      permitido: false,
      para: null,
      motivo: 'transicao_proibida',
      descricao: `A transição de "${status}" por "${acao}" exige reabrir a avaliação antes.`,
    };
  }

  const autorizada = permitidas.find((t) => t.perfis.includes(perfil));
  if (!autorizada) {
    return {
      ...base,
      permitido: false,
      para: null,
      motivo: 'perfil_nao_autorizado',
      descricao: 'Seu perfil não executa esta ação (a permissão também é conferida no servidor).',
    };
  }

  return {
    ...base,
    permitido: true,
    para: autorizada.para,
    motivo: 'ok',
    descricao: `Transição de "${status}" para "${autorizada.para}".`,
  };
}

/* ─── Validações puras de conclusão e cancelamento ────────────────────────── */

/** Campos do feedback que a validação lê (nomes reais de `feedbacks_360`). */
export interface FeedbackParaValidar {
  avaliado_id?: unknown;
  avaliador_id?: unknown;
  ciclo_id?: unknown;
  nota_geral?: unknown;
  performance?: unknown;
  potencial?: unknown;
  pontos_fortes?: unknown;
  pontos_melhoria?: unknown;
  comentarios?: unknown;
}

export type ImpedimentoConclusao =
  'avaliado_ausente' | 'avaliador_ausente' | 'ciclo_ausente' | 'desempenho_ausente' | 'desempenho_fora_da_escala';

/** Avisos NÃO bloqueiam a conclusão — só são levados ao operador. */
export type AvisoConclusao = 'potencial_ausente' | 'potencial_fora_da_escala' | 'sem_texto_de_apoio';

export interface ResultadoConclusao {
  podeConcluir: boolean;
  impedimentos: ImpedimentoConclusao[];
  avisos: AvisoConclusao[];
}

/**
 * Valida se a avaliação pode ser CONCLUÍDA.
 *
 * Exige: avaliado, avaliador, ciclo e nota de DESEMPENHO na escala 1–5.
 * NÃO exige potencial: quem está autorizado a avaliar potencial ainda será
 * definido pelo RH — bloquear agora travaria a finalização de avaliações
 * legítimas de desempenho (correção obrigatória nº 4 do plano).
 */
export function validarConclusao(feedback: FeedbackParaValidar): ResultadoConclusao {
  const impedimentos: ImpedimentoConclusao[] = [];
  const avisos: AvisoConclusao[] = [];

  const temAvaliado = String(feedback.avaliado_id ?? '').trim() !== '';
  const temAvaliador = String(feedback.avaliador_id ?? '').trim() !== '';
  const temCiclo = String(feedback.ciclo_id ?? '').trim() !== '';
  if (!temAvaliado) impedimentos.push('avaliado_ausente');
  if (!temAvaliador) impedimentos.push('avaliador_ausente');
  if (!temCiclo) impedimentos.push('ciclo_ausente');

  const desempenhoBruto = feedback.performance ?? feedback.nota_geral;
  const desempenho = notaNaEscala(desempenhoBruto);
  if (desempenho === null) {
    const existe = desempenhoBruto !== null && desempenhoBruto !== undefined && String(desempenhoBruto).trim() !== '';
    impedimentos.push(existe ? 'desempenho_fora_da_escala' : 'desempenho_ausente');
  }

  const temPotencial =
    feedback.potencial !== null && feedback.potencial !== undefined && String(feedback.potencial).trim() !== '';
  if (!temPotencial) avisos.push('potencial_ausente');
  else if (notaNaEscala(feedback.potencial) === null) avisos.push('potencial_fora_da_escala');

  const temTexto =
    String(feedback.pontos_fortes ?? '').trim() !== '' ||
    String(feedback.pontos_melhoria ?? '').trim() !== '' ||
    String(feedback.comentarios ?? '').trim() !== '';
  if (!temTexto) avisos.push('sem_texto_de_apoio');

  return { podeConcluir: impedimentos.length === 0, impedimentos, avisos };
}

export type ImpedimentoCancelamento = 'motivo_ausente' | 'motivo_curto';

export interface ResultadoCancelamento {
  podeCancelar: boolean;
  impedimentos: ImpedimentoCancelamento[];
}

/** Mínimo de caracteres do motivo — valor de partida, ajustável pelo RH. */
export const MIN_CARACTERES_MOTIVO = 3;

/** Cancelar exige motivo: o registro permanece (não é `DELETE`). */
export function validarCancelamento({ motivo }: { motivo?: unknown }): ResultadoCancelamento {
  const impedimentos: ImpedimentoCancelamento[] = [];
  const texto = String(motivo ?? '').trim();
  if (texto === '') impedimentos.push('motivo_ausente');
  else if (texto.length < MIN_CARACTERES_MOTIVO) impedimentos.push('motivo_curto');
  return { podeCancelar: impedimentos.length === 0, impedimentos };
}

export type ImpedimentoReabertura = 'justificativa_ausente' | 'justificativa_curta';

export interface ResultadoReabertura {
  podeReabrir: boolean;
  impedimentos: ImpedimentoReabertura[];
}

/** Mínimo de caracteres da justificativa de reabertura (valor de partida). */
export const MIN_CARACTERES_JUSTIFICATIVA = 10;

/**
 * Reabrir exige JUSTIFICATIVA (a trilha precisa explicar por que uma avaliação
 * já concluída/cancelada volta a `pendente`). Reabrir não apaga histórico: o
 * registro permanece e as aprovações que dependiam da versão anterior deixam de
 * valer (ver `motorAvaliacao360.validacaoAplicavel`).
 */
export function validarReabertura({ justificativa }: { justificativa?: unknown }): ResultadoReabertura {
  const impedimentos: ImpedimentoReabertura[] = [];
  const texto = String(justificativa ?? '').trim();
  if (texto === '') impedimentos.push('justificativa_ausente');
  else if (texto.length < MIN_CARACTERES_JUSTIFICATIVA) impedimentos.push('justificativa_curta');
  return { podeReabrir: impedimentos.length === 0, impedimentos };
}

/* ─── Idempotência POR OPERAÇÃO ───────────────────────────────────────────── */

/**
 * Ações que exigem chave de idempotência.
 *
 * A chave identifica UMA OPERAÇÃO (o ato de concluir/cancelar/reabrir), não o
 * conteúdo da avaliação. Assim, duas avaliações legítimas com as mesmas notas
 * continuam sendo dois registros válidos, e apenas o REENVIO do mesmo ato é
 * ignorado pelo backend.
 */
export const OPERACOES_COM_IDEMPOTENCIA: readonly AcaoStatus[] = ['concluir', 'cancelar', 'reabrir'];

export type MotivoChaveInvalida =
  'operacao_ausente' | 'operacao_sem_idempotencia' | 'feedback_ausente' | 'id_operacao_ausente';

export interface ResultadoChave {
  valida: boolean;
  chave: string | null;
  motivo: MotivoChaveInvalida | 'ok';
}

/**
 * Monta a chave de idempotência: `operacao:feedbackId:idOperacao`.
 * `idOperacao` é gerado NO INÍCIO da operação (uuid/ulid) e reaproveitado
 * apenas em retentativa — nunca derivado do conteúdo avaliado.
 */
export function montarChaveIdempotencia({
  operacao,
  feedbackId,
  idOperacao,
}: {
  operacao: AcaoStatus;
  feedbackId: string;
  idOperacao: string;
}): ResultadoChave {
  if (!OPERACOES_COM_IDEMPOTENCIA.includes(operacao)) {
    return { valida: false, chave: null, motivo: 'operacao_sem_idempotencia' };
  }
  const id = String(feedbackId ?? '').trim();
  const op = String(idOperacao ?? '').trim();
  if (!id) return { valida: false, chave: null, motivo: 'feedback_ausente' };
  if (!op) return { valida: false, chave: null, motivo: 'id_operacao_ausente' };
  return { valida: true, chave: `${operacao}:${id}:${op}`, motivo: 'ok' };
}

/* ─── Operação completa (payload que o backend executará) ─────────────────── */

export interface OperacaoStatus {
  operacao: AcaoStatus;
  feedbackId: string;
  empresaId: string;
  de: StatusFeedback;
  para: StatusFeedback;
  chaveIdempotencia: string;
  /** Texto do motivo (cancelamento). O BACKEND decide onde persistir. */
  observacao?: string;
  /** Registro de auditoria para gravar na MESMA transação. */
  auditoria: RegistroAuditoria;
  /** `true`: status + auditoria acontecem juntos, no servidor. */
  exigeBackend: true;
}

export type ResultadoOperacao =
  { pronta: true; operacao: OperacaoStatus } | { pronta: false; motivo: string; descricao: string };

/**
 * Empacota a operação inteira (validação → destino → idempotência → auditoria).
 * NÃO executa nada: devolve o payload para o backend aplicar atomicamente.
 */
export function montarOperacao({
  operacao,
  feedbackId,
  empresaId,
  statusAtual,
  perfil,
  feedback,
  motivoCancelamento,
  justificativaReabertura,
  idOperacao,
  usuarioEmail = null,
}: {
  operacao: AcaoStatus;
  feedbackId: string;
  empresaId: string;
  statusAtual: unknown;
  perfil: PerfilOperador;
  feedback: FeedbackParaValidar;
  motivoCancelamento?: unknown;
  /** Justificativa obrigatória quando a ação é `reabrir`. */
  justificativaReabertura?: unknown;
  idOperacao: string;
  usuarioEmail?: string | null;
}): ResultadoOperacao {
  const transicao = validarTransicao({ statusAtual, acao: operacao, perfil });
  if (!transicao.permitido || !transicao.para) {
    return { pronta: false, motivo: transicao.motivo, descricao: transicao.descricao };
  }

  if (operacao === 'concluir') {
    const { podeConcluir, impedimentos } = validarConclusao(feedback);
    if (!podeConcluir) {
      return {
        pronta: false,
        motivo: impedimentos[0],
        descricao: 'A avaliação ainda não reúne os dados mínimos para ser concluída.',
      };
    }
  }

  const motivoTexto = String(motivoCancelamento ?? '').trim();
  if (operacao === 'cancelar') {
    const { podeCancelar, impedimentos } = validarCancelamento({ motivo: motivoCancelamento });
    if (!podeCancelar) {
      return { pronta: false, motivo: impedimentos[0], descricao: 'Informe o motivo do cancelamento.' };
    }
  }

  const justificativaTexto = String(justificativaReabertura ?? '').trim();
  if (operacao === 'reabrir') {
    const { podeReabrir, impedimentos } = validarReabertura({ justificativa: justificativaReabertura });
    if (!podeReabrir) {
      return { pronta: false, motivo: impedimentos[0], descricao: 'Informe a justificativa da reabertura.' };
    }
  }

  const chave = montarChaveIdempotencia({ operacao, feedbackId, idOperacao });
  if (!chave.valida || !chave.chave) {
    return { pronta: false, motivo: chave.motivo, descricao: 'Operação sem identificador de idempotência.' };
  }

  const auditoria = montarRegistroAuditoria({
    registroId: feedbackId,
    anteriores: { status: normalizarStatus(statusAtual) },
    novos: { status: transicao.para },
    usuarioEmail,
  });

  return {
    pronta: true,
    operacao: {
      operacao,
      feedbackId,
      empresaId,
      de: normalizarStatus(statusAtual) as StatusFeedback,
      para: transicao.para,
      chaveIdempotencia: chave.chave,
      ...(motivoTexto || justificativaTexto ? { observacao: motivoTexto || justificativaTexto } : {}),
      auditoria,
      exigeBackend: true,
    },
  };
}

/* ─── Rótulos (a interface de finalização os usará quando autorizada) ─────── */

export const ROTULO_STATUS: Record<StatusLido, string> = {
  pendente: 'Pendente',
  concluido: 'Concluída',
  cancelado: 'Cancelada',
  desconhecido: 'Status desconhecido',
};

export const ROTULO_ACAO: Record<AcaoStatus, string> = {
  concluir: 'Concluir avaliação',
  cancelar: 'Cancelar avaliação',
  reabrir: 'Reabrir avaliação',
};
