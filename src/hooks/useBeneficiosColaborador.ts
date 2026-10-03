import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Insertable } from '@/integrations/supabase/database.types';
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
        .select(
          `
          *,
          tipo_beneficio:tipos_beneficio(nome, codigo)
        `
        )
        .eq('colaborador_id', colaboradorId!);

      if (error) throw error;
      return data;
    },
  });

  const vincularBeneficio = useMutation({
    mutationFn: async (dados: Omit<Insertable<'beneficios_colaborador'>, 'colaborador_id'>) => {
      const { data, error } = await supabase
        .from('beneficios_colaborador')
        .insert([{ ...dados, colaborador_id: colaboradorId! }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficios-colaborador', colaboradorId] });
      toast.success('Benefício vinculado com sucesso!');
    },
    onError: (error) => {
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
    onError: (error) => {
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
