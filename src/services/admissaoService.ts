import { BaseService, ListOptions, ListResponse } from './baseService';

class AdmissaoService extends BaseService<any> {
  constructor() {
    super('admissoes', { 
      defaultOrderBy: 'data_prevista' 
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<any>> {
    const { filters } = options;
    const empresaId = (filters as any)?.empresa_id;
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const data = await this.listarAdmissoes(empresaId);
    return { data, total: data.length };
  }

  async listarAdmissoes(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let query = this.getQuery().select('*').order('data_prevista', { ascending: false });
    query = query.eq('empresa_id', empresaId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Aliases
  async getAll(empresaId: string) { return this.listarAdmissoes(empresaId); }


  async getById(id: string) { return this.buscarPorId(id); }
  async create(d: any) { return this.criar(d); }
  async update(id: string, d: any, empresaId: string) { return this.atualizar(id, d, empresaId); }
  async concluir(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return this.atualizar(id, { etapa: 'concluida' }, empresaId);
  }
  async cancelar(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return this.atualizar(id, { etapa: 'cancelada' }, empresaId);
  }
}

export const admissaoService = new AdmissaoService();
