/**
 * ============================================================================
 * SERVIÇO DEMONSTRATIVO — MESMOS CONTROLES, PERSISTÊNCIA LOCAL.
 *
 * O rodapé fala com uma interface única (`ServicoAcoes`). Em MODO REAL ela é
 * `avaliacaoService` (Supabase/RPC). Na DEMONSTRAÇÃO ela passa a ser ESTE
 * serviço: os MESMOS botões (Concluir, Cancelar, Reabrir, Validar Potencial,
 * Aprovar, Devolver) executam a ação, gravando no armazenamento local da
 * vitrine — nunca no banco, nunca em ID fictício, nunca em `audit_log`.
 *
 * ── CENÁRIO EXPLÍCITO DE GESTOR RESPONSÁVEL (demonstração) ─────────────────
 * A vitrine tem UM gestor de referência (`mock-13`, o avaliador dos registros
 * fictícios). `listarVinculos` devolve esse cenário com `user_id` do OPERADOR
 * da demonstração, de modo que o vínculo responsável seja provado como no modo
 * real (`ehGestorResponsavel`). Isso existe SÓ aqui: nenhuma permissão real é
 * alterada, nenhuma sessão é falsificada e o modo real continua usando os
 * vínculos do banco.
 * ============================================================================
 */

import type { ServicoAcoes } from './FeedbackAcoesRodape';
import { atualizarRegistroDemo, lerRegistrosDemo, patchDe } from './desempenhoDemoStore';
import { chaveLocal, lerEstadoLocal, validacoesLocais, validarPotencialLocal } from './aprovacaoLocal';
import { feedbackDoGestor, versaoValidacaoDemo } from './aprovacaoGestor';

/** Gestor de referência da vitrine (avaliador dos mocks de `desempenhoMock`). */
export const GESTOR_DEMO_ID = 'mock-13';

export interface ContextoServicoDemo {
  /** Id do usuário autenticado que opera a vitrine (nunca usado no banco). */
  usuarioId: string | null;
  /** E-mail do operador (trilha da demonstração). */
  email: string | null;
  /** Feedback visível pelo id (colaborador/ciclo/potencial). */
  feedbackDe?: (feedbackId: string) => Record<string, unknown> | null;
  /** Todos os feedbacks visíveis (versões da vitrine). */
  feedbacks?: Record<string, unknown>[];
  /** Ids dos colaboradores visíveis (cenário de vínculos da demonstração). */
  colaboradoresIds?: string[];
}

/**
 * CENÁRIO DE VÍNCULOS DA VITRINE — a MESMA identidade usada pelo rodapé e pela
 * fila. O operador é o gestor de referência (`mock-13`) RESPONSÁVEL por todos os
 * colaboradores visíveis, de modo que a fila resolva "Gestor responsável" e o
 * vínculo (`supervisor_id` → `user_id`) exatamente como no modo real.
 *
 * Nada aqui toca o banco: é apenas a leitura fictícia de `colaboradores`.
 */
export function vinculosDemonstracao({
  usuarioId,
  colaboradoresIds = [],
}: {
  usuarioId: string | null;
  colaboradoresIds?: string[];
}): { id: string; user_id: string | null; supervisor_id: string | null }[] {
  const eu = String(usuarioId ?? '').trim();
  return [
    { id: GESTOR_DEMO_ID, user_id: eu || null, supervisor_id: null },
    ...colaboradoresIds
      .map((id) => String(id ?? '').trim())
      .filter((id) => Boolean(id) && id !== GESTOR_DEMO_ID)
      .map((id) => ({ id, user_id: null, supervisor_id: GESTOR_DEMO_ID })),
  ];
}

const texto = (v: unknown) => String(v ?? '').trim();

/** Versão da demonstração — mesma convenção do derivador (`demonstracao:<id>`). */
export function versaoDemoDe(feedbackId: string): string {
  return `demonstracao:${texto(feedbackId)}`;
}

/**
 * Serviço demonstrativo. Os retornos imitam o contrato das RPCs (o rodapé não
 * sabe a diferença), mas gravam LOCALMENTE e identificam a operação na trilha.
 */
