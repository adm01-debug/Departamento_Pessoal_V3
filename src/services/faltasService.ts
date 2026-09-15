import { supabase, type QueryBuilderType } from '@/integrations/supabase/client';
import type { Insertable, Tables, Updatable } from '@/integrations/supabase/database.types';

type Falta = Tables<'faltas'>;
type FaltaInsert = Insertable<'faltas'>;
type FaltaUpdate = Updatable<'faltas'>;

export const faltasService = {
  async listar(empresaId: string): Promise<Falta[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = (
      supabase.from('faltas').select('*, colaborador:colaboradores(nome_completo)') as unknown as QueryBuilderType
    ).order('data', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Falta[] | null) || [];
  },

  async buscarPorColaborador(colaboradorId: string, empresaId: string): Promise<Falta[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase.from('faltas').select('*') as unknown as QueryBuilderType)
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('data', { ascending: false });
    if (error) throw error;
    return (data as Falta[] | null) || [];
  },

  async criar(d: FaltaInsert): Promise<Falta> {
    const { data, error } = await supabase.from('faltas').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de falta foi retornado.');
    return data;
  },

  async atualizar(id: string, d: FaltaUpdate, empresaId: string): Promise<Falta> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase.from('faltas').update(d) as unknown as QueryBuilderType)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de falta foi retornado.');
    return data as Falta;
  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await (supabase.from('faltas').delete() as unknown as QueryBuilderType)
      .eq('id', id)
      .eq('empresa_id', empresaId);
    if (error) throw error;
  },
};
