import { supabase } from '@/integrations/supabase/client';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';

// =============================================
// Dependentes
// =============================================
// BUG corrigido (E51-026): `dependentes` não tem coluna `empresa_id` (só
// `colaborador_id`) — o isolamento de tenant é feito via join com
// `colaboradores.empresa_id`. O `.eq('empresa_id', ...)` direto fazia o
// PostgREST rejeitar SELECT/UPDATE/DELETE inteiros por coluna desconhecida:
// listar, editar e excluir dependentes sempre falhava (só criar funcionava,
// já que o insert nunca tocava `empresa_id`).
async function verificarDependenteDaEmpresa(id: string, empresaId: string): Promise<void> {
  const { data, error } = await supabase
    .from('dependentes')
    .select('id, colaborador:colaboradores!inner(empresa_id)')
    .eq('id', id)
    .eq('colaborador.empresa_id', empresaId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Dependente não encontrado ou sem permissão');
}

export async function listarDependentes(colaboradorId: string, empresaId: string): Promise<Tables<'dependentes'>[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('dependentes')
    .select('*, colaborador:colaboradores!inner(empresa_id)')
    .eq('colaborador_id', colaboradorId)
    .eq('colaborador.empresa_id', empresaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Tables<'dependentes'>[]) || [];
}

export async function criarDependente(dependente: Insertable<'dependentes'>): Promise<Tables<'dependentes'> | null> {
  const { data, error } = await supabase.from('dependentes').insert([dependente]).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function atualizarDependente(
  id: string,
  dados: Updatable<'dependentes'>,
  empresaId: string
): Promise<void> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  await verificarDependenteDaEmpresa(id, empresaId);
  const { error } = await supabase.from('dependentes').update(dados).eq('id', id);
  if (error) throw error;
}

export async function excluirDependente(id: string, empresaId: string): Promise<void> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  await verificarDependenteDaEmpresa(id, empresaId);
  const { error } = await supabase.from('dependentes').delete().eq('id', id);
  if (error) throw error;
}

