import { supabase } from '@/integrations/supabase/client';
export const contratoService = {
  async listar(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let query = supabase.from('contratos').select('*, colaborador:colaboradores(nome_completo)').order('data_inicio', { ascending: false });
    query = query.eq('empresa_id', empresaId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];

  },
  
  async buscarPorId(id: string, empresaId: string): Promise<any | null> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('contratos').select('*').eq('id', id).eq('empresa_id', empresaId).maybeSingle();
    if (error) throw error;
    return data;

  },

  async buscarPorColaborador(colaboradorId: string, empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('contratos').select('*').eq('colaborador_id', colaboradorId).eq('empresa_id', empresaId).order('data_inicio', { ascending: false });
    if (error) throw error;
    return data || [];

  },
  
  async criar(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('contratos').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de contrato foi retornado.');
    return data;
  
  },
  
  async atualizar(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('contratos').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de contrato foi retornado.');
    return data;

  },

  async encerrar(id: string, motivo: string, empresaId: string): Promise<any> {
    return this.atualizar(id, { status: 'encerrado', observacoes: motivo }, empresaId);
  },

  async renovar(id: string, novaDataFim: string, empresaId: string): Promise<any> {
    return this.atualizar(id, { data_fim: novaDataFim, status: 'ativo' }, empresaId);
  },
};

