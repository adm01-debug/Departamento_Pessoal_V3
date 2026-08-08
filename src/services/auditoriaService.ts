import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Auditoria — leitura e escrita são feitas exclusivamente via RPCs
 * `SECURITY DEFINER` (`listar_auditoria` / `registrar_auditoria`).
 *
 * Motivo (segurança): a tabela `audit_log` não aceita mais INSERT vindo do
 * cliente — isso permitia forjar eventos de auditoria e informar um autor
 * arbitrário. A RPC deriva o autor de `auth.uid()` no servidor e valida o
 * escopo de empresa, tornando a trilha confiável.
 */

export interface AuditoriaFiltros {
  tabela?: string;
  acao?: string;
  colaborador_id?: string;
  registro_id?: string;
  data_inicio?: string;
  data_fim?: string;
  limite?: number;
}

export interface AuditoriaRegistro {
  id: string;
  tabela: string | null;
  registro_id: string | null;
  acao: string | null;
  user_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export const auditoriaService = {
  async listar(empresaId: string, filtros?: AuditoriaFiltros): Promise<AuditoriaRegistro[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório');

    const { data, error } = await supabase.rpc('listar_auditoria', {
      p_empresa_id: empresaId,
      p_tabela: filtros?.tabela ?? null,
      p_acao: filtros?.acao ?? null,
      p_registro_id: filtros?.registro_id ?? null,
      p_data_inicio: filtros?.data_inicio ?? null,
      p_data_fim: filtros?.data_fim ?? null,
      p_limite: filtros?.limite ?? 200,
    });

    if (error) throw error;
    return (data as unknown as AuditoriaRegistro[]) || [];
  },

  async logComVersao(params: {
    tabela: string;
    registro_id: string;
    acao: 'UPDATE' | 'DELETE';
    dados_anteriores: Json;
    dados_novos?: Json;
    empresa_id?: string;
  }): Promise<void> {
    const { error } = await supabase.rpc('registrar_auditoria', {
      p_tabela: params.tabela,
      p_registro_id: params.registro_id,
      p_acao: params.acao,
      p_dados_anteriores: params.dados_anteriores ?? null,
      p_dados_novos: params.dados_novos ?? null,
      p_empresa_id: params.empresa_id ?? null,
    });

    // Auditoria não pode quebrar a operação de negócio, mas precisa ser observável.
    if (error) {
      console.error('[auditoriaService] falha ao registrar auditoria', error.message);
    }
  },
};


export const notificacaoService = {
  async listar(userId: string) {
    if (!userId) throw new Error('user_id obrigatório');
    const { data, error } = await supabase
      .from('notificacoes')
      .select('id, titulo, mensagem, lida, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  },
  async marcarComoLida(userId: string, id: string) {
    if (!id) throw new Error('id obrigatório');
    if (!userId) throw new Error('user_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
  async marcarTodasComoLidas(userId: string) {
    if (!userId) throw new Error('user_id obrigatório');
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('user_id', userId).eq('lida', false);
    if (error) throw error;
  },
};
