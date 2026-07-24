import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export type ProgramacaoStatus =
  | 'rascunho'
  | 'sugerido_gestor'
  | 'aprovado_gestor'
  | 'aprovado_rh'
  | 'convertido'
  | 'rejeitado'
  | 'cancelado';

export interface ProgramacaoFerias {
  id: string;
  empresa_id: string;
  colaborador_id: string;
  periodo_aquisitivo_id: string | null;
  ano: number;
  mes_previsto: number;
  dias_previstos: number;
  data_inicio_prevista: string | null;
  data_fim_prevista: string | null;
  status: ProgramacaoStatus;
  observacoes: string | null;
  aprovado_gestor_por: string | null;
  aprovado_gestor_em: string | null;
  aprovado_rh_por: string | null;
  aprovado_rh_em: string | null;
  rejeitado_por: string | null;
  rejeitado_em: string | null;
  rejeitado_motivo: string | null;
  ferias_id: string | null;
  created_at: string;
  updated_at: string;
  colaborador?: {
    id: string;
    nome_completo: string;
    foto_url: string | null;
    departamento_id?: string | null;
  } | null;
  periodo_aquisitivo?: {
    id: string;
    data_inicio: string;
    data_fim: string;
    data_limite_concessao: string | null;
  } | null;
}

export interface ProgramacaoFilters {
  departamentoId?: string;
  status?: ProgramacaoStatus | 'all';
  search?: string;
}

const KEY = (empresaId?: string, ano?: number, filters?: ProgramacaoFilters) =>
  ['ferias-programacao', empresaId, ano, filters] as const;

export function useProgramacaoFerias(ano: number, filters: ProgramacaoFilters = {}) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const query = useQuery({
    queryKey: KEY(empresaId, ano, filters),
    enabled: !!empresaId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('ferias_programacao')
        .select(
          `*,
           colaborador:colaboradores!ferias_programacao_colaborador_id_fkey(id,nome_completo,foto_url,departamento_id),
           periodo_aquisitivo:periodos_aquisitivos(id,data_inicio,data_fim,data_limite_concessao)`
        )
        .eq('empresa_id', empresaId)
        .eq('ano', ano)
        .order('mes_previsto', { ascending: true })
        .limit(500);

      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      let list = (data as ProgramacaoFerias[]) || [];
      if (filters.departamentoId) {
        list = list.filter((p) => p.colaborador?.departamento_id === filters.departamentoId);
      }
      if (filters.search && filters.search.length >= 2) {
        const s = filters.search.toLowerCase();
        list = list.filter((p) => p.colaborador?.nome_completo?.toLowerCase().includes(s));
      }
      return list;
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    empresaId,
  };
}

export function useProgramacaoMutations(ano: number) {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['ferias-programacao', empresaId, ano] });

  const criar = useMutation({
    mutationFn: async (input: {
      colaborador_id: string;
      ano: number;
      mes_previsto: number;
      dias_previstos: number;
      periodo_aquisitivo_id?: string | null;
      observacoes?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from('ferias_programacao')
        .insert({ ...input, empresa_id: empresaId, status: 'sugerido_gestor' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Programação criada');
      invalidate();
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Erro ao criar programação')),
  });

  const mover = useMutation({
    mutationFn: async (input: { id: string; novo_mes: number; nova_data_inicio?: string | null }) => {
      const { data, error } = await (supabase as any).rpc('programacao_ferias_mover', {
        _id: input.id,
        _novo_mes: input.novo_mes,
        _nova_data_inicio: input.nova_data_inicio ?? null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.aviso) toast.warning(row.aviso);
      return row;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['ferias-programacao', empresaId, ano] });
      const keys = qc.getQueriesData<ProgramacaoFerias[]>({
        queryKey: ['ferias-programacao', empresaId, ano],
      });
      keys.forEach(([k, list]) => {
        if (!list) return;
        qc.setQueryData(
          k,
          list.map((p) => (p.id === input.id ? { ...p, mes_previsto: input.novo_mes } : p))
        );
      });
      return { keys };
    },
    onError: (e, _v, ctx) => {
      ctx?.keys?.forEach(([k, prev]) => qc.setQueryData(k, prev));
      toast.error(safeErrorMessage(e, 'Erro ao mover programação'));
    },
    onSettled: invalidate,
  });

  const aprovarGestor = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).rpc('programacao_ferias_aprovar_gestor', { _id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Aprovado pelo gestor');
      invalidate();
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Erro ao aprovar')),
  });

  const aprovarRH = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).rpc('programacao_ferias_aprovar_rh', { _id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Aprovado pelo RH');
      invalidate();
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Erro ao aprovar RH')),
  });

  const rejeitar = useMutation({
    mutationFn: async (input: { id: string; motivo: string }) => {
      const { data, error } = await (supabase as any).rpc('programacao_ferias_rejeitar', {
        _id: input.id,
        _motivo: input.motivo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Programação rejeitada');
      invalidate();
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Erro ao rejeitar')),
  });

  const converter = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).rpc('programacao_ferias_converter', { _id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Convertido em solicitação de férias');
      invalidate();
      qc.invalidateQueries({ queryKey: ['ferias'] });
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Erro ao converter')),
  });

  return { criar, mover, aprovarGestor, aprovarRH, rejeitar, converter };
}
