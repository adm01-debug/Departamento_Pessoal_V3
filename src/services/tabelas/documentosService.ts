import { supabase } from '@/integrations/supabase/client';

export const documentoTemplatesService = {
  listar: async (empresaId?: string) => {
    let q = supabase.from('documento_templates').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('documento_templates').insert(d);
    if (error) throw error;
  },
};

export const documentosAdmissaoService = {
  listar: async (admissaoId: string) => {
    const { data, error } = await supabase.from('documentos_admissao').select('*').eq('admissao_id', admissaoId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('documentos_admissao').insert(d);
    if (error) throw error;
  },
};

export const documentosAfastamentoService = {
  listar: async (afastamentoId: string) => {
    const { data, error } = await supabase.from('documentos_afastamento').select('*').eq('afastamento_id', afastamentoId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('documentos_afastamento').insert(d);
    if (error) throw error;
  },
};

export const documentosAssinaturaService = {
  listar: async (empresaId?: string) => {
    let q = supabase.from('documentos_assinatura').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('documentos_assinatura').insert(d);
    if (error) throw error;
  },
};

export const documentosColaboradorService = {
  listar: async (colaboradorId: string, empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any).from('documentos_colaborador').select('*').eq('colaborador_id', colaboradorId).eq('empresa_id', empresaId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('documentos_colaborador').insert(d);
    if (error) throw error;
  },
};
