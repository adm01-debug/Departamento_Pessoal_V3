/**
 * ============================================================================
 * AÇÕES DE FEEDBACK — CAMADA DE DECISÃO DA INTERFACE (pura, sem I/O).
 *
 * Responde três perguntas que os controles aprovados precisam responder antes
 * de serem desenhados:
 *   1. QUAIS ações o registro admite agora (concluir / cancelar / reabrir)?
 *   2. QUAIS dessas o perfil do operador pode OFERECER?
 *   3. QUAL a situação da validação de Potencial (sem validação / validada /
 *      desatualizada após alteração da avaliação)?
 *
 * ⚠️ `disponivel: true` NÃO é autorização: significa apenas que a interface
 * pode exibir o controle. A decisão definitiva é do servidor (RPC), que revalida
 * papel, empresa e versão do registro. A regra de transição vem de
 * `statusFeedback.ts` — fonte única, já testada (`StatusFeedback.test.tsx`).
 *
 * Este arquivo NÃO renderiza nada e NÃO é importado por nenhum componente
 * visual ainda: a inclusão dos controles no `FeedbackDetalheDialog` depende da
 * aprovação da proposta em `docs/ninebox-proposta-controles-feedback.md`.
 * ============================================================================
 */

import {
  ROTULO_ACAO,
  ROTULO_STATUS,
  normalizarStatus,
  validarTransicao,
  type AcaoStatus,
  type PerfilOperador,
} from './statusFeedback';
import { capacidadesAvaliacao, normalizarPapeis, type PapeisAvaliacao } from './papeisAvaliacao';

/** Papel do usuário como o app entrega (`app_role`: admin|gestor|rh|user). */
export type PapelApp = string | null | undefined;

/**
 * Converte o papel REAL do sistema (`app_role`) no perfil do fluxo de status.
 * `rh` e `admin` são os operadores administrativos (a mesma dupla de
 * `pode_gerir_avaliacoes()` no banco); `gestor` gerencia o próprio escopo.
 */
export function perfilOperador(papel: PapelApp): PerfilOperador {
  const p = String(papel ?? '')
    .trim()
    .toLowerCase();
  if (p === 'admin' || p === 'rh') return 'admin_rh';
  if (p === 'gestor') return 'gestor';
  if (p === 'user') return 'avaliador';
  return 'desconhecido';
}

/**
 * A validação de Potencial é EXCLUSIVA do RH — espelha, no front, a função
 * `pode_validar_potencial()` da migration (`role = 'rh'`, sem admin). O servidor
 * é quem decide; aqui só se evita oferecer um controle que vai falhar.
 *
 * Aceita a LISTA de papéis (`user_roles` → `['admin','gestor']`) ou um papel
 * único: a capacidade é decidida pelo papel que a concede (`rh`), nunca pela
 * precedência entre papéis.
 */
export function podeValidarPotencial(papeis: PapeisAvaliacao): boolean {
  return capacidadesAvaliacao(papeis).podeValidarPotencial;
}

/** RH/admin enviam e reenviam ao gestor (`pode_gerir_avaliacoes()`). */
export function podeGerirAvaliacoes(papeis: PapeisAvaliacao): boolean {
  return capacidadesAvaliacao(papeis).podeGerirAvaliacoes;
}

/** A conta tem o papel `gestor`? (independe de também ser `admin`/`rh`.) */
export function temPerfilGestor(papeis: PapeisAvaliacao): boolean {
  return capacidadesAvaliacao(papeis).gestor;
}

/**
 * O usuário autenticado é o AVALIADOR DESIGNADO do feedback?
 *
 * A designação (`avaliador_id`) é a autorização para CONCLUIR o registro, e é
 * independente do `tipo` (gestor/par/auto/subordinado) e da existência de
 * `supervisor_id`. O servidor revalida a mesma designação.
 */
export function ehAvaliadorDesignado({
  avaliadorId,
  vinculos = [],
  usuarioId,
}: {
  avaliadorId: unknown;
  vinculos?: VinculoGestor[];
  usuarioId: unknown;
}): boolean {
  const alvo = String(avaliadorId ?? '').trim();
  const uid = String(usuarioId ?? '').trim();
  if (!alvo || !uid) return false;
  const eu = vinculos.find((v) => String(v?.user_id ?? '').trim() === uid);
  return Boolean(eu && String(eu.id ?? '').trim() === alvo);
}

/**
 * Autorização de CONCLUSÃO do feedback — separada da aprovação consolidada.
 *
 * Fontes:
 *   • RH/admin (`pode_gerir_avaliacoes()` no banco);
 *   • avaliador designado (`avaliador_id`);
 *   • gestor responsável (`supervisor_id`) ou exceção confirmada pelo servidor.
 *
 * O `tipo` do feedback NÃO entra na decisão. Sem qualquer vínculo/designação, o
 * controle não é oferecido — não é liberação indiscriminada.
 */
