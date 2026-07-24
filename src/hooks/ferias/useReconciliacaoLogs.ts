import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReconciliacaoLog {
  id: string;
  executado_em: string;
  verificadas: number;
  corrigidas: number;
  restantes: number;
  duracao_ms: number;
}

export function useReconciliacaoLogs(limit = 10) {
  return useQuery({
    queryKey: ['ferias', 'reconciliacao-logs', limit],
    queryFn: async (): Promise<ReconciliacaoLog[]> => {
      const { data, error } = await supabase
        .from('ferias_reconciliacao_logs')
        .select('id, executado_em, verificadas, corrigidas, restantes, duracao_ms')
        .order('executado_em', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ReconciliacaoLog[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
