import { supabase } from '@/integrations/supabase/client';
import { BaseService, ListOptions, ListResponse } from './baseService';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';

class WebhookService extends BaseService<Tables<'webhooks'>, Insertable<'webhooks'>, Updatable<'webhooks'>> {
  constructor() {
    super('webhooks', {
      defaultOrderBy: 'nome',
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<Tables<'webhooks'>>> {
    const { filters, search } = options;
    const empresaId = filters?.empresa_id as string | undefined;

    let query = this.getQuery().select('*', { count: 'exact' });
    if (empresaId) query = query.eq('empresa_id', empresaId);
    if (search) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      query = query.ilike('nome', `%${escapedSearch}%`);
    }

    const { data, count, error } = await query.order('nome');
    if (error) throw error;
    return { data: (data as Tables<'webhooks'>[]) || [], total: count || 0 };
  }

  async listarLogs(webhookId: string): Promise<Tables<'webhook_logs'>[]> {
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
