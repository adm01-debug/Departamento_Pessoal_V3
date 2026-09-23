import { supabase } from '@/integrations/supabase/client';

export const jornadaService = {
  async listarJornadas(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    const { data, error } = await supabase.from('jornadas').select('*').eq('empresa_id', empresaId).order('nome');
    if (error) throw error;
    return data || [];
  },

  // Jornada efetiva do colaborador para exibição no Dossiê (Jornada & Ponto).
  // Espelha (sem alterar) o mesmo heurístico já usado pelo cálculo de ponto:
  // prefere a jornada ativa da empresa cuja carga_horaria_semanal bate com
  // colaboradores.jornada_semanal; sem match, cai na jornada ativa mais
  // antiga da empresa.
  async obterJornadaColaborador(colaboradorId: string, empresaId: string): Promise<any | null> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    const { data: colaborador, error: colaboradorError } = await supabase
      .from('colaboradores')
      .select('jornada_semanal')
      .eq('id', colaboradorId)
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (colaboradorError) throw colaboradorError;

    const { data: jornadas, error } = await supabase
      .from('jornadas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativa', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    if (!jornadas || jornadas.length === 0) return null;

    const cargaSemanal = colaborador?.jornada_semanal;
    const match = jornadas.find((j: any) => j.carga_horaria_semanal === cargaSemanal);
    return match ?? jornadas[0];
  },

  async atualizarJornada(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('jornadas').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de jornada foi retornado.');
    return data;
  },
};
