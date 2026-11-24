import { supabase } from '@/integrations/supabase/client';
export const provisaoService = {
  async list(empresaId: string, competencia?: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let query = supabase
      .from('provisoes_mensais')
      .select('*, colaborador:colaboradores(nome_completo, salario_base)')
      .order('competencia', { ascending: false });

    query = query.eq('empresa_id', empresaId);
    if (competencia) query = query.eq('competencia', competencia);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];

  },
  
  async calcular(empresaId: string, competencia: string): Promise<any> {
    
    const { data, error } = await supabase.functions.invoke('calcular-provisoes', {
      body: { empresa_id: empresaId, competencia }
    });
    if (error) throw error;
    return data;
  
  }
};

