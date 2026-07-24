import { supabase } from '@/integrations/supabase/client';
export const intervaloService = {
  async listar(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let query = supabase.from('configuracoes_intervalo').select('*').order('nome');
    query = query.eq('empresa_id', empresaId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];

  },
  
  async criar(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('configuracoes_intervalo').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de configuração de intervalo foi retornado.');
    return data;
  
  },
  
  async atualizar(empresaId: string, id: string, d: any): Promise<any> {

    const { data, error } = await supabase.from('configuracoes_intervalo').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de configuração de intervalo foi retornado.');
    return data;

  },

  async excluir(empresaId: string, id: string): Promise<void> {

    const { error } = await supabase.from('configuracoes_intervalo').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },
};

