import { supabase } from '@/integrations/supabase/client';

// Parse PostgreSQL INTERVAL string to decimal hours.
// Handles "HH:MM:SS", "D days HH:MM:SS", "D days", "-01:30:00", etc.
function parseIntervalToHours(interval: string | null | undefined): number {
  if (!interval) return 0;
  const str = String(interval);

  let days = 0;
  const dayMatch = str.match(/(-?\d+)\s+days?/);
  if (dayMatch) days = parseInt(dayMatch[1], 10);

  let timeHours = 0;
  const timeMatch = str.match(/(-?\d+):(\d+):(\d+)/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    const s = parseInt(timeMatch[3], 10);
    timeHours = h + m / 60 + s / 3600;
  } else if (!dayMatch) {
    return parseFloat(str) || 0;
  }

  return days * 24 + timeHours;
}

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
      const horas = parseIntervalToHours((item as any).horas);
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
