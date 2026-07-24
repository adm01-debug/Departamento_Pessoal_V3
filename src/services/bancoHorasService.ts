import { supabase } from '@/integrations/supabase/client';

export const bancoHorasService = {
  async listarPorColaborador(colaboradorId: string, empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('banco_horas')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getSaldo(colaboradorId: string, empresaId: string): Promise<number> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('banco_horas')
      .select('tipo, quantidade_horas')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId);
    if (error) throw error;
    if (!data) return 0;
    return data.reduce((saldo, item) => {
      const horas = parseFloat((item as any).quantidade_horas) || 0;
      return (item as any).tipo === 'credito' ? saldo + horas : saldo - horas;
    }, 0);
  },

  async registrar(d: any): Promise<any> {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('banco_horas').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
};
