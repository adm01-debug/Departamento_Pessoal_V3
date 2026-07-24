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

export const onboardingService = {
  listarTemplates: async (empresaId?: string) => {
    let q = supabase.from('onboarding_templates').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criarTemplate: async (d: any) => {
    const { data, error } = await supabase.from('onboarding_templates').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  listarTemplateTarefas: async (templateId: string) => {
    const { data, error } = await supabase.from('onboarding_template_tarefas').select('*').eq('template_id', templateId).order('ordem');
    if (error) throw error;
    return data || [];
  },
  criarTemplateTarefa: async (d: any) => {
    const { error } = await supabase.from('onboarding_template_tarefas').insert(d);
    if (error) throw error;
  },
  listarColaboradores: async (empresaId?: string) => {
    let q = supabase.from('onboarding_colaborador').select('*, colaborador:colaboradores(nome_completo)').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  iniciarOnboarding: async (d: any) => {
    const { data, error } = await supabase.from('onboarding_colaborador').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  listarTarefas: async (onboardingId: string) => {
    const { data, error } = await supabase.from('onboarding_tarefas').select('*').eq('onboarding_id', onboardingId).order('ordem');
    if (error) throw error;
    return data || [];
  },
  concluirTarefa: async (onboardingId: string, id: string) => {
    if (!onboardingId) throw new Error('onboarding_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('onboarding_tarefas').update({ concluida: true, concluida_em: new Date().toISOString() } as any).eq('id', id).eq('onboarding_id', onboardingId);
    if (error) throw error;
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
};
