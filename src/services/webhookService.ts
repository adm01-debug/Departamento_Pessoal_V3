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
    return { data: data || [], total: count || 0 };
  }

  async listarLogs(webhookId: string): Promise<any[]> {
    const { data, error } = await (this.getQuery().from as any)('webhook_logs')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data || [];
  }
}

export const webhookService = new WebhookService();
