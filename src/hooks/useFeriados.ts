import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function useFeriados() {
  const { empresaAtual } = useEmpresa();
  const queryClient = useQueryClient();

  const { data: feriados = [], isLoading } = useQuery({
    queryKey: ['feriados', empresaAtual?.id],
    queryFn: async () => {
      let query = supabase.from('feriados').select('*').order('data');
      if (empresaAtual?.id) query = query.or(`empresa_id.eq.${empresaAtual.id},empresa_id.is.null`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const criarFeriado = useMutation({
    mutationFn: async (feriado: { nome: string; data: string; tipo: string }) => {
      const insertData: any = {
        data: feriado.data,
        descricao: feriado.nome,
        tipo: feriado.tipo,
        empresa_id: feriado.tipo === 'empresa' ? empresaAtual?.id : null,
      };
      const { error } = await supabase.from('feriados').insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast.success('Feriado cadastrado!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar feriado.')),
  });

  const excluirFeriado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feriados').delete().eq('id', id).eq('empresa_id', empresaAtual!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast.success('Feriado excluído');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar feriado.')),
  });

  return { feriados, isLoading, criarFeriado, excluirFeriado };
}
