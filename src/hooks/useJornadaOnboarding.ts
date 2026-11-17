/**
 * HOOKS DO DOMÍNIO CANÔNICO DE ONBOARDING (Jornada).
 *
 * A página da Jornada NÃO fala mais com o Supabase direto: consome estas
 * consultas/mutations, que delegam ao `onboardingJornadaService`. As CHAVES de
 * cache são as MESMAS de antes (`['onboarding-list']`, `['onboarding-kits']`),
 * então nenhuma invalidação existente quebrou.
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
 * LISTAR JORNADAS — todas as admissões com suas tarefas, ordenadas e com o
 * responsável já resolvido (`profiles`).
 */
export function useJornadas() {
  return useQuery({
    queryKey: CHAVE_JORNADAS,
    queryFn: (): Promise<ColaboradorOnboarding[]> => listarJornadas(),
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

/** LISTAR KITS — `incluirInativos` alimenta o gerenciador (permite reativar). */
export function useKits(incluirInativos = false) {
  return useQuery({
    queryKey: [...CHAVE_KITS, incluirInativos],
    queryFn: (): Promise<KitOnboarding[]> => listarKits(incluirInativos),
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
