import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type ConfigAfastamentosRow = Tables<'config_afastamentos'>;
type FeriasSolicitacaoRow = Tables<'ferias_solicitacoes'>;
type HistoricoCargoRow = Tables<'historico_cargo'>;
type HistoricoFeriasRow = Tables<'historico_ferias'>;
type LinhaTransporteRow = Tables<'linhas_transporte'>;
type OnboardingTemplateRow = Tables<'onboarding_templates'>;
type OnboardingTemplateTarefaRow = Tables<'onboarding_template_tarefas'>;
type OnboardingColaboradorRow = Tables<'onboarding_colaborador'>;
type OnboardingTarefaRow = Tables<'onboarding_tarefas'>;
type TreinamentoParticipanteRow = Tables<'treinamento_participantes'>;

export const configAfastamentosService = {
  obter: async (): Promise<ConfigAfastamentosRow | null> => {
    // config_afastamentos é global (sem coluna empresa_id no schema)
    const { data, error } = await supabase.from('config_afastamentos').select('*').maybeSingle();
    if (error) throw error;
    return data;
  },
  salvar: async (d: TablesInsert<'config_afastamentos'>) => {
    const { error } = await supabase.from('config_afastamentos').upsert(d, { onConflict: 'tipo' });
    if (error) throw error;
  },
};

export const feriasSolicitacoesService = {
  listar: async (empresaId: string): Promise<FeriasSolicitacaoRow[]> => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('ferias_solicitacoes').select('*, colaborador:colaboradores(nome_completo)').eq('empresa_id', empresaId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: TablesInsert<'ferias_solicitacoes'>) => {
    const { error } = await supabase.from('ferias_solicitacoes').insert(d);
    if (error) throw error;
  },
  atualizar: async (id: string, d: TablesUpdate<'ferias_solicitacoes'>, empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('ferias_solicitacoes').update(d).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};

export const historicoCargoService = {
  listar: async (colaboradorId: string): Promise<HistoricoCargoRow[]> => {
    const { data, error } = await supabase.from('historico_cargo').select('*').eq('colaborador_id', colaboradorId).order('data_alteracao', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

export const historicoFeriasService = {
  listar: async (colaboradorId: string, empresaId: string): Promise<HistoricoFeriasRow[]> => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('historico_ferias')
      .select('*, ferias!inner(colaborador_id, empresa_id)')
      .eq('ferias.colaborador_id', colaboradorId)
      .eq('ferias.empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

export const linhasTransporteService = {
  listar: async (): Promise<LinhaTransporteRow[]> => {
    const { data, error } = await supabase.from('linhas_transporte').select('*').order('nome');
    if (error) throw error;
    return data || [];
  },
  criar: async (d: TablesInsert<'linhas_transporte'>) => {
    const { error } = await supabase.from('linhas_transporte').insert(d);
    if (error) throw error;
  },
};

export const notificacoesAdmissaoService = {
  listar: async (admissaoId: string): Promise<Tables<'notificacoes_admissao'>[]> => {
    const { data, error } = await supabase.from('notificacoes_admissao').select('*').eq('admissao_id', admissaoId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

export const onboardingService = {
  listarTemplates: async (empresaId?: string): Promise<OnboardingTemplateRow[]> => {
    let q = supabase.from('onboarding_templates').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criarTemplate: async (d: TablesInsert<'onboarding_templates'>): Promise<OnboardingTemplateRow | null> => {
    const { data, error } = await supabase.from('onboarding_templates').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  listarTemplateTarefas: async (templateId: string): Promise<OnboardingTemplateTarefaRow[]> => {
    const { data, error } = await supabase.from('onboarding_template_tarefas').select('*').eq('template_id', templateId).order('ordem');
    if (error) throw error;
    return data || [];
  },
  criarTemplateTarefa: async (d: TablesInsert<'onboarding_template_tarefas'>) => {
    const { error } = await supabase.from('onboarding_template_tarefas').insert(d);
    if (error) throw error;
  },
  listarColaboradores: async (empresaId?: string): Promise<OnboardingColaboradorRow[]> => {
    let q = supabase.from('onboarding_colaborador').select('*, colaborador:colaboradores(nome_completo)').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  iniciarOnboarding: async (d: TablesInsert<'onboarding_colaborador'>): Promise<OnboardingColaboradorRow | null> => {
    const { data, error } = await supabase.from('onboarding_colaborador').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  listarTarefas: async (onboardingId: string): Promise<OnboardingTarefaRow[]> => {
    const { data, error } = await supabase.from('onboarding_tarefas').select('*').eq('onboarding_id', onboardingId).order('ordem');
    if (error) throw error;
    return data || [];
  },
  concluirTarefa: async (onboardingId: string, id: string) => {
    if (!onboardingId) throw new Error('onboarding_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('onboarding_tarefas').update({ concluida: true, data_conclusao: new Date().toISOString() }).eq('id', id).eq('onboarding_id', onboardingId);
    if (error) throw error;
  },
};

export const treinamentoParticipantesService = {
  listar: async (treinamentoId?: string): Promise<TreinamentoParticipanteRow[]> => {
    let q = supabase.from('treinamento_participantes').select('*, colaborador:colaboradores(nome_completo)').order('created_at', { ascending: false });
    if (treinamentoId) q = q.eq('treinamento_id', treinamentoId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  registrarPresenca: async (treinamentoId: string, id: string) => {
    if (!treinamentoId) throw new Error('treinamento_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('treinamento_participantes').update({ presente: true }).eq('id', id).eq('treinamento_id', treinamentoId);
    if (error) throw error;
  },
};
