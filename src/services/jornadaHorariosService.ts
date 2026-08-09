import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type JornadaHorarioRow = Tables<'jornadas_horarios'>;

export const jornadaHorariosService = {
  async listar(jornadaId: string): Promise<JornadaHorarioRow[]> {
    const { data, error } = await supabase.from('jornadas_horarios').select('*').eq('jornada_id', jornadaId).order('dia_semana');
    if (error) throw error;
    return data || [];
  },

  async criar(d: TablesInsert<'jornadas_horarios'>): Promise<JornadaHorarioRow> {
    const { data, error } = await supabase.from('jornadas_horarios').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de horário de jornada foi retornado.');
    return data;
  },

  async atualizar(jornadaId: string, id: string, d: TablesUpdate<'jornadas_horarios'>): Promise<JornadaHorarioRow> {
    const { data, error } = await supabase.from('jornadas_horarios').update(d).eq('id', id).eq('jornada_id', jornadaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de horário de jornada foi retornado.');
    return data;
  },

  async excluir(jornadaId: string, id: string): Promise<void> {
    const { error } = await supabase.from('jornadas_horarios').delete().eq('id', id).eq('jornada_id', jornadaId);
    if (error) throw error;
  },

  async salvarGrade(jornadaId: string, horarios: TablesInsert<'jornadas_horarios'>[]): Promise<JornadaHorarioRow[]> {
    try {
      if (horarios.length === 0) {
        await supabase.from('jornadas_horarios').delete().eq('jornada_id', jornadaId);
        return [];
      }

      // Upsert before deleting: if insert fails no data is lost (C43).
      // onConflict on (jornada_id, dia_semana) makes this idempotent — safe
      // to retry after a network error without creating duplicates.
      const registros = horarios.map((h) => ({ ...h, jornada_id: jornadaId }));
      const { data, error } = await supabase
        .from('jornadas_horarios')
        .upsert(registros, { onConflict: 'jornada_id,dia_semana' })
        .select();
      if (error) throw error;

      // Remove dias no longer in the new grade (trim, not blind wipe).
      const diasNovos = horarios.map((h) => h.dia_semana);
      await supabase
        .from('jornadas_horarios')
        .delete()
        .eq('jornada_id', jornadaId)
        .not('dia_semana', 'in', `(${diasNovos.join(',')})`);

      return data || [];
    } catch (e) {
      throw new Error('Falha ao salvar grade de horários', { cause: e });
    }
  },
};
