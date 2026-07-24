import { supabase } from '@/integrations/supabase/client';

export const ajustesPontoService = {
  listar: async (empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('ajustes_ponto')
      .select('*, colaborador:colaboradores!inner(nome_completo, empresa_id)')
      .eq('colaborador.empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('ajustes_ponto').insert(d);
    if (error) throw error;
  },
  aprovar: async (colaboradorId: string, id: string, userId: string) => {
    if (!colaboradorId) throw new Error('colaborador_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('ajustes_ponto').update({ status: 'aprovado', aprovado_por: userId, aprovado_em: new Date().toISOString() }).eq('id', id).eq('colaborador_id', colaboradorId);
    if (error) throw error;
  },
};

export const periodosPontoService = {
  listar: async (empresaId?: string) => {
    let q: any = supabase.from('periodos_ponto').select('*').order('data_inicio', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('periodos_ponto').insert(d);
    if (error) throw error;
  },
  fechar: async (empresaId: string, id: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await (supabase as any).from('periodos_ponto').update({ status: 'fechado', fechado_em: new Date().toISOString() }).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};