export function criarServicoDemo(contexto: ContextoServicoDemo): ServicoAcoes {
  const por = contexto.email ?? null;
  const versaoDe = (feedbackId: string) => versaoDemoDe(feedbackId);

  const servico = {
    async finalizarFeedback(params: {
      feedbackId: string;
      acao: 'concluir' | 'cancelar' | 'reabrir';
      motivo?: string | null;
      idOperacao: string;
    }) {
      const status = params.acao === 'concluir' ? 'concluido' : params.acao === 'cancelar' ? 'cancelado' : 'pendente';
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (params.acao === 'cancelar') patch.motivo_cancelamento = params.motivo ?? null;
      if (params.acao === 'reabrir') patch.justificativa_reabertura = params.motivo ?? null;

      atualizarRegistroDemo('feedbacks', params.feedbackId, patch, {
        por,
        operacao: 'status',
        descricao:
          params.acao === 'concluir'
            ? 'Avaliação concluída na demonstração'
            : params.acao === 'cancelar'
              ? 'Avaliação cancelada na demonstração'
              : 'Avaliação reaberta na demonstração',
      });

      return { ok: true, idempotente: false, status, acao: params.acao, versao_avaliacao: versaoDe(params.feedbackId) };
    },

    async validarPotencialAvaliacao(params: { feedbackId: string; idOperacao: string; observacao?: string | null }) {
      const alvo = contexto.feedbackDe?.(params.feedbackId) ?? null;
      const colaboradorId = texto(alvo?.avaliado_id);
      const cicloId = texto(alvo?.ciclo_id);
      const alvoId = texto(params.feedbackId);
      const decisaoLocal = lerEstadoLocal().decisoes[chaveLocal(colaboradorId, cicloId)] ?? null;

      /**
       * A validação é ancorada na versão da AVALIAÇÃO DO GESTOR — a MESMA da
       * decisão de versão? NÃO: a decisão usa a versão do CONJUNTO e a validação
       * usa a versão canônica do feedback do gestor (`versao_avaliacao_feedback`),
       * exatamente como `validar_potencial_avaliacao` e o motor do Nine-Box.
       */
      const grupo = (contexto.feedbacks ?? []).filter(
        (f) => texto(f?.avaliado_id) === colaboradorId && texto(f?.ciclo_id) === cicloId
      );
      const gestor = feedbackDoGestor(grupo);
      const versaoValidacao = versaoValidacaoDemo(grupo);
      if (!gestor || texto(gestor.status).toLowerCase() !== 'concluido' || !versaoValidacao) {
        throw new Error(
          'O Potencial só pode ser validado com a avaliação do Gestor (obrigatória) concluída para este ciclo.'
        );
      }

      const { resultado } = validarPotencialLocal({
        colaboradorId,
        cicloId,
        versaoAvaliacao: decisaoLocal?.versaoAvaliacao || '',
        versaoValidacao,
        por,
        observacao: params.observacao ?? 'Validação registrada na demonstração',
      });
      if (!resultado.ok) throw new Error(resultado.descricao);

      atualizarRegistroDemo(
        'feedbacks',
        alvoId || params.feedbackId,
        { validado_em: new Date().toISOString(), validado_por: por },
        { por, operacao: 'validar_potencial', descricao: 'Potencial validado na demonstração' }
      );

      return {
        ok: true,
        validacao_id: `demo-validacao-${Date.now().toString(36)}`,
        versao_avaliacao: versaoValidacao,
        potencial_validado: alvo?.potencial ?? null,
        idempotente: false,
      };
    },

    async listarValidacoesPotencial(_empresaId: string, cicloId?: string) {
      const lista = validacoesLocais(lerEstadoLocal());
      return cicloId ? lista.filter((v) => texto((v as { ciclo_id?: unknown }).ciclo_id) === texto(cicloId)) : lista;
    },

    async listarVersoesAvaliacao(_empresaId: string, cicloId?: string) {
      const estado = lerRegistrosDemo();
      const lista = (contexto.feedbacks ?? []).map((f) => {
        const id = texto(f?.id);
        return {
          feedback_id: id,
          empresa_id: 'demo',
          ciclo_id: texto(f?.ciclo_id),
          tipo: f?.tipo ?? null,
          status: patchDe(estado, 'feedbacks', id).status ?? f?.status ?? null,
          potencial: f?.potencial ?? null,
          versao_avaliacao: versaoDe(id),
        };
      });
      return cicloId ? lista.filter((v) => v.ciclo_id === texto(cicloId)) : lista;
    },

    /**
     * CENÁRIO DA VITRINE: o operador é o gestor de referência (`mock-13`) e
     * responde por todos os colaboradores da demonstração. Nada disso toca o
     * banco: o modo real continua lendo `colaboradores` do Supabase.
     */
    async listarVinculos(_empresaId: string) {
      return vinculosDemonstracao({
        usuarioId: contexto.usuarioId,
        colaboradoresIds: contexto.colaboradoresIds ?? [],
      });
    },

    async decidirAprovacaoGestor(params: {
      colaboradorId: string;
      cicloId: string;
      decisao: 'aprovado' | 'devolvido';
      justificativa?: string | null;
      idOperacao: string;
    }) {
      // A decisão demonstrativa é gravada pelo próprio rodapé (`decidirLocal`);
      // aqui só se devolve o MESMO contrato da RPC, para o fluxo seguir igual.
      return {
        ok: true,
        aprovacao_id: `demo-aprovacao-${Date.now().toString(36)}`,
        decisao: params.decisao,
        status: params.decisao,
        versao_avaliacao: versaoDemoDe(params.colaboradorId),
        idempotente: false,
      };
    },
  };

  return servico as unknown as ServicoAcoes;
}
