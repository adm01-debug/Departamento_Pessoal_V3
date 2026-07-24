import { supabase } from '@/integrations/supabase/client';
import { loggerService } from './loggerService';

export interface ListOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderAscending?: boolean;
  filters?: Record<string, unknown>;
  searchColumn?: string;
  empresaId?: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
}

export class BaseService<T, CreateDTO = any, UpdateDTO = any> {
  constructor(
    protected table: string,
    protected options: {
      searchColumn?: string;
      defaultOrderBy?: string;
      useVersioning?: boolean;
      requireEmpresaId?: boolean;
    } = {}
  ) {
    if (this.options.requireEmpresaId === undefined) {
      this.options.requireEmpresaId = true;
    }
  }

  protected getQuery() {
    return (supabase as any).from(this.table);
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<T>> {
    const {
      search: rawSearch,
      page = 1,
      pageSize: rawPageSize = 10,
      orderBy = this.options.defaultOrderBy || 'nome',
      orderAscending = true,
      filters = {},
      searchColumn = this.options.searchColumn || 'nome'
    } = options;

    const search = rawSearch?.slice(0, 200);
    const pageSize = Math.min(Math.max(rawPageSize, 1), 100);

    try {
      if (this.options.requireEmpresaId && !filters?.empresa_id && !options.empresaId) {
        throw new Error(`empresa_id obrigatório para listar ${this.table} (isolamento de tenant)`);
      }

      let query = this.getQuery().select('*', { count: 'exact' });

      if (options.empresaId) {
        query = query.eq('empresa_id', options.empresaId);
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      if (search && searchColumn) {
        const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
        query = query.ilike(searchColumn, `%${escapedSearch}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order(orderBy, { ascending: orderAscending })
        .range(from, to);

      if (error) throw error;
      return { data: (data as T[]) || [], total: count || 0 };
    } catch (e) {
      loggerService.error(`Error in listar for ${this.table}`, { options }, e as Error);
      throw e;
    }
  }

  async buscarPorId(id: string, empresaId?: string): Promise<T | null> {
    if (!id) throw new Error('ID é obrigatório');
    try {
      let query = this.getQuery().select('*').eq('id', id);
      if (empresaId) query = query.eq('empresa_id', empresaId);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as T;
    } catch (e) {
      loggerService.error(`Error in buscarPorId for ${this.table}`, { id }, e as Error);
      throw e;
    }
  }

  async criar(payload: CreateDTO): Promise<T> {
    try {
      const { data, error } = await this.getQuery()
        .insert(payload as any)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error(`Nenhum registro de ${this.table} foi retornado após criação.`);
      return data as T;
    } catch (e) {
      loggerService.error(`Error in criar for ${this.table}`, { payload }, e as Error);
      throw e;
    }
  }

  async atualizar(id: string, payload: UpdateDTO, empresaId?: string): Promise<T> {
    try {
      if (this.options.requireEmpresaId && !empresaId) {
        throw new Error(`empresa_id obrigatório para atualizar ${this.table} (isolamento de tenant)`);
      }
      let query = this.getQuery().update(payload as Record<string, unknown>).eq('id', id);
      if (empresaId) query = query.eq('empresa_id', empresaId);

      if (this.options.useVersioning) {
        const { data: current, error: currentError } = await this.getQuery()
          .select('version')
          .eq('id', id)
          .single();

        if (currentError) throw currentError;
        query = query.eq('version', (current as any)?.version || 1);
      }

      const { data, error } = await query.select().maybeSingle();

      if (error) throw error;
      if (!data) throw new Error(`Falha ao atualizar ${this.table} ou conflito de versão.`);
      return data as T;
    } catch (e) {
      loggerService.error(`Error in atualizar for ${this.table}`, { id, payload }, e as Error);
      throw e;
    }
  }

  async excluir(id: string, empresaId?: string): Promise<void> {
    if (!id) throw new Error('ID é obrigatório para exclusão');
    try {
      if (this.options.requireEmpresaId && !empresaId) {
        throw new Error(`empresa_id obrigatório para excluir ${this.table} (isolamento de tenant)`);
      }
      let query = this.getQuery().delete().eq('id', id);
      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }
      const { error } = await query;
      if (error) throw error;
    } catch (e) {
      loggerService.error(`Error in excluir for ${this.table}`, { id }, e as Error);
      throw e;
    }
  }
}


