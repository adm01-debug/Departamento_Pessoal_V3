import { supabase, type QueryBuilderType } from '@/integrations/supabase/client';
import type { Insertable, Tables } from '@/integrations/supabase/database.types';

export const ajustesPontoService = {
  listar: async (empresaId: string): Promise<Tables<'ajustes_ponto'>[]> => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (
      supabase
        .from('ajustes_ponto')
        .select('*, colaborador:colaboradores!inner(nome_completo, empresa_id)') as unknown as QueryBuilderType
    )
      .eq('colaborador.empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Tables<'ajustes_ponto'>[] | null) || [];
  },
  criar: async (d: Insertable<'ajustes_ponto'>): Promise<void> => {
    const { error } = await supabase.from('ajustes_ponto').insert(d);
    if (error) throw error;
  },
  aprovar: async (colaboradorId: string, id: string, userId: string): Promise<void> => {
    if (!colaboradorId) throw new Error('colaborador_id obrigatório para isolamento de tenant');
    const { error } = await supabase
      .from('ajustes_ponto')
      .update({ status: 'aprovado', aprovado_por: userId, aprovado_em: new Date().toISOString() })
      .eq('id', id)
      .eq('colaborador_id', colaboradorId);
    if (error) throw error;
  },
};

// `periodos_ponto` é deliberadamente "system-level" (comentário na migration
// 20260315223732_...sql): um único calendário de competências compartilhado
// por todas as empresas, sem coluna empresa_id. RLS permite leitura a
// qualquer authenticated e restringe escrita a admin (migration
// 20260317222200_...sql). O filtro `.eq('empresa_id', ...)` que existia
// aqui antes referenciava uma coluna inexistente — sob a tipagem antiga
// (`any`/sem tipos) isso compilava, mas o PostgREST teria recusado a query
// em runtime; não há chamador real hoje (0 usos fora deste arquivo), então
// nunca foi exercitado. Corrigido para o desenho real da tabela em vez de
// forçar um parâmetro de tenant que não existe aqui.
export const periodosPontoService = {
  listar: async (): Promise<Tables<'periodos_ponto'>[]> => {
    const { data, error } = await supabase
      .from('periodos_ponto')
      .select('*')
      .order('data_inicio', { ascending: false });
    if (error) throw error;
    return (data as Tables<'periodos_ponto'>[] | null) || [];
  },
  criar: async (d: Insertable<'periodos_ponto'>): Promise<void> => {
    const { error } = await supabase.from('periodos_ponto').insert(d);
    if (error) throw error;
  },
  fechar: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('periodos_ponto')
      .update({ status: 'fechado', fechado_em: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
