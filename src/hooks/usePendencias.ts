import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

export interface Pendencia {
  id: string;
  tipo: 'ferias' | 'assinaturas' | 'ponto' | 'documentos';
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta';
  status: 'pendente' | 'em_analise' | 'concluido';
  criado_at: string;
  referencia_id?: string;
}

export function usePendencias(empresaId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pendencias', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pendencias')
        .select('*')
        .eq('empresa_id', empresaId!)
        .order('criado_at', { ascending: false });

      if (error) throw error;
      return data as Pendencia[];
    },
  });

  const { toast } = useToast();
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Pendencia['status'] }) => {
      const { error } = await supabase
        .from('pendencias')
        .update({ status, atualizado_at: new Date().toISOString() })
        .eq('id', id)
        .eq('empresa_id', empresaId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendencias', empresaId] });
      toast({ title: "Sucesso", description: "Status da pendência atualizado." });
    },
    onError: (error) => {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível atualizar a pendência.", variant: "destructive" });
    }
  });

  return { ...query, updateStatus };
}
