import { supabase } from '@/integrations/supabase/client';
export const turnoService = {
  async listarTurnos(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('turnos').select('*').order('nome');
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },
  
  async criarTurno(d: any): Promise<any> {
    
    const { data, error } = await supabase.from('turnos').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de turno foi retornado.');
    return data;
  
  },
  
  async atualizarTurno(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('turnos').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de turno foi retornado.');
    return data;

  },

  async excluirTurno(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('turnos').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },
  
  async listarEscalas(empresaId: string, data?: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('escalas_trabalho').select('*, colaborador:colaboradores(nome_completo), turno:turnos(nome, horario_inicio, horario_fim, cor)').order('data');
    q = q.eq('empresa_id', empresaId);
    if (data) q = q.eq('data', data);
    const { data: result, error } = await q;
    if (error) throw error;
    return result || [];

  },
  
  // PARTE D: escala atual de um colaborador (Dossiê — Jornada & Ponto). Não
  // reusa listarEscalas() porque ele lista por data/empresa, não por
  // colaborador — aqui buscamos só a última escala já registrada.
  async buscarEscalaAtual(colaboradorId: string, empresaId: string): Promise<any | null> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('escalas_trabalho')
      .select('*, turno:turnos(nome, horario_inicio, horario_fim, cor)')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async criarEscala(d: any): Promise<any> {

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

  // Escala do colaborador para uma data específica (Dossiê — card "Hoje").
  // Diferente de buscarEscalaAtual (que pega a última já registrada,
  // independente da data), aqui filtramos pela data exata — é o que decide
  // se o fluxo de salvar deve fazer UPDATE (linha já existe) ou INSERT
  // (ainda não existe escala para o dia).
  async obterEscalaDoDia(colaboradorId: string, empresaId: string, data: string): Promise<any | null> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data: result, error } = await supabase
      .from('escalas_trabalho')
      .select('*, turno:turnos(id, nome, horario_inicio, horario_fim, cor)')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .eq('data', data)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return result;
  },

  async atualizarEscala(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('escalas_trabalho').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de escala foi retornado.');
    return data;
  },
};

