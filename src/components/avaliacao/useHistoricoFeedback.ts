/**
 * ============================================================================
 * PONTE ÚNICA CARD ↔ MODAL PARA O HISTÓRICO.
 *
 * • Registro real/`demo-*` → RPC autorizada `listar_historico_feedback`.
 * • Registro da vitrine (`mock-*`) → trilha local, sem rede/Supabase.
 *
 * O card e o modal usam ESTA MESMA query (mesma chave de cache), então não há
 * duas versões da justificativa em estados independentes.
 * ============================================================================
 */
import { useQuery } from '@tanstack/react-query';

import { avaliacaoService } from '@/services/avaliacaoService';

import type { FeedbackCanonico } from './feedbackCanonico';
import { statusCanonico } from './feedbackCanonico';
import { idDemonstrativo } from './escritaOperacional';
import { lerEstadoLocal } from './aprovacaoLocal';
import { lerRegistrosDemo } from './desempenhoDemoStore';
import { eventosDemoDoFeedback, normalizarHistorico, type EventoHistoricoFeedback } from './historicoFeedback';

export const CHAVE_HISTORICO_FEEDBACK = 'historico_feedback';

export function useHistoricoFeedback(item: FeedbackCanonico | null, enabled = false) {
  const id = String((item?.feedback as { id?: unknown } | undefined)?.id ?? '').trim();
  const cancelado = item?.status.chave === 'cancelado' || statusCanonico(item?.feedback?.status).chave === 'cancelado';
  const ativo = Boolean(id) && (enabled || cancelado);

  return useQuery<EventoHistoricoFeedback[]>({
    queryKey: [CHAVE_HISTORICO_FEEDBACK, id],
    enabled: ativo,
    staleTime: 10_000,
    queryFn: async () => {
      if (!id) return [];
      if (idDemonstrativo(id)) {
        return eventosDemoDoFeedback(
          (item?.feedback ?? {}) as Record<string, unknown>,
          lerRegistrosDemo(),
          lerEstadoLocal()
        );
      }
      const bruto = await avaliacaoService.listarHistoricoFeedback(id);
      return normalizarHistorico(bruto);
    },
  });
}
