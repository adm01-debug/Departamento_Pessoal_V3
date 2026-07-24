import { supabase } from '@/integrations/supabase/client';
export const workflowService = {
  async listarDefinicoes(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('workflows_definicoes').select('*').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },
  
  async criarDefinicao(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('workflows_definicoes').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de workflow foi retornado.');
    return data;
  
  },
  
  async atualizarDefinicao(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('workflows_definicoes').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de workflow foi retornado.');
    return data;

  },

  async excluirDefinicao(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('workflows_definicoes').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },
  
  async listarEtapas(workflowId: string): Promise<any[]> {
    
    const { data, error } = await supabase.from('workflows_etapas').select('*').eq('workflow_id', workflowId).order('ordem');
    if (error) throw error;
    return data || [];
  
  },
  
  async criarEtapa(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('workflows_etapas').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de etapa foi retornado.');
    return data;
  
  },
  
  async excluirEtapa(workflowId: string, id: string): Promise<void> {
    if (!workflowId) throw new Error('workflow_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('workflows_etapas').delete().eq('id', id).eq('workflow_id', workflowId);
    if (error) throw error;

  },
  
  async listarExecucoes(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('workflows_execucoes').select('*, workflow:workflows_definicoes(nome, tipo)').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },
  
  async criarExecucao(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('workflows_execucoes').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de execução foi retornado.');
    return data;
  
  },
  
  async atualizarExecucao(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('workflows_execucoes').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de execução foi retornado.');
    return data;

  },
  
  async registrarHistorico(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('workflows_historico').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de histórico foi retornado.');
    return data;
  
  },
};

