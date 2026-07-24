import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contratoService } from '@/services/contratoService';
import { useEmpresas } from './useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function useContratos() {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();
  const empresaId = empresaAtual?.id;

  const query = useQuery({
    queryKey: ['contratos', empresaId],
    queryFn: () => contratoService.listar(empresaId!),
    enabled: !!empresaId,
  });

  const criarMutation = useMutation({
    mutationFn: (data: any) => contratoService.criar({ ...data, empresa_id: empresaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato criado');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro ao criar contrato.')),
  });

  return {
    contratos: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    criar: criarMutation.mutateAsync,
    refetch: query.refetch,
  };
}
