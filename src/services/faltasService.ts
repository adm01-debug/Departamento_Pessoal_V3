import { supabase } from '@/integrations/supabase/client';
export const faltasService = {
  async listar(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = (supabase as any).from('faltas').select('*, colaborador:colaboradores(nome_completo)').order('data', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },

  async buscarPorColaborador(colaboradorId: string, empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('faltas')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async criar(d: any): Promise<any> {
    const { data, error } = await (supabase as any).from('faltas').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de falta foi retornado.');
    return data;
  },

  async atualizar(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('faltas')
      .update(d)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de falta foi retornado.');
    return data;
  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await (supabase as any)
      .from('faltas')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);
    if (error) throw error;
  },
};
