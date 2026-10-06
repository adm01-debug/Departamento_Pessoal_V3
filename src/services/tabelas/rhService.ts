import { supabase } from '@/integrations/supabase/client';

export const configAfastamentosService = {
  obter: async (empresaId: string) => {
    const { data, error } = await supabase.from('config_afastamentos' as any).select('*').eq('empresa_id', empresaId).maybeSingle();
    if (error) throw error;
    return data;
  },
  salvar: async (d: any) => {
    const { error } = await supabase.from('config_afastamentos').upsert(d, { onConflict: 'empresa_id' });
    if (error) throw error;
  },
};

export const feriasSolicitacoesService = {
  listar: async (empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('ferias_solicitacoes').select('*, colaborador:colaboradores(nome_completo)').eq('empresa_id', empresaId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('ferias_solicitacoes').insert(d);
    if (error) throw error;
  },
  atualizar: async (id: string, d: any, empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('ferias_solicitacoes').update(d).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};

export const historicoCargoService = {
  listar: async (colaboradorId: string, empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any).from('historico_cargo').select('*').eq('colaborador_id', colaboradorId).eq('empresa_id', empresaId).order('data_inicio', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

export const historicoFeriasService = {
  listar: async (colaboradorId: string, empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any).from('historico_ferias')
      .select('*, ferias!inner(colaborador_id, empresa_id)')
      .eq('ferias.colaborador_id', colaboradorId)
      .eq('ferias.empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

export const linhasTransporteService = {
  listar: async (empresaId?: string) => {
    let q = supabase.from('linhas_transporte' as any).select('*').order('nome');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('linhas_transporte').insert(d);
    if (error) throw error;
  },
};

export const notificacoesAdmissaoService = {
  listar: async (admissaoId: string) => {
    const { data, error } = await supabase.from('notificacoes_admissao').select('*').eq('admissao_id', admissaoId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

/**
 * ONBOARDING — MODELO B: **DEPRECATED**, somente LEITURA de compatibilidade.
 *
 * O domínio canônico do onboarding é a **Jornada de Onboarding** (modelo A:
 * `admissoes` + `tarefas_onboarding`), operado por
 * `services/onboardingJornadaService.ts`. Este objeto existe APENAS para o
 * fallback de leitura descrito em `docs/ONBOARDING_MODELO_B_DEPRECATED.md`.
 *
 * As escritas e as leituras SEM consumidor foram removidas
 * (`listarTemplates`, `criarTemplate`, `listarTemplateTarefas`,
 * `criarTemplateTarefa`, `listarColaboradores`, `iniciarOnboarding`,
 * `concluirTarefa` — nenhuma tinha chamador). Sobraram só as DUAS leituras que o
 * fallback usa; ambas saem quando a conferência de dados do modelo B terminar.
 */
export const onboardingService = {
  listarTarefas: async (onboardingId: string) => {
    const { data, error } = await supabase.from('onboarding_tarefas').select('*').eq('onboarding_id', onboardingId).order('ordem');
    if (error) throw error;
    return data || [];
  },
  // PARTE G (Dossiê — Desenvolvimento): acha o onboarding_colaborador de UM
  // colaborador, para depois buscar suas tarefas (onboarding_tarefas.onboarding_id).
  buscarPorColaborador: async (colaboradorId: string, empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('onboarding_colaborador')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },
};

export const treinamentoParticipantesService = {
  listar: async (inscricaoId?: string) => {
    let q = supabase.from('treinamento_participantes' as any).select('*, colaborador:colaboradores(nome_completo)').order('created_at', { ascending: false });
    if (inscricaoId) q = q.eq('inscricao_id', inscricaoId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  registrarPresenca: async (inscricaoId: string, id: string) => {
    if (!inscricaoId) throw new Error('inscricao_id obrigatório para isolamento de tenant');
    const { error } = await (supabase as any).from('treinamento_participantes').update({ presente: true }).eq('id', id).eq('inscricao_id', inscricaoId);
    if (error) throw error;
  },
  // PARTE G (Dossiê — Desenvolvimento): treinamentos de UM colaborador —
  // listar() acima só filtra por inscricao_id (turma), não por colaborador.
  listarPorColaborador: async (colaboradorId: string) => {
    const { data, error } = await supabase
      .from('treinamento_participantes' as any)
      .select('*, treinamento:treinamentos(nome, descricao, data, carga_horaria)')
      .eq('colaborador_id', colaboradorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
