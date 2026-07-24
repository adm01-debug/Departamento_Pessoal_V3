import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function useBeneficiosColaborador(colaboradorId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['beneficios-colaborador', colaboradorId],
    enabled: !!colaboradorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficios_colaborador')
        .select(`
          *,
          beneficio:beneficios(nome, tipo)
        `)
        .eq('colaborador_id', colaboradorId!);

      if (error) throw error;
      return data;
    },
  });

  const vincularBeneficio = useMutation({
    mutationFn: async (dados: any) => {
      const { data, error } = await supabase
        .from('beneficios_colaborador')
        .insert([{ ...dados, colaborador_id: colaboradorId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficios-colaborador', colaboradorId] });
      toast.success('Benefício vinculado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(safeErrorMessage(error, 'Erro ao vincular benefício.'));
    },
  });

  const desvincularBeneficio = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('beneficios_colaborador')
        .delete()
        .eq('id', id)
        .eq('colaborador_id', colaboradorId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficios-colaborador', colaboradorId] });
      toast.success('Benefício removido!');
    },
    onError: (error: any) => {
      toast.error(safeErrorMessage(error, 'Erro ao remover benefício.'));
    },
  });

  return {
    beneficios: query.data || [],
    isLoading: query.isLoading,
    vincularBeneficio: vincularBeneficio.mutateAsync,
    desvincularBeneficio: desvincularBeneficio.mutateAsync,
  };
}
