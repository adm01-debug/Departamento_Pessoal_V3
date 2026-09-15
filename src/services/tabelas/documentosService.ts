import { supabase, type QueryBuilderType } from '@/integrations/supabase/client';
import type { Insertable, Tables } from '@/integrations/supabase/database.types';

export const documentoTemplatesService = {
  listar: async (empresaId?: string): Promise<Tables<'documento_templates'>[]> => {
    let q = supabase.from('documento_templates').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Tables<'documento_templates'>[] | null) || [];
  },
  criar: async (d: Insertable<'documento_templates'>): Promise<void> => {
    const { error } = await supabase.from('documento_templates').insert(d);
    if (error) throw error;
  },
};

export const documentosAdmissaoService = {
  listar: async (admissaoId: string): Promise<Tables<'documentos_admissao'>[]> => {
    const { data, error } = await supabase
      .from('documentos_admissao')
      .select('*')
      .eq('admissao_id', admissaoId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Tables<'documentos_admissao'>[] | null) || [];
  },
  criar: async (d: Insertable<'documentos_admissao'>): Promise<void> => {
    const { error } = await supabase.from('documentos_admissao').insert(d);
    if (error) throw error;
  },
};

export const documentosAfastamentoService = {
  listar: async (afastamentoId: string): Promise<Tables<'documentos_afastamento'>[]> => {
    const { data, error } = await supabase
      .from('documentos_afastamento')
      .select('*')
      .eq('afastamento_id', afastamentoId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Tables<'documentos_afastamento'>[] | null) || [];
  },
  criar: async (d: Insertable<'documentos_afastamento'>): Promise<void> => {
    const { error } = await supabase.from('documentos_afastamento').insert(d);
    if (error) throw error;
  },
};

export const documentosAssinaturaService = {
  listar: async (empresaId?: string): Promise<Tables<'documentos_assinatura'>[]> => {
    let q = supabase.from('documentos_assinatura').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Tables<'documentos_assinatura'>[] | null) || [];
  },
  criar: async (d: Insertable<'documentos_assinatura'>): Promise<void> => {
    const { error } = await supabase.from('documentos_assinatura').insert(d);
    if (error) throw error;
  },
};

export const documentosColaboradorService = {
  listar: async (colaboradorId: string, empresaId: string): Promise<Tables<'documentos_colaborador'>[]> => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase.from('documentos_colaborador').select('*') as unknown as QueryBuilderType)
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Tables<'documentos_colaborador'>[] | null) || [];
  },
  criar: async (d: Insertable<'documentos_colaborador'>): Promise<void> => {
    const { error } = await supabase.from('documentos_colaborador').insert(d);
    if (error) throw error;
  },
};
