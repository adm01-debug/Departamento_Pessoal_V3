import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { historicoContratoService } from '@/services/historicoContratoService';
import { useEmpresas } from './useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function useHistoricoContratos(colaboradorId: string) {
  const queryClient = useQueryClient();
  const { empresaAtual } = useEmpresas();

  const query = useQuery({
    queryKey: ['historico_contratos', colaboradorId, empresaAtual?.id],
    queryFn: async () => {
      return await historicoContratoService.listar(colaboradorId, empresaAtual!.id);
    },
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });

  const criarMutation = useMutation({
    mutationFn: async (data: any) => {
      return await historicoContratoService.criar({ ...data, colaborador_id: colaboradorId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico_contratos', colaboradorId] });
      toast.success('Alteração contratual registrada');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na operação contratual.')),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      return await historicoContratoService.excluir(empresaAtual!.id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico_contratos', colaboradorId] });
      toast.success('Registro excluído');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na operação contratual.')),
  });

  return {
    historico: query.data || [],
    isLoading: query.isLoading,
    criar: criarMutation.mutateAsync,
    excluir: excluirMutation.mutateAsync,
  };
}

