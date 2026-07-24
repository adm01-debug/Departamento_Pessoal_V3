import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feriasService } from '@/services';
import { useEmpresas } from './useEmpresas';
import { auditLogger } from '@/utils/auditLogger';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function useFerias(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['ferias', empresaId, params],
    queryFn: async () => {
      return await feriasService.listSolicitacoes(empresaId!, params);
    },
    enabled: !!empresaId,
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await feriasService.criar({ ...data, empresa_id: empresaId });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ferias', empresaId] });
      qc.invalidateQueries({ queryKey: ['periodos-aquisitivos'] });
      auditLogger.log({
        tabela: 'ferias',
        registro_id: data.id,
        acao: 'INSERT',
        dados_novos: data
      });
      toast.success('Solicitação de férias criada com sucesso');
    },
    onError: (error: any) => toast.error(safeErrorMessage(error, 'Erro ao criar solicitação de férias.')),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await feriasService.atualizar(id, data);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['ferias', empresaId] });
      qc.invalidateQueries({ queryKey: ['periodos-aquisitivos'] });
      auditLogger.log({
        tabela: 'ferias',
        registro_id: variables.id,
        acao: 'UPDATE',
        dados_novos: variables.data
      });
      toast.success('Solicitação de férias atualizada');
    },
    onError: (error: any) => toast.error(safeErrorMessage(error, 'Erro ao atualizar férias.')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await feriasService.excluir(id);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['ferias', empresaId] });
      qc.invalidateQueries({ queryKey: ['periodos-aquisitivos'] });
      auditLogger.log({
        tabela: 'ferias',
        registro_id: id,
        acao: 'DELETE'
      });
      toast.success('Solicitação de férias excluída');
    },
    onError: (error: any) => toast.error(safeErrorMessage(error, 'Erro ao excluir férias.')),
  });

  const aprovarGestorMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId?: string }) => {
      return await feriasService.aprovarGestor(id, empresaId!, userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ferias', empresaId] });
      toast.success('Férias aprovadas pelo gestor');
    },
    onError: (error: any) => toast.error(safeErrorMessage(error, 'Erro ao aprovar férias.')),
  });

  const aprovarRHMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId?: string }) => {
      return await feriasService.aprovarRH(id, empresaId!, userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ferias', empresaId] });
      toast.success('Férias aprovadas pelo RH e finalizadas');
    },
    onError: (error: any) => toast.error(safeErrorMessage(error, 'Erro ao aprovar férias.')),
  });

  return {
    ferias: query.data?.data || [],
    totalCount: query.data?.count || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    aprovarGestor: aprovarGestorMutation.mutateAsync,
    aprovarRH: aprovarRHMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

