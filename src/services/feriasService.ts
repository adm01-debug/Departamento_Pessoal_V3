import { BaseService, ListOptions, ListResponse } from './baseService';
import { Ferias } from '@/types/entities';
import { supabase } from '@/integrations/supabase/client';
import { parseCursor } from '@/lib/cursor';

class FeriasService extends BaseService<Ferias> {
  constructor() {
    super('ferias', {
      searchColumn: 'colaborador_nome',
      defaultOrderBy: 'data_inicio'
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<Ferias>> {
    const { filters, search, page, pageSize } = options;
    const empId = (filters as any)?.empresa_id;
    const status = (filters as any)?.status;
    const res = await this.listSolicitacoes(empId, { page, limit: pageSize, search, status });
    return { data: res.data, total: res.count };
  }

  /**
   * Lista solicitações de férias com suporte a cursor-based pagination
   * P1-020: substitui offset por keyset para melhor performance em tabelas grandes
   *
   * @param empresaId - ID da empresa (obrigatório para tenant isolation)
   * @param params - Parâmetros de paginação
   * @param params.cursor - Cursor para paginação (formato: base64 encoded)
   * @param params.limit - Quantidade de registros por página (default: 20)
   * @param params.page - Número da página (para backward compatibility, usa offset se cursor não fornecido)
   * @param params.search - Busca por nome do colaborador
   * @param params.status - Filtro por status
   */
  async listSolicitacoes(
    empresaId: string,
    params?: {
      page?: number;
      limit?: number;
      cursor?: string;
      search?: string;
      status?: string;
    }
  ): Promise<{ data: Ferias[]; count: number; nextCursor: string | null; hasMore: boolean }> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    const { page = 1, limit = 20, cursor, search, status } = params || {};
    const effectiveLimit = limit + 1; // Pegamos 1 a mais para saber se há mais páginas

    let query = this.getQuery()
      .select('*, colaborador:colaboradores!fk_ferias_colaborador(nome_completo, foto_url)', { count: 'exact' });

    query = query.eq('empresa_id', empresaId);
    if (status && status !== 'all') query = query.eq('status', status);

    if (search && search.length >= 3) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      query = query.ilike('colaborador_nome', `%${escapedSearch}%`);
    }

    // Cursor-based pagination (preferido) ou offset-based (backward compatibility)
    if (cursor) {
      const parsed = parseCursor(cursor);
      if (parsed && parsed.column === 'id') {
        query = query.gt('id', parsed.value as string);
      }
      query = query.order('id', { ascending: true }).limit(effectiveLimit);
    } else {
      // Offset-based para backward compatibility
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.order('id', { ascending: false }).range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const resultData = (data as any[]) || [];
    const hasMore = resultData.length > limit;
    const returnData = hasMore ? resultData.slice(0, limit) : resultData;

    // Calcula próximo cursor (ID do último item)
    const nextCursor = hasMore && returnData.length > 0
      ? Buffer.from(`id:${returnData[returnData.length - 1].id}:after`).toString('base64')
      : null;

    return {
      data: returnData,
      count: count || 0,
      nextCursor,
      hasMore
    };
  }

  async syncWithHub(empresaId: string): Promise<{ success: boolean; lastSync: string; recordsUpdated: number }> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await (supabase as any)
      .from('ferias')
      .select('id')
      .eq('empresa_id', empresaId)
      .limit(1);
    if (error) throw error;
    return {
      success: true,
      lastSync: new Date().toISOString(),
      recordsUpdated: 0,
    };
  }

  async getAprovacoesLog(feriasId: string): Promise<any[]> {
    const { data, error } = await (supabase as any)
      .from('ferias_aprovacoes_log')
      .select('*')
      .eq('ferias_id', feriasId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async criarPeriodoAquisitivo(d: any): Promise<any> {
    const { data, error } = await (supabase as any).from('periodos_aquisitivos').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  }

  async atualizarPeriodoAquisitivo(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any).from('periodos_aquisitivos').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    return data;
  }

  async excluirPeriodoAquisitivo(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await (supabase as any).from('periodos_aquisitivos').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  }

  async enviarContabilidade(id: string, empresaId: string, userId?: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await this.getQuery().update({
      enviado_contabilidade: true,
      enviado_contabilidade_em: new Date().toISOString(),
      enviado_contabilidade_por: userId || null,
    } as any).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  }

  async aprovar(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await this.getQuery().update({ status: 'aprovada' } as Record<string, unknown>).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  }

  async aprovarGestor(id: string, empresaId: string, userId?: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await this.getQuery().update({
      status_aprovacao_gestor: 'aprovado',
      aprovado_gestor: true,
      aprovado_gestor_em: new Date().toISOString(),
      aprovado_gestor_por: userId || null,
    } as any).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  }

  async aprovarRH(id: string, empresaId: string, userId?: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await this.getQuery().update({
      status_aprovacao_rh: 'aprovado',
      aprovado_rh: true,
      aprovado_rh_em: new Date().toISOString(),
      aprovado_rh_por: userId || null,
      status: 'aprovada',
    } as any).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  }

  async listPeriodosAquisitivos(colaboradorId: string, empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('periodos_aquisitivos')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('data_inicio', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async rejeitar(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await this.getQuery().update({ status: 'rejeitada' } as Record<string, unknown>).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  }

  async cancelar(id: string, empresaId: string, userId?: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await this.getQuery().update({
      cancelado: true,
      cancelado_em: new Date().toISOString(),
      cancelado_por: userId || null,
      status: 'cancelada',
    } as any).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  }
}

export const feriasService = new FeriasService();
