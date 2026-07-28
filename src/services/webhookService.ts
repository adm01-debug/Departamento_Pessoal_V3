import { supabase } from '@/integrations/supabase/client';
import { BaseService, ListOptions, ListResponse } from './baseService';

class WebhookService extends BaseService<any> {
  constructor() {
    super('webhooks', { 
      defaultOrderBy: 'nome' 
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<any>> {
    const { filters, search } = options;
    const empresaId = (filters as any)?.empresa_id;

    let query = this.getQuery().select('*', { count: 'exact' });
    if (empresaId) query = query.eq('empresa_id', empresaId);
    if (search) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      query = query.ilike('nome', `%${escapedSearch}%`);
    }

    const { data, count, error } = await query.order('nome');
    if (error) throw error;
    return { data: (data as any[]) || [], total: count || 0 };
  }

  async listarLogs(webhookId: string): Promise<any[]> {
    // BUG corrigido: o builder do PostgREST não expõe `.from()`; a chamada
    // antiga (`this.getQuery().from(...)`) lançava TypeError em runtime.
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data || [];
  }
}

export const webhookService = new WebhookService();
