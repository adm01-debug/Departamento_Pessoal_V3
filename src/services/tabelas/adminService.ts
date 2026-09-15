import { supabase } from '@/integrations/supabase/client';
import type { Tables, Insertable } from '@/integrations/supabase/database.types';

export const logEnvioRelatoriosService = {
  // BUG corrigido (E51-026): `log_envio_relatorios` não tem coluna
  // `empresa_id` (só `agendamento_id`, FK para `relatorios_agendados`, que
  // sim tem `empresa_id`) — o `.eq('empresa_id', ...)` original vinha
  // forçado com `as any` porque o compilador já reprovava, e o PostgREST
  // rejeitaria o SELECT em runtime. Filtramos em duas etapas: primeiro os
  // agendamentos da empresa, depois os logs desses agendamentos.
  listar: async (empresaId?: string): Promise<Tables<'log_envio_relatorios'>[]> => {
    let agendamentoIds: string[] | null = null;
    if (empresaId) {
      const { data: agendamentos, error: agendamentosError } = await supabase
        .from('relatorios_agendados')
        .select('id')
        .eq('empresa_id', empresaId);
      if (agendamentosError) throw agendamentosError;
      agendamentoIds = (agendamentos || []).map((a) => a.id);
      if (agendamentoIds.length === 0) return [];
    }

    let q = supabase.from('log_envio_relatorios').select('*').order('created_at', { ascending: false }).limit(100);
    if (agendamentoIds) q = q.in('agendamento_id', agendamentoIds);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
};

export const relatoriosAgendadosService = {
  listar: async (empresaId?: string): Promise<Tables<'relatorios_agendados'>[]> => {
    let q = supabase.from('relatorios_agendados').select('*').order('created_at', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  criar: async (d: Insertable<'relatorios_agendados'>) => {
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
  listar: async (userId: string): Promise<Tables<'saved_filters'>[]> => {
    const { data, error } = await supabase
      .from('saved_filters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  criar: async (d: Insertable<'saved_filters'>) => {
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
  getConfig: async (): Promise<Tables<'bitrix24_config'> | null> => {
    const { data, error } = await supabase.from('bitrix24_config').select('*').limit(1).maybeSingle();
    if (error) throw error;
    return data;
  },
  saveConfig: async (d: Insertable<'bitrix24_config'>) => {
    const { error } = await supabase.from('bitrix24_config').upsert(d);
    if (error) throw error;
  },
  getLogs: async (): Promise<Tables<'bitrix24_sync_logs'>[]> => {
    const { data, error } = await supabase
      .from('bitrix24_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  },
};
