import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';
import { admissaoService } from '@/services';
import { useEmpresas } from './useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function useAdmissoes() {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();
  const empresaId = empresaAtual?.id;

  const query = useQuery<Tables<'admissoes'>[]>({
    queryKey: ['admissoes', empresaId],
    queryFn: () => admissaoService.listarAdmissoes(empresaId!),
    // Guard: evita fetch sem tenant (possível vazamento cross-empresa via RLS frouxa).
    enabled: !!empresaId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admissoes', empresaId] });

  const criarMutation = useMutation({
    mutationFn: (data: Insertable<'admissoes'>) => admissaoService.criar({ ...data, empresa_id: empresaId }),
    onSuccess: () => {
      void invalidate();
      toast.success('Admissão criada com sucesso');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na operação de admissão.')),
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Updatable<'admissoes'> }) =>
      admissaoService.atualizar(id, data, empresaId!),
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
