/**
 * HOOKS DO DOMÍNIO CANÔNICO DE ONBOARDING (Jornada).
 *
 * A página da Jornada NÃO fala mais com o Supabase direto: consome estas
 * consultas/mutations, que delegam ao `onboardingJornadaService`. As CHAVES de
 * cache são as MESMAS de antes (`['onboarding-list']`, `['onboarding-kits']`),
 * então nenhuma invalidação existente quebrou.
 *
 * MODO DEMONSTRAÇÃO: com `VITE_ADMISSOES_MOCK=true` a leitura vem do mock
 * (`admissoesMock.ts`) e as ESCRITAS de kit também — em MEMÓRIA, para o
 * formulário e a imagem poderem ser testados. Nada é gravado no banco, e a tela
 * avisa isso no toast em vez de fingir persistência.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  isAdmissoesMockEnabled,
  getMockOnboarding,
  getMockKitsOnboarding,
  mockCriarKit,
  mockAtualizarKit,
  mockConcluirTarefaOnboarding,
  type MockKitOnboarding,
} from '@/mocks/admissoesMock';
import {
  listarJornadas,
  concluirTarefa,
  listarKits,
  criarKit,
  atualizarKit,
  definirAtivoKit,
  type KitOnboarding,
  type KitOnboardingInput,
} from '@/services/onboardingJornadaService';
import type { ColaboradorOnboarding } from '@/components/admissoes/onboardingDerivacoes';

export const CHAVE_JORNADAS = ['onboarding-list'] as const;
export const CHAVE_KITS = ['onboarding-kits'] as const;

/** Modo demonstração ligado? (dev + VITE_ADMISSOES_MOCK=true) */
export function jornadaEmModoDemonstracao(): boolean {
  return isAdmissoesMockEnabled();
}

/**
 * LISTAR JORNADAS — todas as admissões com suas tarefas, ordenadas e com o
 * responsável já resolvido (`profiles`).
 */
export function useJornadas() {
  return useQuery({
    queryKey: CHAVE_JORNADAS,
    queryFn: async (): Promise<ColaboradorOnboarding[]> => {
      if (isAdmissoesMockEnabled()) return getMockOnboarding();
      return listarJornadas();
    },
  });
}

/** CONCLUIR TAREFA — única mutation do domínio de tarefas. */
export function useConcluirTarefa(onSettled?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tarefaId: string) => {
      // MOCK — baixa a tarefa fictícia em memória (nada é gravado no banco).
      if (mockConcluirTarefaOnboarding(tarefaId)) return;
      await concluirTarefa(tarefaId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_JORNADAS }),
    onSettled: () => onSettled?.(),
  });
}

/**
 * LISTAR KITS — `incluirInativos` alimenta o gerenciador. Em modo demonstração
 * devolve o conjunto fictício do estado em memória (respeitando o filtro de
 * status), refletindo imediatamente o que o formulário acabou de salvar.
 */
export function useKits(incluirInativos = false) {
  return useQuery({
    queryKey: [...CHAVE_KITS, incluirInativos],
    queryFn: async (): Promise<KitOnboarding[]> => {
      if (isAdmissoesMockEnabled()) {
        return getMockKitsOnboarding()
          .filter((kit) => incluirInativos || kit.ativo !== false)
          .map(kitDoMock);
      }
      return listarKits(incluirInativos);
    },
  });
}

/** Converte o kit do mock no formato canônico do domínio. */
function kitDoMock(kit: MockKitOnboarding): KitOnboarding {
  return {
    id: kit.id,
    nome: kit.nome,
    itens: [...kit.itens],
    ativo: kit.ativo !== false,
    created_at: kit.created_at ?? null,
  };
}

/**
 * CRIAR PERFIL DE KIT.
 *
 * Em MODO DEMONSTRAÇÃO grava no estado em memória do mock (o kit novo aparece na
 * grade até a página recarregar) — assim o formulário e a imagem continuam
 * testáveis sem tocar no banco.
 */
export function useCriarKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      empresaId,
      entrada,
    }: {
      empresaId: string;
      entrada: KitOnboardingInput;
    }): Promise<KitOnboarding> => {
      const doMock = mockCriarKit(entrada);
      if (doMock) return kitDoMock(doMock);
      return criarKit(empresaId, entrada);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_KITS }),
  });
}

/**
 * ATUALIZAR PERFIL DE KIT (nome, itens, ativo).
 *
 * Em MODO DEMONSTRAÇÃO atualiza o estado em memória do mock (mesma razão acima).
 */
export function useAtualizarKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entrada }: { id: string; entrada: KitOnboardingInput }): Promise<KitOnboarding> => {
      const doMock = mockAtualizarKit(id, entrada);
      if (doMock) return kitDoMock(doMock);
      return atualizarKit(id, entrada);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_KITS }),
  });
}

/** ALTERNAR ATIVO/INATIVO de um perfil de kit. */
export function useAlternarKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => definirAtivoKit(id, ativo),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_KITS }),
  });
}
