/**
 * HOOKS DO DOMÍNIO CANÔNICO DE ONBOARDING (Jornada).
 *
 * A página da Jornada NÃO fala mais com o Supabase direto: consome estas
 * consultas/mutations, que delegam ao `onboardingJornadaService`. As CHAVES de
 * cache mantêm o MESMO prefixo de antes (`['onboarding-list']`,
 * `['onboarding-kits']`) e ganham o `empresaId` no fim, para não reaproveitar a
 * lista de outra empresa; as invalidações por prefixo seguem valendo.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listarJornadas,
  concluirTarefa,
  listarKits,
  criarKit,
  atualizarKit,
  type KitOnboarding,
  type KitOnboardingInput,
} from '@/services/onboardingJornadaService';
import type { ColaboradorOnboarding } from '@/components/admissoes/onboardingDerivacoes';

export const CHAVE_JORNADAS = ['onboarding-list'] as const;
export const CHAVE_KITS = ['onboarding-kits'] as const;

/**
 * LISTAR JORNADAS — admissões DA EMPRESA com suas tarefas, ordenadas e com o
 * responsável já resolvido (`profiles`). `empresaId` entra na chave de cache
 * para que a troca de empresa não reaproveite a lista da anterior.
 */
export function useJornadas(empresaId: string) {
  return useQuery({
    queryKey: [...CHAVE_JORNADAS, empresaId],
    queryFn: (): Promise<ColaboradorOnboarding[]> => listarJornadas(empresaId),
    enabled: !!empresaId,
  });
}

/** CONCLUIR TAREFA — única mutation do domínio de tarefas. */
export function useConcluirTarefa(onSettled?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tarefaId: string) => concluirTarefa(tarefaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_JORNADAS }),
    onSettled: () => onSettled?.(),
  });
}

/** LISTAR KITS — da empresa; `incluirInativos` alimenta o gerenciador (permite reativar). */
export function useKits(empresaId: string, incluirInativos = false) {
  return useQuery({
    queryKey: [...CHAVE_KITS, empresaId, incluirInativos],
    queryFn: (): Promise<KitOnboarding[]> => listarKits(empresaId, incluirInativos),
    enabled: !!empresaId,
  });
}

/** CRIAR PERFIL DE KIT. */
export function useCriarKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, entrada }: { empresaId: string; entrada: KitOnboardingInput }) =>
      criarKit(empresaId, entrada),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_KITS }),
  });
}

/** ATUALIZAR PERFIL DE KIT (nome, itens, ativo). */
export function useAtualizarKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entrada }: { id: string; entrada: KitOnboardingInput }) => atualizarKit(id, entrada),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_KITS }),
  });
}
