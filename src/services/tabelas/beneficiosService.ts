import { todayLocalISO } from '@/utils/dateLocal';
import { supabase } from '@/integrations/supabase/client';

export const beneficiariosPlanoService = {
  listar: async (planoId: string) => {
    const { data, error } = await supabase.from('beneficiarios_plano').select('*, colaborador:colaboradores(nome_completo)').eq('plano_saude_id', planoId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('beneficiarios_plano').insert(d);
    if (error) throw error;
  },
  excluir: async (planoId: string, id: string) => {
    const { error } = await supabase.from('beneficiarios_plano').update({ status: 'excluido', data_exclusao: todayLocalISO() }).eq('id', id).eq('plano_saude_id', planoId);
    if (error) throw error;
  },
};

export const beneficiariosSeguroService = {
  listar: async (seguroId: string) => {
    const { data, error } = await supabase.from('beneficiarios_seguro').select('*, colaborador:colaboradores(nome_completo)').eq('seguro_vida_id', seguroId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('beneficiarios_seguro').insert(d);
    if (error) throw error;
  },
  excluir: async (seguroId: string, id: string) => {
    const { error } = await supabase.from('beneficiarios_seguro').update({ status: 'inativo' }).eq('id', id).eq('seguro_vida_id', seguroId);
    if (error) throw error;
  },
};

export const colaboradorBeneficiosService = {
  listar: async (colaboradorId: string, empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any).from('colaborador_beneficios').select('*').eq('colaborador_id', colaboradorId).eq('empresa_id', empresaId);
    if (error) throw error;
    return data || [];
  },
};

export const segurosColaboradoresService = {
  listar: async (seguroId?: string) => {
    let q = supabase.from('seguros_colaboradores').select('*, colaborador:colaboradores(nome_completo)').order('created_at', { ascending: false });
    if (seguroId) q = q.eq('seguro_vida_id', seguroId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  vincular: async (d: any) => {
    const { error } = await supabase.from('seguros_colaboradores').insert(d);
    if (error) throw error;
  },
  desvincular: async (seguroVidaId: string, id: string) => {
    if (!seguroVidaId) throw new Error('seguro_vida_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('seguros_colaboradores').delete().eq('id', id).eq('seguro_vida_id', seguroVidaId);
    if (error) throw error;
  },
};
