import { supabase } from '@/integrations/supabase/client';
export const comunicacaoService = {
  async listarComunicados(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('comunicados').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];

  },
  
  async criarComunicado(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('comunicados').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de comunicado foi retornado.');
    return data;
  
  },
  
  async atualizarComunicado(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('comunicados').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de comunicado foi retornado.');
    return data;

  },

  async excluirComunicado(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('comunicados').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },
  
  async marcarLido(comunicadoId: string, usuarioId: string): Promise<any> {
    
    const { data, error } = await supabase.from('comunicados_leituras').insert({ comunicado_id: comunicadoId, usuario_id: usuarioId }).select().maybeSingle();
    if (error) throw error;
    return data;
  
  },
  
  async listarDenuncias(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('canal_etica').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];

  },
  
  async criarDenuncia(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('canal_etica').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de denúncia foi retornado.');
    return data;
  
  },
  
  async atualizarDenuncia(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('canal_etica').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de denúncia foi retornado.');
    return data;

  },
};

