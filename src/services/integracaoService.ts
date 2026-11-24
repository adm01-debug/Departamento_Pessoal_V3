import { supabase } from '@/integrations/supabase/client';
export interface CnabConfig {
  id: string;
  empresa_id: string;
  banco_nome: string;
  banco_codigo: string;
  agencia: string;
  conta: string;
  layout_cnab: string;
  convenio: string;
  created_at: string;
}

export interface WebhookConfig {
  id: string;
  empresa_id: string;
  nome: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  created_at: string;
}

export const cnabService = {
  async getConfig(empresaId: string): Promise<CnabConfig | null> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { data, error } = await supabase
      .from('cnab_configuracoes')
      .select('id, empresa_id, banco_nome, banco_codigo, agencia, conta, layout_cnab, convenio, created_at')
      .eq('empresa_id', empresaId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as CnabConfig;
  },

  async saveConfig(empresaId: string, d: any): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { error } = await supabase
      .from('cnab_configuracoes')
      .upsert({ ...d, empresa_id: empresaId });
    if (error) throw error;
  },

  async getRemessas(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { data, error } = await supabase
      .from('cnab_remessas')
      .select('id, empresa_id, banco_nome, nome_arquivo, status, created_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }
};

export const webhookService = {
  async listar(empresaId: string): Promise<WebhookConfig[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { data, error } = await supabase
      .from('webhooks_config')
      .select('id, empresa_id, nome, url, eventos, ativo, created_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as WebhookConfig[];
  },

  async criar(empresaId: string, d: any): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { error } = await supabase
      .from('webhooks_config')
      .insert({ ...d, empresa_id: empresaId });
    if (error) throw error;
  },

  async excluir(empresaId: string, id: string): Promise<void> {
    if (!id) throw new Error('id obrigatório');
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase
      .from('webhooks_config')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);
    if (error) throw error;
  },

  async getLogs(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    const { data, error } = await (supabase
      .from('webhook_logs')
      .select('id, evento, status, created_at') as any)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }
};
