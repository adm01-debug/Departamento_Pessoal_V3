import { supabase } from '@/integrations/supabase/client';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';
import { validateTablePayload } from '@/schemas/validate';

type EscalaComColaboradorETurno = Tables<'escalas_trabalho'> & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
  turno: Pick<Tables<'turnos'>, 'nome' | 'horario_inicio' | 'horario_fim' | 'cor'> | null;
};

export type EscalaDoDia = Tables<'escalas_trabalho'> & {
  turno: Pick<Tables<'turnos'>, 'id' | 'nome' | 'horario_inicio' | 'horario_fim' | 'cor'> | null;
};

/** Escala com o cabecalho do colaborador (nome + departamento) e do turno, para o calendario de Turnos. */
export type EscalaDoPeriodo = Tables<'escalas_trabalho'> & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo' | 'departamento'> | null;
  turno: Pick<Tables<'turnos'>, 'nome' | 'horario_inicio' | 'horario_fim' | 'cor'> | null;
};

/** Colaborador ativo, no minimo que a grade de Turnos precisa (sem PII). */
export type MembroDaEquipe = Pick<Tables<'colaboradores'>, 'id' | 'nome_completo' | 'departamento'>;

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

  /**
   * Escalas da empresa numa janela de datas — o calendario (semana ou mes) nao
   * cabe em `listarEscalas(empresaId, data?)`, que resolve UM dia. O
   * `limit(5000)` e teto de seguranca: 300 pessoas x 31 dias ~ 9.300 linhas,
   * entao e o filtro de periodo que mantem a consulta no tamanho esperado.
   */
  async listarEscalasPeriodo(empresaId: string, inicio: string, fim: string): Promise<EscalaDoPeriodo[]> {
    if (!empresaId) throw new Error('empresa_id obrigatorio para isolamento de tenant');

    const { data, error } = await supabase
      .from('escalas_trabalho')
      .select(
        'id, data, status, colaborador_id, turno_id, colaborador:colaboradores(nome_completo, departamento), turno:turnos(nome, horario_inicio, horario_fim, cor)'
      )
      .eq('empresa_id', empresaId)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data')
      .limit(5000);
    if (error) throw error;
    return (data || []) as unknown as EscalaDoPeriodo[];
  },

  /** Equipe ativa da empresa — as linhas do calendario e o denominador do KPI de escalados. */
  async listarEquipe(empresaId: string): Promise<MembroDaEquipe[]> {
    if (!empresaId) throw new Error('empresa_id obrigatorio para isolamento de tenant');

    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome_completo, departamento')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome_completo')
      .limit(1000);
    if (error) throw error;
    return (data || []) as unknown as MembroDaEquipe[];
  },
};
