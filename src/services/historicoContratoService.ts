import { supabase } from '@/integrations/supabase/client';
import type { Tables, Insertable } from '@/integrations/supabase/database.types';

export const historicoContratoService = {
  async listar(colaboradorId: string, empresaId: string): Promise<Tables<'historico_contratos'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('historico_contratos')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('data_inicio', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async criar(d: Insertable<'historico_contratos'>): Promise<Tables<'historico_contratos'>> {
    const { data, error } = await supabase.from('historico_contratos').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de histórico de contrato foi retornado.');
    return data;
  },

  async excluir(empresaId: string, id: string): Promise<void> {
    const { error } = await supabase.from('historico_contratos').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};
