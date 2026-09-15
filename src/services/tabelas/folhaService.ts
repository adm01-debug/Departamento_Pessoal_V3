import { supabase, type QueryBuilderType } from '@/integrations/supabase/client';
import type { Insertable, Tables, Updatable } from '@/integrations/supabase/database.types';

export const esocialLotesService = {
  listar: async (empresaId?: string): Promise<Tables<'esocial_lotes'>[]> => {
    let q = supabase.from('esocial_lotes').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Tables<'esocial_lotes'>[] | null) || [];
  },
  criar: async (d: Insertable<'esocial_lotes'>): Promise<void> => {
    const { error } = await supabase.from('esocial_lotes').insert(d);
    if (error) throw error;
  },
};

export const eventosVariaveisService = {
  listar: async (empresaId: string, competencia?: string): Promise<Tables<'eventos_variaveis'>[]> => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (
      supabase
        .from('eventos_variaveis')
        .select('*, colaborador:colaboradores(nome_completo)') as unknown as QueryBuilderType
    )
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (competencia) q = q.eq('competencia', competencia);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Tables<'eventos_variaveis'>[] | null) || [];
  },
  criar: async (d: Insertable<'eventos_variaveis'>): Promise<void> => {
    const { error } = await supabase.from('eventos_variaveis').insert(d);
    if (error) throw error;
  },
  excluir: async (id: string, empresaId: string): Promise<void> => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('eventos_variaveis').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};

export const lancamentosFolhaService = {
  // `lancamentos_folha` referencia `holerite_id` (o holerite individual do
  // colaborador), não `folha_id` — um lançamento pertence a UM holerite
  // dentro da folha, não à folha inteira diretamente. O filtro anterior
  // (`.eq('folha_id', ...)`) referenciava uma coluna inexistente; sob a
  // tipagem antiga (`any`) isso compilava mas o PostgREST recusaria a query
  // em runtime. 0 chamadores reais hoje, então nunca foi exercitado.
  listar: async (holeriteId: string): Promise<Tables<'lancamentos_folha'>[]> => {
    const { data, error } = await supabase
      .from('lancamentos_folha')
      .select('*')
      .eq('holerite_id', holeriteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Tables<'lancamentos_folha'>[] | null) || [];
  },
  criar: async (d: Insertable<'lancamentos_folha'>): Promise<void> => {
    const { error } = await supabase.from('lancamentos_folha').insert(d);
    if (error) throw error;
  },
};

export const rubricasFolhaService = {
  listar: async (empresaId: string): Promise<Tables<'rubricas_folha'>[]> => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('rubricas_folha')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('codigo');
    if (error) throw error;
    return (data as Tables<'rubricas_folha'>[] | null) || [];
  },
  criar: async (d: Insertable<'rubricas_folha'>): Promise<void> => {
    const { error } = await supabase.from('rubricas_folha').insert(d);
    if (error) throw error;
  },
  atualizar: async (id: string, d: Updatable<'rubricas_folha'>, empresaId: string): Promise<void> => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('rubricas_folha').update(d).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};

export const parametrosFiscaisService = {
  listar: async (): Promise<Tables<'parametros_fiscais'>[]> => {
    const { data, error } = await supabase
      .from('parametros_fiscais')
      .select('*')
      .order('vigencia_inicio', { ascending: false });
    if (error) throw error;
    return (data as Tables<'parametros_fiscais'>[] | null) || [];
  },
  criar: async (d: Insertable<'parametros_fiscais'>): Promise<void> => {
    const { error } = await supabase.from('parametros_fiscais').insert(d);
    if (error) throw error;
  },
};
