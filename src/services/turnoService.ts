import { supabase } from '@/integrations/supabase/client';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';
import { validateTablePayload } from '@/schemas/validate';

type EscalaComColaboradorETurno = Tables<'escalas_trabalho'> & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
  turno: Pick<Tables<'turnos'>, 'nome' | 'horario_inicio' | 'horario_fim' | 'cor'> | null;
};

export type EscalaComTurno = Tables<'escalas_trabalho'> & {
  turno: Pick<Tables<'turnos'>, 'nome' | 'horario_inicio' | 'horario_fim' | 'cor'> | null;
};

export type EscalaDoDia = Tables<'escalas_trabalho'> & {
  turno: Pick<Tables<'turnos'>, 'id' | 'nome' | 'horario_inicio' | 'horario_fim' | 'cor'> | null;
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
    const { data, error } = await supabase
      .from('turnos')
      .insert(validateTablePayload('turnos', d, 'turnoService:turnos'))
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de turno foi retornado.');
    return data;
  },

  async atualizarTurno(id: string, d: Updatable<'turnos'>, empresaId: string): Promise<Tables<'turnos'>> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('turnos')
      .update(validateTablePayload('turnos', d, 'turnoService:turnos'))
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

  // Escala atual de um colaborador (Dossiê — Jornada & Ponto). Não reusa
  // listarEscalas() porque ele lista por data/empresa, não por colaborador —
  // aqui buscamos só a última escala já registrada.
  async buscarEscalaAtual(colaboradorId: string, empresaId: string): Promise<EscalaComTurno | null> {
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
    return (data as EscalaComTurno | null) ?? null;
  },

  async criarEscala(d: Insertable<'escalas_trabalho'>): Promise<Tables<'escalas_trabalho'>> {
    const { data, error } = await supabase
      .from('escalas_trabalho')
      .insert(validateTablePayload('escalas_trabalho', d, 'turnoService:escalas_trabalho'))
      .select()
      .maybeSingle();
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
  // independente da data), aqui filtramos pela data exata — é o que decide se
  // o fluxo de salvar deve fazer UPDATE (linha já existe) ou INSERT (ainda
  // não existe escala para o dia), evitando escala duplicada no mesmo dia.
  async obterEscalaDoDia(colaboradorId: string, empresaId: string, data: string): Promise<EscalaDoDia | null> {
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
    return (result as EscalaDoDia | null) ?? null;
  },

  async atualizarEscala(
    id: string,
    d: Updatable<'escalas_trabalho'>,
    empresaId: string
  ): Promise<Tables<'escalas_trabalho'>> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('escalas_trabalho')
      .update(validateTablePayload('escalas_trabalho', d, 'turnoService:escalas_trabalho'))
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de escala foi retornado.');
    return data;
  },
};
