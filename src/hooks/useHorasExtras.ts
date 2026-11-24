import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { horaExtraService } from '@/services/horaExtraService';
import { useEmpresas } from './useEmpresas';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function useHorasExtras() {
  const { empresaAtual } = useEmpresas();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const empresaId = empresaAtual?.id;

  const query = useQuery({
    queryKey: ['solicitacoes_hora_extra', empresaId],
    queryFn: () => horaExtraService.listar(empresaId!),
    enabled: !!empresaId,
  });

  const criarMutation = useMutation({
    mutationFn: (data: any) => horaExtraService.criar({ ...data, empresa_id: empresaId, created_by: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes_hora_extra'] });
      toast.success('Solicitação de hora extra criada');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na operação de hora extra.')),
  });

  const aprovarMutation = useMutation({
    mutationFn: ({ id, obs }: { id: string; obs?: string }) => horaExtraService.aprovar(id, user?.id || '', empresaId!, obs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes_hora_extra'] });
      toast.success('Hora extra aprovada');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na operação de hora extra.')),
  });

  const rejeitarMutation = useMutation({
    mutationFn: ({ id, obs }: { id: string; obs?: string }) => horaExtraService.rejeitar(id, user?.id || '', empresaId!, obs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes_hora_extra'] });
      toast.success('Hora extra rejeitada');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na operação de hora extra.')),
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => horaExtraService.excluir(id, empresaId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes_hora_extra'] });
      toast.success('Solicitação excluída');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na operação de hora extra.')),
  });

  return {
    solicitacoes: query.data || [],
    isLoading: query.isLoading,
    criar: criarMutation.mutateAsync,
    aprovar: aprovarMutation.mutateAsync,
    rejeitar: rejeitarMutation.mutateAsync,
    excluir: excluirMutation.mutateAsync,
    refetch: query.refetch,
  };
}
