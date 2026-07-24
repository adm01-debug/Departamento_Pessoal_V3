/**
 * useAlertasPagamentoD2 — CLT Art. 145.
 *
 * Consulta a view `v_ferias_alerta_pagamento_d2` para exibir, ao RH, as
 * férias com pagamento pendente classificadas por severidade legal:
 *   ok | atencao (≤5d) | critico (≤2d, prazo Art. 145) | violacao_grave (já iniciada)
 *
 * Também expõe a mutação `confirmarPagamento` que chama a RPC
 * `registrar_pagamento_ferias` (SECURITY DEFINER, restrita a RH/admin da
 * empresa dona da férias). O trigger de banco garante que, sem essa
 * confirmação, a férias não pode transitar para `em_gozo` — fecha o gap
 * probatório do Art. 145 CLT.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { toast } from 'sonner';

export type SeveridadePagamento = 'ok' | 'atencao' | 'critico' | 'violacao_grave';

export interface AlertaPagamentoD2 {
  id: string;
  empresa_id: string;
  colaborador_id: string;
  data_inicio: string;
  data_pagamento: string | null;
  pagamento_confirmado_em: string | null;
  status: string;
  dias_ate_inicio: number;
  severidade: SeveridadePagamento;
}

export function useAlertasPagamentoD2() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  return useQuery({
    queryKey: ['ferias', 'alertas-pagamento-d2', empresaId],
    enabled: !!empresaId,
    staleTime: 60_000,
    queryFn: async (): Promise<AlertaPagamentoD2[]> => {
      const { data, error } = await supabase
        .from('v_ferias_alerta_pagamento_d2')
        .select('*')
        .eq('empresa_id', empresaId!)
        .neq('severidade', 'ok')
        .order('dias_ate_inicio', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as AlertaPagamentoD2[];
    },
  });
}

export interface ConfirmarPagamentoInput {
  feriasId: string;
  valor: number;
  comprovantePath?: string | null;
}

export function useConfirmarPagamentoFerias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ feriasId, valor, comprovantePath }: ConfirmarPagamentoInput) => {
      const { data, error } = await supabase.rpc('registrar_pagamento_ferias', {
        p_ferias_id: feriasId,
        p_valor: valor,
        p_comprovante_path: comprovantePath ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Pagamento de férias confirmado (Art. 145 CLT).');
      qc.invalidateQueries({ queryKey: ['ferias'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Falha ao confirmar pagamento';
      toast.error(msg);
    },
  });
}
