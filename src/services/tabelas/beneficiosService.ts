import { todayLocalISO } from '@/utils/dateLocal';
import { supabase, type QueryBuilderType } from '@/integrations/supabase/client';
import type { Insertable, Tables } from '@/integrations/supabase/database.types';

export const beneficiariosPlanoService = {
  listar: async (planoId: string): Promise<Tables<'beneficiarios_plano'>[]> => {
    const { data, error } = await supabase
      .from('beneficiarios_plano')
      .select('*, colaborador:colaboradores(nome_completo)')
      .eq('plano_saude_id', planoId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Tables<'beneficiarios_plano'>[] | null) || [];
  },
  criar: async (d: Insertable<'beneficiarios_plano'>): Promise<void> => {
    const { error } = await supabase.from('beneficiarios_plano').insert(d);
    if (error) throw error;
  },
  excluir: async (planoId: string, id: string): Promise<void> => {
    const { error } = await supabase
      .from('beneficiarios_plano')
      .update({ status: 'excluido', data_exclusao: todayLocalISO() })
      .eq('id', id)
      .eq('plano_saude_id', planoId);
    if (error) throw error;
  },
};

export const beneficiariosSeguroService = {
  listar: async (seguroId: string): Promise<Tables<'beneficiarios_seguro'>[]> => {
    const { data, error } = await supabase
      .from('beneficiarios_seguro')
      .select('*, colaborador:colaboradores(nome_completo)')
      .eq('seguro_vida_id', seguroId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Tables<'beneficiarios_seguro'>[] | null) || [];
  },
  criar: async (d: Insertable<'beneficiarios_seguro'>): Promise<void> => {
    const { error } = await supabase.from('beneficiarios_seguro').insert(d);
    if (error) throw error;
  },
  excluir: async (seguroId: string, id: string): Promise<void> => {
    const { error } = await supabase
      .from('beneficiarios_seguro')
      .update({ status: 'inativo' })
      .eq('id', id)
      .eq('seguro_vida_id', seguroId);
    if (error) throw error;
  },
};

export const colaboradorBeneficiosService = {
  listar: async (colaboradorId: string, empresaId: string): Promise<Tables<'colaborador_beneficios'>[]> => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase.from('colaborador_beneficios').select('*') as unknown as QueryBuilderType)
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId);
    if (error) throw error;
    return (data as Tables<'colaborador_beneficios'>[] | null) || [];
  },
};

export const segurosColaboradoresService = {
  listar: async (seguroId?: string): Promise<Tables<'seguros_colaboradores'>[]> => {
    let q = supabase
      .from('seguros_colaboradores')
      .select('*, colaborador:colaboradores(nome_completo)')
      .order('created_at', { ascending: false });
    if (seguroId) q = q.eq('seguro_vida_id', seguroId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Tables<'seguros_colaboradores'>[] | null) || [];
  },
  vincular: async (d: Insertable<'seguros_colaboradores'>): Promise<void> => {
    const { error } = await supabase.from('seguros_colaboradores').insert(d);
    if (error) throw error;
  },
  desvincular: async (seguroVidaId: string, id: string): Promise<void> => {
    if (!seguroVidaId) throw new Error('seguro_vida_id obrigatório para isolamento de tenant');
    const { error } = await supabase
      .from('seguros_colaboradores')
      .delete()
      .eq('id', id)
      .eq('seguro_vida_id', seguroVidaId);
    if (error) throw error;
  },
};
