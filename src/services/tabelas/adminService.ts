import { supabase } from '@/integrations/supabase/client';

export const logEnvioRelatoriosService = {
  listar: async (empresaId?: string) => {
    let q = supabase.from('log_envio_relatorios').select('*').order('created_at', { ascending: false }).limit(100);
    if (empresaId) q = (q as any).eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
};

export const relatoriosAgendadosService = {
  listar: async (empresaId?: string) => {
    let q = supabase.from('relatorios_agendados').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('relatorios_agendados').insert(d);
    if (error) throw error;
  },
  excluir: async (id: string, empresaId: string) => {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('relatorios_agendados').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};

export const savedFiltersService = {
  listar: async (userId: string) => {
    const { data, error } = await supabase.from('saved_filters').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: any) => {
    const { error } = await supabase.from('saved_filters').insert(d);
    if (error) throw error;
  },
  excluir: async (id: string, userId: string) => {
    if (!userId) throw new Error('user_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('saved_filters').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
};

export const bitrix24Service = {
  getConfig: async () => {
    const { data, error } = await supabase.from('bitrix24_config').select('*').limit(1).maybeSingle();
    if (error) throw error;
    return data;
  },
  saveConfig: async (d: any) => {
    const { error } = await supabase.from('bitrix24_config').upsert(d);
    if (error) throw error;
  },
  getLogs: async () => {
    const { data, error } = await supabase.from('bitrix24_sync_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  },
};
