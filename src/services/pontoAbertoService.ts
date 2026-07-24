import { supabase } from '@/integrations/supabase/client';

export const pontoAbertoService = {
  async listar(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let query = supabase.from('pontos_abertos').select('*');
    query = query.eq('empresa_id', empresaId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
};
