/**
 * useReconciliacaoFolha — reconciliação Férias ↔ Folha.
 *
 * Consulta `v_ferias_folha_reconciliacao` para expor, ao RH, quais
 * férias aprovadas ainda apresentam divergência entre as rubricas
 * esperadas (com base nos valores calculados) e as efetivamente
 * geradas em `eventos_variaveis`. Fecha o loop entre aprovação e
 * lançamento na folha do mês do gozo.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';

export type SituacaoReconciliacao = 'ok' | 'divergente' | 'pendente_envio';

export interface ReconciliacaoRow {
  ferias_id: string;
  empresa_id: string;
  colaborador_id: string;
  colaborador_nome: string | null;
  data_inicio: string;
  data_fim: string;
  status: string;
  enviado_contabilidade: boolean | null;
  competencia: string;
  rubricas_esperadas: number;
  rubricas_geradas: number;
  situacao: SituacaoReconciliacao;
}

export function useReconciliacaoFolha() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  return useQuery({
    queryKey: ['ferias', 'reconciliacao-folha', empresaId],
    enabled: !!empresaId,
    staleTime: 60_000,
    queryFn: async (): Promise<ReconciliacaoRow[]> => {
      const { data, error } = await supabase
        .from('v_ferias_folha_reconciliacao' as any)
        .select('*')
        .eq('empresa_id', empresaId!)
        .neq('situacao', 'ok')
        .order('competencia', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as ReconciliacaoRow[];
    },
  });
}
