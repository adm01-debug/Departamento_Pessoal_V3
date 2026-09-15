import { supabase, type QueryBuilderType } from '@/integrations/supabase/client';
import type { Insertable, Tables, Updatable } from '@/integrations/supabase/database.types';

const ensure = <T>(d: T | null, e: string): T => {
  if (!d) throw new Error(`Nenhum registro de ${e} retornado.`);
  return d;
};

export const bancoHorasConfigService = {
  async buscar(empresaId: string): Promise<Tables<'banco_horas_config'> | null> {
    const { data, error } = await supabase
      .from('banco_horas_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async salvar(d: Insertable<'banco_horas_config'>): Promise<Tables<'banco_horas_config'>> {
    const existing = d.empresa_id ? await bancoHorasConfigService.buscar(d.empresa_id) : null;
    if (existing) {
      const { data, error } = await (
        supabase.from('banco_horas_config').update(d as Updatable<'banco_horas_config'>) as unknown as QueryBuilderType
      )
        .eq('id', existing.id)
        .eq('empresa_id', d.empresa_id as string)
        .select()
        .maybeSingle();
      if (error) throw error;
      return ensure(data as Tables<'banco_horas_config'> | null, 'configuração banco de horas');
    }
    const { data, error } = await supabase.from('banco_horas_config').insert(d).select().maybeSingle();
    if (error) throw error;
    return ensure(data, 'configuração banco de horas');
  },
};
