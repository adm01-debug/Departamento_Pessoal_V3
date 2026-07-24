import { supabase } from '@/integrations/supabase/client';
export const episService = {
  async listar(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any).from('epis').select('*').order('nome');
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },
  
  async criar(d: any): Promise<any> {
    
    const { data, error } = await (supabase as any).from('epis').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de EPI foi retornado.');
    return data;
  
  },
  
  async atualizar(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any).from('epis').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de EPI foi retornado.');
    return data;

  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await (supabase as any).from('epis').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },
};

export const episEntregasService = {
  async listar(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any).from('epis_entregas').select('*, epi:epis(nome, ca), colaborador:colaboradores(nome_completo)').order('data_entrega', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },
  
  async buscarPorColaborador(colaboradorId: string, empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any).from('epis_entregas').select('*, epi:epis(nome, ca)').eq('colaborador_id', colaboradorId).eq('empresa_id', empresaId).order('data_entrega', { ascending: false });
    if (error) throw error;
    return data || [];

  },
  
  async criar(d: any): Promise<any> {
    
    const { data, error } = await (supabase as any).from('epis_entregas').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de entrega de EPI foi retornado.');
    return data;
  
  },
  
  async registrarDevolucao(id: string, dataDevolucao: string, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any).from('epis_entregas').update({ data_devolucao: dataDevolucao }).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de devolução de EPI foi retornado.');
    return data;

  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await (supabase as any).from('epis_entregas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },
};

