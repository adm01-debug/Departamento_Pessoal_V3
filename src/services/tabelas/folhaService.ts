import { supabase } from '@/integrations/supabase/client';

export const esocialLotesService = {
  listar: async (empresaId?: string) => {
    let q = supabase.from('esocial_lotes').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('esocial_lotes').insert(d);
    if (error) throw error;
  },
};

export const eventosVariaveisService = {
  listar: async (empresaId: string, competencia?: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any).from('eventos_variaveis').select('*, colaborador:colaboradores(nome_completo)').eq('empresa_id', empresaId).order('created_at', { ascending: false });
    if (competencia) q = q.eq('competencia', competencia);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('eventos_variaveis').insert(d);
    if (error) throw error;
  },
  excluir: async (id: string, empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await (supabase as any).from('eventos_variaveis').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};

export const lancamentosFolhaService = {
  listar: async (folhaId: string) => {
    const { data, error } = await (supabase.from('lancamentos_folha').select('*') as any).eq('folha_id', folhaId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('lancamentos_folha').insert(d);
    if (error) throw error;
  },
};

export const rubricasFolhaService = {
  listar: async (empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('rubricas_folha').select('*').eq('empresa_id', empresaId).order('codigo');
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('rubricas_folha').insert(d);
    if (error) throw error;
  },
  atualizar: async (id: string, d: any, empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('rubricas_folha').update(d).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};

export const parametrosFiscaisService = {
  listar: async () => {
    const { data, error } = await supabase.from('parametros_fiscais').select('*').order('vigencia_inicio', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('parametros_fiscais').insert(d);
    if (error) throw error;
  },
};