// =============================================
// Contatos de Emergência
// =============================================
export async function listarContatosEmergencia(colaboradorId: string): Promise<Tables<'contatos_emergencia'>[]> {
  const { data, error } = await supabase
    .from('contatos_emergencia')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarContatoEmergencia(
  contato: Insertable<'contatos_emergencia'>
): Promise<Tables<'contatos_emergencia'> | null> {
  const { data, error } = await supabase.from('contatos_emergencia').insert([contato]).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function excluirContatoEmergencia(colaboradorId: string, id: string) {
  const { error } = await supabase
    .from('contatos_emergencia')
    .delete()
    .eq('id', id)
    .eq('colaborador_id', colaboradorId);
  if (error) throw error;
}

// =============================================
// Histórico Salarial
// =============================================
export async function listarHistoricoSalarial(
  colaboradorId: string,
  empresaId: string
): Promise<Tables<'historico_salarial'>[]> {
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

export async function criarRegistroSalarial(
  registro: Insertable<'historico_salarial'>
): Promise<Tables<'historico_salarial'> | null> {
  const { data, error } = await supabase.from('historico_salarial').insert([registro]).select().maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================
// ASOs
// =============================================
export async function listarASOs(colaboradorId: string, empresaId: string): Promise<Tables<'asos'>[]> {
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

export async function criarASO(aso: Insertable<'asos'>): Promise<Tables<'asos'> | null> {
  const { data, error } = await supabase.from('asos').insert([aso]).select().maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================
// Formações Acadêmicas
// =============================================
export async function listarFormacoes(colaboradorId: string): Promise<Tables<'formacoes_academicas'>[]> {
  const { data, error } = await supabase
    .from('formacoes_academicas')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('ano_conclusao', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarFormacao(
  formacao: Insertable<'formacoes_academicas'>
): Promise<Tables<'formacoes_academicas'> | null> {
  const { data, error } = await supabase.from('formacoes_academicas').insert([formacao]).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function excluirFormacao(colaboradorId: string, id: string) {
  const { error } = await supabase
    .from('formacoes_academicas')
    .delete()
    .eq('id', id)
    .eq('colaborador_id', colaboradorId);
  if (error) throw error;
}

// =============================================
// Dados de Estrangeiro
// =============================================
export async function obterDadosEstrangeiro(colaboradorId: string): Promise<Tables<'dados_estrangeiro'> | null> {
  const { data, error } = await supabase
    .from('dados_estrangeiro')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function salvarDadosEstrangeiro(
  colaboradorId: string,
  dados: Updatable<'dados_estrangeiro'>
): Promise<Tables<'dados_estrangeiro'> | null> {
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
export async function obterDeficiencia(colaboradorId: string): Promise<Tables<'deficiencias'> | null> {
  const { data, error } = await supabase
    .from('deficiencias')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function salvarDeficiencia(
  colaboradorId: string,
  dados: Omit<Insertable<'deficiencias'>, 'colaborador_id'>
): Promise<Tables<'deficiencias'> | null> {
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
export async function obterPeriodoExperiencia(colaboradorId: string): Promise<Tables<'periodos_experiencia'> | null> {
  const { data, error } = await supabase
    .from('periodos_experiencia')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function salvarPeriodoExperiencia(
  colaboradorId: string,
  dados: Omit<Insertable<'periodos_experiencia'>, 'colaborador_id'>
): Promise<Tables<'periodos_experiencia'> | null> {
  const existing = await obterPeriodoExperiencia(colaboradorId);
  if (existing) {
    const { data, error } = await supabase
      .from('periodos_experiencia')
      .update(dados)
      .eq('id', existing.id)
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
export async function listarAnotacoes(colaboradorId: string): Promise<Tables<'anotacoes_colaborador'>[]> {
  const { data, error } = await supabase
    .from('anotacoes_colaborador')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('data', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarAnotacao(
  anotacao: Insertable<'anotacoes_colaborador'>
): Promise<Tables<'anotacoes_colaborador'> | null> {
  const { data, error } = await supabase.from('anotacoes_colaborador').insert([anotacao]).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function excluirAnotacao(colaboradorId: string, id: string) {
  const { error } = await supabase
    .from('anotacoes_colaborador')
    .delete()
    .eq('id', id)
    .eq('colaborador_id', colaboradorId);
  if (error) throw error;
}

// =============================================
// Períodos Aquisitivos
// =============================================
// BUG corrigido (E51-026): mesmo caso de `dependentes` — `periodos_aquisitivos`
// também não tem `empresa_id` (só `colaborador_id`); isolamento via join.
export async function listarPeriodosAquisitivos(
  colaboradorId: string,
  empresaId: string
): Promise<Tables<'periodos_aquisitivos'>[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('periodos_aquisitivos')
    .select('*, colaborador:colaboradores!inner(empresa_id)')
    .eq('colaborador_id', colaboradorId)
    .eq('colaborador.empresa_id', empresaId)
    .order('data_inicio', { ascending: false });
  if (error) throw error;
  return (data as Tables<'periodos_aquisitivos'>[]) || [];
}

// =============================================
// Times
// =============================================
export async function listarTimes(empresaId: string): Promise<Tables<'times'>[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  let query = supabase.from('times').select('*').order('nome');
  query = query.eq('empresa_id', empresaId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function criarTime(time: Insertable<'times'>): Promise<Tables<'times'> | null> {
  // O banco agora recusa time sem tenant (NOT NULL), mas a checagem aqui
  // devolve uma mensagem util em vez do erro cru do Postgres — e espelha a
  // mesma exigencia que `listarTimes` ja faz.
  if (!time?.empresa_id) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase.from('times').insert([time]).select().maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================
// Tabelas de referência
// =============================================
export async function listarEtnias(): Promise<Tables<'etnias'>[]> {
  const { data, error } = await supabase.from('etnias').select('*').order('nome');
  if (error) throw error;
  return data || [];
}

export async function listarIdentidadesGenero(): Promise<Tables<'identidades_genero'>[]> {
  const { data, error } = await supabase.from('identidades_genero').select('*').order('nome');
  if (error) throw error;
  return data || [];
}

export async function listarTiposAdmissao(): Promise<Tables<'tipos_admissao'>[]> {
  const { data, error } = await supabase.from('tipos_admissao').select('*').order('nome');
  if (error) throw error;
  return data || [];
}

export async function listarTiposEstabilidade(): Promise<Tables<'tipos_estabilidade'>[]> {
  const { data, error } = await supabase.from('tipos_estabilidade').select('*').order('nome');
  if (error) throw error;
  return data || [];
}

// =============================================
// Webhooks
// =============================================
// BUG corrigido (E51-026): o select pedia `nome`, que não existe em
// `webhooks_config` (mesma tabela e mesmo achado de src/services/
// integracaoService.ts:webhookService.listar) — o PostgREST rejeitava o
// SELECT inteiro por coluna desconhecida.
export async function listarWebhooks(empresaId: string): Promise<Tables<'webhooks_config'>[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório');
  const { data, error } = await supabase
    .from('webhooks_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarWebhook(webhook: Insertable<'webhooks_config'>): Promise<Tables<'webhooks_config'> | null> {
  const { data, error } = await supabase.from('webhooks_config').insert([webhook]).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function excluirWebhook(id: string, empresaId: string): Promise<void> {
  if (!id) throw new Error('id obrigatório');
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { error } = await supabase.from('webhooks_config').delete().eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

// =============================================
// Férias Coletivas
// =============================================
export async function listarFeriasColetivas(empresaId: string): Promise<Tables<'ferias_coletivas'>[]> {
  const { data, error } = await supabase
    .from('ferias_coletivas')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarFeriasColetivas(
  ferias: Insertable<'ferias_coletivas'>
): Promise<Tables<'ferias_coletivas'> | null> {
  const { data, error } = await supabase.from('ferias_coletivas').insert([ferias]).select().maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================
// Campos Customizados
// =============================================
export async function listarCamposCustomizados(empresaId: string): Promise<Tables<'campos_customizados'>[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  let query = supabase.from('campos_customizados').select('*').eq('ativo', true).order('ordem');
  query = query.eq('empresa_id', empresaId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function criarCampoCustomizado(
  campo: Insertable<'campos_customizados'>
): Promise<Tables<'campos_customizados'> | null> {
  const { data, error } = await supabase.from('campos_customizados').insert([campo]).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function obterValoresCamposCustomizados(
  colaboradorId: string
): Promise<Tables<'valores_campos_customizados'>[]> {
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
): Promise<Tables<'valores_campos_customizados'> | null> {
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
