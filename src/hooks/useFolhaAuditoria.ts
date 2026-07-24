import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export type AuditoriaEvento = 'CALCULO' | 'CONFERENCIA' | 'ESOCIAL' | 'AJUSTE';
export type AuditoriaSeveridade = 'INFO' | 'AVISO' | 'ERRO' | 'CRITICO';

export interface FolhaAuditoria {
  id: string;
  folha_id?: string;
  colaborador_id?: string;
  tipo_evento: AuditoriaEvento;
  severidade: AuditoriaSeveridade;
  mensagem: string;
  detalhes: any;
  created_at: string;
  criado_por?: string;
}

export function useFolhaAuditoria(folhaId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['folha-auditoria', folhaId],
    enabled: !!folhaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folha_auditoria')
        .select(`
          *,
          colaborador:colaboradores(nome_completo)
        `)
        .eq('folha_id', folhaId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const registrarMutation = useMutation({
    mutationFn: async (evento: Omit<FolhaAuditoria, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('folha_auditoria')
        .insert([evento])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folha-auditoria', folhaId] });
    },
    onError: (error: any) => {
      toast.error(safeErrorMessage(error, 'Erro ao registrar log de auditoria.'));
    },
  });

  return {
    logs: (query.data || []) as (FolhaAuditoria & { colaborador?: { nome_completo: string } })[],
    isLoading: query.isLoading,
    registrarLog: registrarMutation.mutateAsync,
    isRegistrando: registrarMutation.isPending,
  };
}
