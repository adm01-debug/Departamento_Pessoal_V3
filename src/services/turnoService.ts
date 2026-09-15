import { supabase } from '@/integrations/supabase/client';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';

type EscalaComColaboradorETurno = Tables<'escalas_trabalho'> & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
  turno: Pick<Tables<'turnos'>, 'nome' | 'horario_inicio' | 'horario_fim' | 'cor'> | null;
};

export const turnoService = {
  async listarTurnos(empresaId: string): Promise<Tables<'turnos'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('turnos').select('*').order('nome');
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async criarTurno(d: Insertable<'turnos'>): Promise<Tables<'turnos'>> {
    const { data, error } = await supabase.from('turnos').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de turno foi retornado.');
    return data;
  },

  async atualizarTurno(id: string, d: Updatable<'turnos'>, empresaId: string): Promise<Tables<'turnos'>> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('turnos')
      .update(d)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de turno foi retornado.');
    return data;
  },

  async excluirTurno(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('turnos').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  async listarEscalas(empresaId: string, data?: string): Promise<EscalaComColaboradorETurno[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase
      .from('escalas_trabalho')
      .select('*, colaborador:colaboradores(nome_completo), turno:turnos(nome, horario_inicio, horario_fim, cor)')
      .order('data');
    q = q.eq('empresa_id', empresaId);
    if (data) q = q.eq('data', data);
    const { data: result, error } = await q;
    if (error) throw error;
    return (result as EscalaComColaboradorETurno[]) || [];
  },

  async criarEscala(d: Insertable<'escalas_trabalho'>): Promise<Tables<'escalas_trabalho'>> {
    const { data, error } = await supabase.from('escalas_trabalho').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de escala foi retornado.');
    return data;
  },

  async excluirEscala(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('escalas_trabalho').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};
