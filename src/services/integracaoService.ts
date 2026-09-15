import { supabase } from '@/integrations/supabase/client';
import type { Tables, Insertable } from '@/integrations/supabase/database.types';

export type CnabConfig = Tables<'cnab_configuracoes'>;
export type WebhookConfig = Tables<'webhooks_config'>;

export const cnabService = {
  // BUG corrigido (E51-026): o select pedia `banco_nome` e `layout_cnab`,
  // que não existem em `cnab_configuracoes` (colunas reais incluem
  // `nome_empresa`, `agencia_digito`, `conta_digito`, `codigo_empresa`) — o
  // PostgREST rejeita o SELECT inteiro por coluna desconhecida, então a aba
  // "Configuração Bancária" nunca carregava dados salvos.
  async getConfig(empresaId: string): Promise<CnabConfig | null> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { data, error } = await supabase
      .from('cnab_configuracoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async saveConfig(empresaId: string, d: Insertable<'cnab_configuracoes'>): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { error } = await supabase.from('cnab_configuracoes').upsert({ ...d, empresa_id: empresaId });
    if (error) throw error;
  },

  // BUG corrigido: o select pedia `banco_nome` e `nome_arquivo`, que não
  // existem em `cnab_remessas` (colunas reais incluem `banco_codigo` e
  // `arquivo_url`, sem nome de arquivo próprio) — mesma classe de erro.
  async getRemessas(empresaId: string): Promise<Tables<'cnab_remessas'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { data, error } = await supabase
      .from('cnab_remessas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  },
};

export const webhookService = {
  // BUG corrigido: o select pedia `nome`, que não existe em
  // `webhooks_config` (não há coluna de nome de exibição nessa tabela).
  async listar(empresaId: string): Promise<WebhookConfig[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { data, error } = await supabase
      .from('webhooks_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async criar(empresaId: string, d: Insertable<'webhooks_config'>): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { error } = await supabase.from('webhooks_config').insert({ ...d, empresa_id: empresaId });
    if (error) throw error;
  },

  async excluir(empresaId: string, id: string): Promise<void> {
    if (!id) throw new Error('id obrigatório');
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('webhooks_config').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // BUG corrigido: filtrava `webhook_logs` (que não tem `empresa_id` — nem é
  // a tabela certa: `webhook_logs` referencia `webhooks`, o sistema de
  // webhook do módulo de ponto). Os logs de `webhooks_config` ficam em
  // `webhooks_logs` (outra tabela, sem `empresa_id` também), então filtramos
  // em duas etapas: primeiro os ids de webhook desta empresa, depois os logs
  // desses ids.
  async getLogs(empresaId: string): Promise<Tables<'webhooks_logs'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks_config')
      .select('id')
      .eq('empresa_id', empresaId);
    if (webhooksError) throw webhooksError;
    const webhookIds = (webhooks || []).map((w) => w.id);
    if (webhookIds.length === 0) return [];

    const { data, error } = await supabase
      .from('webhooks_logs')
      .select('*')
      .in('webhook_id', webhookIds)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  },
};
