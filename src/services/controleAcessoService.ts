import { supabase } from '@/integrations/supabase/client';
export const controleAcessoService = {
  async listar(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('controle_acesso')
      .select('*, colaborador:colaboradores(nome_completo)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  
  async registrar(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('controle_acesso').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de acesso foi retornado.');
    return data;
  
  },
  
  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('controle_acesso').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};

