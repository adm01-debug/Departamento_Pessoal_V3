import { supabase } from '@/integrations/supabase/client';

// Tipos locais para este módulo
type DadosInsert = any;
type DadosUpdate = any;

// =============================================
// Dependentes
// =============================================
export async function listarDependentes(colaboradorId: string, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await (supabase as any)
    .from('dependentes')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarDependente(dependente: DadosInsert) {
  const { data, error } = await supabase
    .from('dependentes')
    .insert([dependente])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function atualizarDependente(id: string, dados: DadosUpdate, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { error } = await (supabase as any).from('dependentes').update(dados).eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function excluirDependente(id: string, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { error } = await (supabase as any).from('dependentes').delete().eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

// =============================================
// Contatos de Emergência
// =============================================
export async function listarContatosEmergencia(colaboradorId: string) {
  return []; // Tabela contatos_emergencia não encontrada no cache do banco externo
}

export async function criarContatoEmergencia(contato: DadosInsert) {
  const { data, error } = await supabase
    .from('contatos_emergencia')
    .insert([contato])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function excluirContatoEmergencia(colaboradorId: string, id: string) {
  const { error } = await supabase.from('contatos_emergencia').delete().eq('id', id).eq('colaborador_id', colaboradorId);
  if (error) throw error;
}

// =============================================
// Histórico Salarial
// =============================================
export async function listarHistoricoSalarial(colaboradorId: string, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('historico_salarial')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('data_vigencia', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarRegistroSalarial(registro: DadosInsert) {
  const { data, error } = await supabase
    .from('historico_salarial')
    .insert([registro])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================
// ASOs
// =============================================
export async function listarASOs(colaboradorId: string, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('asos')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('data_exame', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarASO(aso: DadosInsert) {
  const { data, error } = await supabase
    .from('asos')
    .insert([aso])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================
// Formações Acadêmicas
// =============================================
export async function listarFormacoes(colaboradorId: string) {
  const { data, error } = await supabase
    .from('formacoes_academicas')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('ano_conclusao', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarFormacao(formacao: DadosInsert) {
  const { data, error } = await supabase
    .from('formacoes_academicas')
    .insert([formacao])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function excluirFormacao(colaboradorId: string, id: string) {
  const { error } = await supabase.from('formacoes_academicas').delete().eq('id', id).eq('colaborador_id', colaboradorId);
  if (error) throw error;
}

// =============================================
// Dados de Estrangeiro
// =============================================
export async function obterDadosEstrangeiro(colaboradorId: string) {
  const { data, error } = await supabase
    .from('dados_estrangeiro')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function salvarDadosEstrangeiro(colaboradorId: string, dados: DadosUpdate) {
  const { data, error } = await supabase
    .from('dados_estrangeiro')
    .upsert({ ...dados, colaborador_id: colaboradorId }, { onConflict: 'colaborador_id' })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================
// Deficiências (PCD)
// =============================================
export async function obterDeficiencia(colaboradorId: string) {
  const { data, error } = await supabase
    .from('deficiencias')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function salvarDeficiencia(colaboradorId: string, dados: DadosUpdate) {
  const { data, error } = await supabase
    .from('deficiencias')
    .upsert({ ...dados, colaborador_id: colaboradorId }, { onConflict: 'colaborador_id' })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================
// Período de Experiência
// =============================================
export async function obterPeriodoExperiencia(colaboradorId: string) {
  const { data, error } = await supabase
    .from('periodos_experiencia')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function salvarPeriodoExperiencia(colaboradorId: string, dados: DadosUpdate) {
  const existing = await obterPeriodoExperiencia(colaboradorId);
  if (existing) {
    const existingRecord = existing as Record<string, unknown>;
    const { data, error } = await supabase
      .from('periodos_experiencia')
      .update(dados)
      .eq('id', String(existingRecord.id))
      .eq('colaborador_id', colaboradorId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('periodos_experiencia')
      .insert([{ ...dados, colaborador_id: colaboradorId }])
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

// =============================================
// Anotações
// =============================================
export async function listarAnotacoes(colaboradorId: string) {
  const { data, error } = await supabase
    .from('anotacoes_colaborador')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('data', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarAnotacao(anotacao: DadosInsert) {
  const { data, error } = await supabase
    .from('anotacoes_colaborador')
    .insert([anotacao])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function excluirAnotacao(colaboradorId: string, id: string) {
  const { error } = await supabase.from('anotacoes_colaborador').delete().eq('id', id).eq('colaborador_id', colaboradorId);
  if (error) throw error;
}

// =============================================
// Períodos Aquisitivos
// =============================================
export async function listarPeriodosAquisitivos(colaboradorId: string, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await (supabase as any)
    .from('periodos_aquisitivos')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('data_inicio', { ascending: false });
  if (error) throw error;
  return data || [];
}

// =============================================
// Times
// =============================================
export async function listarTimes(empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  let query = supabase.from('times').select('*').order('nome');
  query = query.eq('empresa_id', empresaId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function criarTime(time: DadosInsert) {
  const { data, error } = await supabase
    .from('times')
    .insert([time])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================
// Tabelas de referência
// =============================================
export async function listarEtnias() {
  const { data, error } = await supabase.from('etnias').select('*').order('nome');
  if (error) throw error;
  return data || [];
}

export async function listarIdentidadesGenero() {
  const { data, error } = await supabase.from('identidades_genero').select('*').order('nome');
  if (error) throw error;
  return data || [];
}

export async function listarTiposAdmissao() {
  const { data, error } = await supabase.from('tipos_admissao').select('*').order('nome');
  if (error) throw error;
  return data || [];
}

export async function listarTiposEstabilidade() {
  const { data, error } = await supabase.from('tipos_estabilidade').select('*').order('nome');
  if (error) throw error;
  return data || [];
}

// =============================================
// Webhooks
// =============================================
export async function listarWebhooks(empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório');
  const { data, error } = await supabase
    .from('webhooks_config')
    .select('id, empresa_id, nome, url, eventos, ativo, created_at')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarWebhook(webhook: DadosInsert) {
  const { data, error } = await supabase
    .from('webhooks_config')
    .insert([webhook])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function excluirWebhook(id: string, empresaId: string) {
  if (!id) throw new Error('id obrigatório');
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { error } = await supabase.from('webhooks_config').delete().eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

// =============================================
// Férias Coletivas
// =============================================
export async function listarFeriasColetivas(empresaId: string) {
  const { data, error } = await supabase
    .from('ferias_coletivas')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarFeriasColetivas(ferias: DadosInsert) {
  const { data, error } = await supabase
    .from('ferias_coletivas')
    .insert([ferias])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================
// Campos Customizados
// =============================================
export async function listarCamposCustomizados(empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  let query = supabase.from('campos_customizados').select('*').eq('ativo', true).order('ordem');
  query = query.eq('empresa_id', empresaId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function criarCampoCustomizado(campo: DadosInsert) {
  const { data, error } = await supabase
    .from('campos_customizados')
    .insert([campo])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function obterValoresCamposCustomizados(colaboradorId: string) {
  const { data, error } = await supabase
    .from('valores_campos_customizados')
    .select('*')
    .eq('colaborador_id', colaboradorId);
  if (error) throw error;
  return data || [];
}

export async function salvarValorCampoCustomizado(
  campoId: string,
  colaboradorId: string,
  valor: string
) {
  const { data, error } = await supabase
    .from('valores_campos_customizados')
    .upsert(
      { campo_customizado_id: campoId, colaborador_id: colaboradorId, valor },
      { onConflict: 'campo_customizado_id,colaborador_id' }
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}