export function podeConcluirFeedback({
  papeis,
  avaliadorId,
  vinculos = [],
  usuarioId,
  responsavel = false,
  autorizadoServidor = false,
}: {
  papeis: PapeisAvaliacao;
  avaliadorId: unknown;
  vinculos?: VinculoGestor[];
  usuarioId: unknown;
  responsavel?: boolean;
  autorizadoServidor?: boolean;
}): boolean {
  const c = capacidadesAvaliacao(papeis);
  if (c.admin || c.rh) return true;
  if (ehAvaliadorDesignado({ avaliadorId, vinculos, usuarioId })) return true;
  if (autorizadoServidor === true) return true;
  // Ser supervisor só autoriza quando a conta também tem o papel `gestor`;
  // um `user` que aparece como supervisor não recebe conclusão por engano.
  return c.gestor && responsavel === true;
}

/**
 * Perfis EFETIVOS do operador no fluxo de STATUS (uma conta pode ter VÁRIOS).
 *
 * Papéis são capacidades; o recurso/autorização é conferido à parte por
 * `podeConcluirFeedback`. Um gestor continua sendo `gestor` mesmo quando o
 * colaborador não tem supervisor — a conclusão do feedback não depende disso.
 */
export function perfisOperadorEfetivos(papeis: PapeisAvaliacao, _responsavel?: boolean): PerfilOperador[] {
  const c = capacidadesAvaliacao(papeis);
  const perfis: PerfilOperador[] = [];
  if (c.admin || c.rh) perfis.push('admin_rh');
  if (c.gestor) perfis.push('gestor');
  if (perfis.length === 0) perfis.push(normalizarPapeis(papeis).includes('user') ? 'avaliador' : 'desconhecido');
  return perfis;
}
export function exigeJustificativa(acao: AcaoStatus): boolean {
  return acao === 'cancelar' || acao === 'reabrir';
}

/** Ação de status que suprime a nota de um registro já concluído (proibida). */
export function acaoDestrutiva(acao: AcaoStatus): boolean {
  return acao === 'cancelar';
}

/* ─── Responsabilidade do gestor (vínculo real, não o tipo da avaliação) ──── */

/** Vínculo mínimo de um colaborador — o que basta para provar a responsabilidade. */
export interface VinculoGestor {
  id?: string | null;
  user_id?: string | null;
  supervisor_id?: string | null;
}

/**
 * O usuário autenticado é o GESTOR RESPONSÁVEL pela avaliação do colaborador?
 *
 * Espelha `public.pode_aprovar_colaborador(uuid)` do banco — o gestor é quem tem
 * `colaboradores.user_id = auth.uid()` e é `supervisor_id` do avaliado (ou o
 * próprio avaliado). NÃO olha o `tipo` do feedback: tipo é ORIGEM da avaliação;
 * quem conclui é definido pelo PAPEL e pelo VÍNCULO.
 *
 * Fail-closed: sem prova do vínculo (sem `user_id`, sem o colaborador do
 * usuário ou sem o avaliado na lista) devolve `false` — a interface não oferece
 * a conclusão, e o servidor revalida de qualquer forma.
 */
export function ehGestorResponsavel({
  avaliadoId,
  vinculos = [],
  usuarioId,
}: {
  avaliadoId: unknown;
  vinculos?: VinculoGestor[];
  usuarioId: unknown;
}): boolean {
  const alvo = String(avaliadoId ?? '').trim();
  const uid = String(usuarioId ?? '').trim();
  if (!alvo || !uid) return false;

  const eu = vinculos.find((v) => String(v?.user_id ?? '').trim() === uid);
  const meuId = String(eu?.id ?? '').trim();
  if (!meuId) return false;

  const avaliado = vinculos.find((v) => String(v?.id ?? '').trim() === alvo);
  if (!avaliado) return false;

  return String(avaliado?.supervisor_id ?? '').trim() === meuId || alvo === meuId;
}

export interface AcaoDisponivel {
  acao: AcaoStatus;
  /** Rótulo pronto para o controle (mesma fonte das demais telas). */
  rotulo: string;
  /** Exige texto do operador (motivo/justificativa) antes de enviar. */
  exigeJustificativa: boolean;
  /** `cancelar` é irreversível na prática: exige confirmação explícita. */
  destrutiva: boolean;
  /** A interface pode exibir o controle? (não é autorização) */
  disponivel: boolean;
  /** Por que o controle NÃO pode ser oferecido (texto da camada pura). */
  motivoBloqueio: string | null;
}

/**
 * Perfil do fluxo de STATUS quando a conta tem VÁRIOS papéis.
 *
 * `admin`+`gestor` não pode virar só `admin_rh`: quem é o GESTOR RESPONSÁVEL
 * pela avaliação opera como `gestor` (é o perfil autorizado a concluir na tabela
 * de transições — `TRANSICOES`, `concluir` → `['gestor']`). Sem o vínculo
 * provado, prevalece a leitura por precedência (`admin`/`rh` → `admin_rh`), que
 * é o comportamento de hoje.
 */
