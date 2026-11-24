import { BaseService, ListOptions, ListResponse } from './baseService';
import { Empresa } from '@/types/entities';

class EmpresaService extends BaseService<Empresa> {
  constructor() {
    super('empresas', { 
      searchColumn: 'razao_social', 
      defaultOrderBy: 'razao_social' 
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<Empresa>> {
    const { search, page = 1, pageSize = 12 } = options;
    
    let query = this.getQuery().select('*', { count: 'exact' });
    
    if (search) {
      const s = search.replace(/[%_.,()]/g, '');
      if (s) query = query.or(`razao_social.ilike.%${s}%,nome_fantasia.ilike.%${s}%,cnpj.ilike.%${s}%`);
    }
    
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, count, error } = await query
      .order('razao_social', { ascending: true })
      .range(from, to);
      
    if (error) throw error;
    return { data: (data as Empresa[]) || [], total: count || 0 };
  }

  // Alias for backward compatibility
  async list(options?: any) {
    return this.listar(options);
  }
}

export const empresaService = new EmpresaService();
