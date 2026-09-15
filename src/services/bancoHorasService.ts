import { supabase } from '@/integrations/supabase/client';
import { parsePgIntervalToHours } from '@/utils/pgInterval';
import type { Tables, Insertable } from '@/integrations/supabase/database.types';

export const bancoHorasService = {
  async listarPorColaborador(colaboradorId: string, empresaId: string): Promise<Tables<'banco_horas'>[]> {
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

  /**
   * Saldo em horas decimais. A coluna `horas` é do tipo `interval` no Postgres —
   * o valor chega como texto ("1 day 02:00:00"), nunca como número, por isso o
   * parsing dedicado. Tipos desconhecidos são tratados como débito (conservador).
   */
  async getSaldo(colaboradorId: string, empresaId: string): Promise<number> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('banco_horas')
      .select('tipo, horas')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId);
    if (error) throw error;
    if (!data) return 0;
    return data.reduce((saldo, item) => {
      const horas = parsePgIntervalToHours(item.horas);
      return item.tipo === 'credito' ? saldo + horas : saldo - horas;
    }, 0);
  },

  async registrar(d: Insertable<'banco_horas'>): Promise<Tables<'banco_horas'> | null> {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('banco_horas').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
};
