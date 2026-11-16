import { useQuery, type QueryClient } from '@tanstack/react-query';
import {
  MAPA_IMAGENS_VAZIO,
  TRAINING_IMAGES_GC_MS,
  TRAINING_IMAGES_STALE_MS,
  carregarImagensDaEmpresa,
  imagensDeTreinamentoHabilitadas,
  type TrainingImageMap,
} from '@/services/trainingImages';

/**
 * ============================================================================
 * CAPAS DO HUB DE TREINAMENTOS — leitura única por empresa.
 *
 * • NÃO gera imagem: só lê as capas já concluídas em `public.training_images`.
 * • DESLIGADO POR PADRÃO (`VITE_TRAINING_IMAGES=true` para ligar). Sem a flag,
 *   `enabled` é falso e NENHUMA consulta sai — o ambiente que ainda não recebeu
 *   a migration continua com o console limpo.
 * • ISOLAMENTO: a empresa faz parte da `queryKey`. Trocar de empresa nunca
 *   reaproveita o cache da anterior.
 * • URL ASSINADA (1 h) × CACHE (15 min): o `staleTime` é menor de propósito, e
 *   o refetch ao voltar o foco renova a URL antes de expirar. Não há polling.
 * • ATUALIZAÇÃO APÓS GERAÇÃO: usar `invalidarCapasDeTreinamento(queryClient,
 *   empresaId)` no `onSuccess` do fluxo de geração (ou num evento realtime), que
 *   o card troca o fallback pela capa sem recarregar a página.
 * • Falha (tabela ausente, RLS, rede) → mapa vazio, cards seguem no fallback.
 * ============================================================================
 */

/** Chave canônica do cache — inclui o tenant. */
export function trainingImagesQueryKey(empresaId?: string | null) {
  return ['training_images', empresaId ?? null] as const;
}

/**
 * Invalida apenas as capas da empresa informada. Chamar quando uma geração
 * terminar (ou quando o cadastro mudar) para a UI buscar as URLs novas.
 */
export function invalidarCapasDeTreinamento(queryClient: QueryClient, empresaId?: string | null): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: trainingImagesQueryKey(empresaId) });
}

export function useTrainingImages(empresaId?: string | null): TrainingImageMap {
  const habilitado = imagensDeTreinamentoHabilitadas();

  const { data } = useQuery({
    queryKey: trainingImagesQueryKey(empresaId),
    enabled: habilitado && Boolean(empresaId),
    staleTime: TRAINING_IMAGES_STALE_MS,
    gcTime: TRAINING_IMAGES_GC_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
    queryFn: () => carregarImagensDaEmpresa(empresaId),
  });

  return data ?? MAPA_IMAGENS_VAZIO;
}
