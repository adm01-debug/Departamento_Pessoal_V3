import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admissaoService } from '@/services';
import { useEmpresas } from './useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
// MOCK VISUAL — ver src/mocks/admissoesMock.ts
import { isAdmissoesMockEnabled, getMockAdmissoes } from '@/mocks/admissoesMock';

export function useAdmissoes() {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();
  const empresaId = empresaAtual?.id;
  // MOCK VISUAL — ver src/mocks/admissoesMock.ts (dev + VITE_ADMISSOES_MOCK=true).
  const mockAtivo = isAdmissoesMockEnabled();

  const query = useQuery<any[]>({
    queryKey: ['admissoes', empresaId, mockAtivo ? 'mock' : 'real'],
    queryFn: async () => (mockAtivo ? getMockAdmissoes() : admissaoService.listarAdmissoes(empresaId!)),
    // Guard: evita fetch sem tenant (possível vazamento cross-empresa via RLS frouxa).
    // No modo mock não há fetch (apenas a lista fictícia em memória).
    enabled: mockAtivo || !!empresaId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admissoes', empresaId] });

  const criarMutation = useMutation({
    mutationFn: (data: any) => admissaoService.criar({ ...data, empresa_id: empresaId }),
    onSuccess: () => {
      void invalidate();
      toast.success('Admissão criada com sucesso');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na operação de admissão.')),
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => admissaoService.atualizar(id, data, empresaId!),
    onSuccess: () => {
      void invalidate();
      toast.success('Admissão atualizada');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na operação de admissão.')),
  });

  return {
    admissoes: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    criar: criarMutation.mutateAsync,
    atualizar: atualizarMutation.mutateAsync,
    refetch: query.refetch,
  };
}
