import { supabase } from '@/integrations/supabase/client';
export const horaExtraService = {
  async listar(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let query = supabase
      .from('solicitacoes_hora_extra')
      .select('*, colaborador:colaboradores(nome_completo)')
      .order('created_at', { ascending: false });
    query = query.eq('empresa_id', empresaId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];

  },
  
  async criar(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('solicitacoes_hora_extra').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de solicitação de hora extra foi retornado.');
    return data;
  
  },
  
  async aprovar(id: string, aprovadoPor: string, empresaId: string, obs?: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('solicitacoes_hora_extra')
      .update({ status: 'aprovada', aprovado_por: aprovadoPor, aprovado_em: new Date().toISOString(), observacoes_aprovador: obs })
      .eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de solicitação foi retornado.');
    return data;

  },

  async rejeitar(id: string, aprovadoPor: string, empresaId: string, obs?: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('solicitacoes_hora_extra')
      .update({ status: 'rejeitada', aprovado_por: aprovadoPor, aprovado_em: new Date().toISOString(), observacoes_aprovador: obs })
      .eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de solicitação foi retornado.');
    return data;

  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('solicitacoes_hora_extra').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },
};

