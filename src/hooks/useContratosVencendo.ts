import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { contratoTemplateService } from '@/services/contratoTemplateService';
import { safeErrorMessage } from '@/utils/safeError';

export type SeveridadeContrato = 'vencido' | 'critico' | 'atencao' | 'ok';

export interface ContratoVencendoRow {
  id: string;
  empresa_id: string;
  admissao_id: string | null;
  colaborador_id: string | null;
  data_inicio: string | null;
  data_fim: string;
  status: string;
  prorrogado: boolean;
  tipo_contrato: string;
  template_nome: string;
  dias_para_vencer: number;
  severidade: SeveridadeContrato;
}

const SEVERIDADE_ORDER: Record<SeveridadeContrato, number> = {
  vencido: 0,
  critico: 1,
  atencao: 2,
  ok: 3,
};

export function useContratosVencendo() {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();
  const empresaId = empresaAtual?.id;

  const query = useQuery({
    queryKey: ['contratos-vencendo', empresaId],
    queryFn: async (): Promise<ContratoVencendoRow[]> => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('v_contratos_vencendo' as any)
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data_fim', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as ContratoVencendoRow[];
    },
    enabled: !!empresaId,
    staleTime: 60_000,
  });

  const ordenados = useMemo(() => {
    const list = [...(query.data ?? [])];
    return list.sort(
      (a, b) => SEVERIDADE_ORDER[a.severidade] - SEVERIDADE_ORDER[b.severidade],
    );
  }, [query.data]);

  const resumo = useMemo(() => {
    const base = { vencido: 0, critico: 0, atencao: 0, ok: 0, total: 0 };
    for (const r of query.data ?? []) {
      base[r.severidade] += 1;
      base.total += 1;
    }
    return base;
  }, [query.data]);

  const gerarLink = useMutation({
    mutationFn: (contratoId: string) => contratoTemplateService.gerarTokenAssinatura(contratoId),
    onSuccess: async (res) => {
      try {
        await navigator.clipboard.writeText(res.url);
        toast.success('Link de assinatura copiado', {
          description: `Válido até ${new Date(res.expira_em).toLocaleString('pt-BR')}`,
        });
      } catch {
        toast.success('Link gerado', { description: res.url });
      }
      queryClient.invalidateQueries({ queryKey: ['contratos-vencendo'] });
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao gerar link.')),
  });

  return {
    contratos: ordenados,
    resumo,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    gerarLink,
  };
}
