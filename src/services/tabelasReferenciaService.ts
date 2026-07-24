import { supabase } from '@/integrations/supabase/client';

type DataRecord = any;

// Helper genérico para listar tabelas de referência
async function listarReferencia(tabela: string, orderBy = 'nome'): Promise<unknown[]> {
  const { data, error } = await supabase.from(tabela)
    .select('*')
    .order(orderBy);
  if (error) throw error;
  return data || [];
}

// =============================================
// Tabelas de Referência - Leitura
// =============================================
export const listarNacionalidades = () => listarReferencia('nacionalidades');
export const listarTiposDesligamento = () => listarReferencia('tipos_desligamento');
export const listarTiposAvisoPrevio = () => listarReferencia('tipos_aviso_previo');
export const listarTiposDeficiencia = () => listarReferencia('tipos_deficiencia');
export const listarTiposPagamento = () => listarReferencia('tipos_pagamento');
export const listarTiposSalario = () => listarReferencia('tipos_salario');
export const listarRelacionamentosDependentes = () => listarReferencia('relacionamentos_dependentes');
export const listarGenerosDocumento = () => listarReferencia('generos_documento');
export const listarTiposVisto = () => listarReferencia('tipos_visto');
export const listarCondicoesIngresso = () => listarReferencia('condicoes_ingresso');
export const listarTemposResidencia = () => listarReferencia('tempos_residencia');
export const listarDescricoesLogradouro = () => listarReferencia('descricoes_logradouro');
export const listarPaises = () => listarReferencia('paises');
export const listarCategoriasTrabalhador = () => listarReferencia('categorias_trabalhador');
export const listarRelacionamentosContatoEmergencia = () => listarReferencia('relacionamentos_contato_emergencia');
export const listarMotivosAfastamento = () => listarReferencia('motivos_afastamento');

// =============================================
// Centros de Custo (CRUD completo)
// =============================================
export async function listarCentrosCusto(empresaId: string): Promise<unknown[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase.from('centros_custo').select('*').eq('empresa_id', empresaId).order('nome');
  if (error) throw error;
  return data || [];
}

export async function criarCentroCusto(centro: DataRecord): Promise<any> {
  const { data, error } = await supabase.from('centros_custo')
    .insert([centro])
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Nenhum registro de centro de custo foi retornado.');
  return data;
}

export async function atualizarCentroCusto(id: string, dados: DataRecord, empresaId: string): Promise<void> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { error } = await supabase.from('centros_custo').update(dados).eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function excluirCentroCusto(id: string, empresaId: string): Promise<void> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { error } = await supabase.from('centros_custo').delete().eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

// =============================================
// Contas Bancárias
// =============================================
export async function listarContasBancarias(colaboradorId: string, empresaId: string): Promise<unknown[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase.from('contas_bancarias')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('principal', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarContaBancaria(conta: DataRecord): Promise<any> {
  const { data, error } = await supabase.from('contas_bancarias')
    .insert([conta])
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Nenhum registro de conta bancária foi retornado.');
  return data;
}

export async function atualizarContaBancaria(id: string, dados: DataRecord, empresaId: string): Promise<void> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { error } = await supabase.from('contas_bancarias').update(dados).eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function excluirContaBancaria(id: string, empresaId: string): Promise<void> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { error } = await supabase.from('contas_bancarias').delete().eq('id', id).eq('empresa_id', empresaId);
  if (error) throw error;
}

// =============================================
// Dados de Estagiário
// =============================================
export async function obterDadosEstagiario(colaboradorId: string): Promise<unknown | null> {
  const { data, error } = await supabase.from('dados_estagiario')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function salvarDadosEstagiario(colaboradorId: string, dados: DataRecord): Promise<any> {
  try {
    const res = await obterDadosEstagiario(colaboradorId);
    const existing = (res ?? null) as DataRecord | null;

    if (existing) {
      const { data, error } = await supabase.from('dados_estagiario')
        .update(dados)
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return (data);
    } else {
      const { data, error } = await supabase.from('dados_estagiario')
        .insert([{ ...dados, colaborador_id: colaboradorId }])
        .select()
        .maybeSingle();
      if (error) throw error;
      return (data);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    throw new Error(`Falha ao salvar dados de estagiário: ${msg}`, { cause: e });
  }
}

// =============================================
// Documentos Pessoais Arquivos
// =============================================
export async function listarDocumentosPessoais(colaboradorId: string): Promise<unknown[]> {
  const { data, error } = await supabase.from('documentos_pessoais')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarDocumentoPessoal(doc: DataRecord): Promise<any> {
  const { data, error } = await supabase.from('documentos_pessoais')
    .insert([doc])
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Nenhum registro de documento pessoal foi retornado.');
  return data;
}

export async function excluirDocumentoPessoal(colaboradorId: string, id: string): Promise<void> {
  if (!colaboradorId) throw new Error('colaborador_id obrigatório para isolamento de tenant');
  const { error } = await supabase.from('documentos_pessoais').delete().eq('id', id).eq('colaborador_id', colaboradorId);
  if (error) throw error;
}

// =============================================
// Férias - Workflow de Aprovação
// =============================================
export async function listarFeriasAprovacoes(feriasId: string): Promise<unknown[]> {
  const { data, error } = await supabase.from('ferias_aprovacoes')
    .select('*')
    .eq('ferias_id', feriasId)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function criarFeriasAprovacao(aprovacao: DataRecord): Promise<any> {
  const { data, error } = await supabase.from('ferias_aprovacoes')
    .insert([aprovacao])
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Nenhum registro de aprovação de férias foi retornado.');
  return data;
}

export async function atualizarFeriasAprovacao(feriasId: string, id: string, dados: DataRecord): Promise<void> {
  if (!feriasId) throw new Error('ferias_id obrigatório para isolamento de tenant');
  const { error } = await supabase.from('ferias_aprovacoes').update(dados).eq('id', id).eq('ferias_id', feriasId);
  if (error) throw error;
}

// =============================================
// Férias - Arquivos
// =============================================
export async function listarFeriasArquivos(feriasId: string): Promise<unknown[]> {
  const { data, error } = await supabase.from('ferias_arquivos')
    .select('*')
    .eq('ferias_id', feriasId)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function criarFeriasArquivo(arquivo: DataRecord): Promise<any> {
  const { data, error } = await supabase.from('ferias_arquivos')
    .insert([arquivo])
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Nenhum registro de arquivo de férias foi retornado.');
  return data;
}

// =============================================
// Dependentes - Benefícios (vinculação)
// =============================================
export async function listarDependentesBeneficios(dependenteId: string): Promise<unknown[]> {
  const { data, error } = await supabase.from('dependentes_beneficios')
    .select('*')
    .eq('dependente_id', dependenteId);
  if (error) throw error;
  return data || [];
}

export async function vincularDependenteBeneficio(vinculo: DataRecord): Promise<any> {
  const { data, error } = await supabase.from('dependentes_beneficios')
    .upsert([vinculo], { onConflict: 'dependente_id,beneficio_id' })
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Falha ao vincular dependente ao benefício.');
  return data;
}

export async function desvincularDependenteBeneficio(dependenteId: string, beneficioId: string): Promise<void> {
  const { error } = await supabase.from('dependentes_beneficios')
    .delete()
    .eq('dependente_id', dependenteId)
    .eq('beneficio_id', beneficioId);
  if (error) throw error;
}