import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feriasService } from '@/services';
import { useAuth } from '@/contexts';
import { useEmpresas } from './useEmpresas';
import { toast } from 'sonner';
import { useNotificacoes } from './useNotificacoes';
import { safeErrorMessage } from '@/utils/safeError';

export function useFeriasAprovacao() {
  const { user } = useAuth();
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const qc = useQueryClient();
  const { criarNotificacao } = useNotificacoes();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['ferias', empresaId] });

  const aprovarGestor = useMutation({
    mutationFn: (id: string) => feriasService.aprovarGestor(id, empresaId!, user?.id),
    onSuccess: (_, id) => {
      invalidate();
      criarNotificacao({
        tipo: 'ferias_aprovada',
        titulo: 'Férias Aprovadas pelo Gestor',
        mensagem: 'Uma solicitação de férias foi aprovada pelo gestor e agora aguarda o RH.',
        entidade_tipo: 'ferias',
        entidade_id: id
      });
      toast.success('Aprovação do gestor registrada com sucesso');
    },
    onError: (error: any) => toast.error(safeErrorMessage(error, 'Erro ao aprovar férias.')),
  });

  const aprovarRH = useMutation({
    mutationFn: (id: string) => feriasService.aprovarRH(id, empresaId!, user?.id),
    onSuccess: (_, id) => {
      invalidate();
      criarNotificacao({
        tipo: 'ferias_aprovada',
        titulo: 'Férias Confirmadas!',
        mensagem: 'O RH aprovou as férias. O processo está concluído.',
        entidade_tipo: 'ferias',
        entidade_id: id
      });
      toast.success('Aprovação do RH registrada. Férias confirmadas!');
    },
    onError: (error: any) => toast.error(safeErrorMessage(error, 'Erro ao aprovar férias.')),
  });

  const enviarContabilidade = useMutation({
    mutationFn: (id: string) => feriasService.enviarContabilidade(id, empresaId!, user?.id),
    onSuccess: () => {
      invalidate();
      toast.success('Solicitação enviada para a contabilidade');
    },
    onError: (error: any) => toast.error(safeErrorMessage(error, 'Erro ao enviar para contabilidade.')),
  });

  const rejeitar = useMutation({
    mutationFn: (id: string) => feriasService.rejeitar(id, empresaId!),
    onSuccess: (_, id) => {
      invalidate();
      criarNotificacao({
        tipo: 'ferias_rejeitada',
        titulo: 'Férias Rejeitadas',
        mensagem: 'Uma solicitação de férias foi rejeitada.',
        entidade_tipo: 'ferias',
        entidade_id: id
      });
      toast.warning('Solicitação de férias rejeitada');
    },
    onError: (error: any) => toast.error(safeErrorMessage(error, 'Erro ao rejeitar férias.')),
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => feriasService.cancelar(id, empresaId!, user?.id),
    onSuccess: () => {
      invalidate();
      toast.info('Solicitação de férias cancelada');
    },
    onError: (error: any) => toast.error(safeErrorMessage(error, 'Erro ao cancelar férias.')),
  });

  return {
    aprovarGestor: aprovarGestor.mutateAsync,
    aprovarRH: aprovarRH.mutateAsync,
    enviarContabilidade: enviarContabilidade.mutateAsync,
    rejeitar: rejeitar.mutateAsync,
    cancelar: cancelar.mutateAsync,
    isLoading: 
      aprovarGestor.isPending || 
      aprovarRH.isPending || 
      enviarContabilidade.isPending || 
      rejeitar.isPending || 
      cancelar.isPending,
  };
}