export function perfilOperadorComVinculo(
  papel: PapelApp,
  temGestor: boolean,
  responsavel: boolean
): PerfilOperador {
  if (temGestor && responsavel === true) return 'gestor';
  return perfilOperador(papel);
}

/**
 * Ações do fluxo para o status atual, na ordem em que a interface deve
 * apresentá-las. Sempre devolve as três — a UI decide esconder ou desabilitar
 * as `disponivel: false` (a proposta visual é explícita sobre isso).
 *
 * `responsavel` é a prova de que o usuário é o GESTOR RESPONSÁVEL pela avaliação
 * (`ehGestorResponsavel`). Ela é uma das fontes de autorização para `concluir`;
 * `autorizadoConcluir` é a prova completa (avaliador designado, responsável,
 * exceção ou RH/admin) calculada por `podeConcluirFeedback`. A aprovação
 * consolidada NÃO usa esta flag: continua exigindo o gestor autorizado.
 */
export function acoesDisponiveis({
  statusAtual,
  papel,
  perfil,
  perfis,
  responsavel = false,
  autorizadoConcluir,
}: {
  statusAtual: unknown;
  papel: PapelApp;
  /**
   * Perfil do fluxo já resolvido pelo chamador (útil quando a conta tem VÁRIOS
   * papéis — ver `perfilOperadorComVinculo`). Ausente, deriva de `papel`.
   */
  perfil?: PerfilOperador;
  /**
   * LISTA de perfis da conta (`admin`+`gestor` → `['admin_rh','gestor']`): cada
   * ação autorizada por QUALQUER perfil que a conceda, nunca por precedência.
   */
  perfis?: PerfilOperador[];
  /** `true` somente com o vínculo comprovado (ver `ehGestorResponsavel`). */
  responsavel?: boolean;
  /**
   * Autorização EFETIVA para concluir, independente de `supervisor_id`.
   * Ausente = compatibilidade: usa `responsavel`.
   */
  autorizadoConcluir?: boolean;
}): AcaoDisponivel[] {
  const efetivos: PerfilOperador[] = perfis?.length ? perfis : [perfil ?? perfilOperador(papel)];
  const ordem: AcaoStatus[] = ['concluir', 'cancelar', 'reabrir'];
  const podeConcluir = autorizadoConcluir ?? responsavel;

  return ordem.map((acao) => {
    const tentativas = efetivos.map((p) => validarTransicao({ statusAtual, acao, perfil: p }));
    const r = tentativas.find((t) => t.permitido) ?? tentativas[0];
    const exigeAutorizacao = acao === 'concluir';
    const disponivel = r.permitido && (!exigeAutorizacao || podeConcluir === true);

    return {
      acao,
      rotulo: ROTULO_ACAO[acao],
      exigeJustificativa: exigeJustificativa(acao),
      destrutiva: acaoDestrutiva(acao),
      disponivel,
      motivoBloqueio: disponivel
        ? null
        : r.permitido && exigeAutorizacao
          ? 'Você não tem autorização para concluir esta avaliação.'
          : r.descricao,
    };
  });
}

/* ─── situação da validação de Potencial ──────────────────────────────────── */

export type SituacaoPotencial = 'sem_validacao' | 'validada' | 'desatualizada';

export const ROTULO_SITUACAO_POTENCIAL: Record<SituacaoPotencial, string> = {
  sem_validacao: 'Aguardando validação',
  validada: 'Validado pelo RH',
  desatualizada: 'Validação desatualizada',
};

export interface ValidacaoPotencialLida {
  versao_avaliacao?: unknown;
  potencial_validado?: unknown;
}

/**
 * Situação da validação vigente. A VERSÃO é comparada com a canônica vinda do
 * banco (`vw_feedbacks_360_versao`): se o feedback mudou depois da validação, a
 * validação vira DESATUALIZADA. O `statusAtual` (opcional) reforça a mesma
 * regra: registro que saiu de "concluído" — reaberto ou cancelado — NUNCA pode
 * continuar aparecendo como aprovado.
 */
export function situacaoPotencial(
  validacao: ValidacaoPotencialLida | null | undefined,
  versaoAtual: string | null | undefined,
  statusAtual?: unknown
): SituacaoPotencial {
  if (!validacao) return 'sem_validacao';
  if (statusAtual !== undefined && normalizarStatus(statusAtual) !== 'concluido') return 'desatualizada';

  const versaoValidada = String(validacao.versao_avaliacao ?? '').trim();
  const versao = String(versaoAtual ?? '').trim();
  if (versao && versaoValidada && versaoValidada !== versao) return 'desatualizada';
  return 'validada';
}

/** Rótulo do status atual (fonte única: `ROTULO_STATUS` de `statusFeedback`). */
export function rotuloStatus(statusAtual: unknown): string {
  return ROTULO_STATUS[normalizarStatus(statusAtual)];
}
