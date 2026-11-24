import { BaseService, ListOptions, ListResponse } from './baseService';

export interface FolhaRecord {
  id: string;
  empresa_id: string;
  competencia: string;
  data_pagamento?: string;
  salario_base?: number;
  total_proventos?: number;
  total_descontos?: number;
  total_liquido?: number;
  status: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FolhaFilters {
  competencia?: string;
  empresa_id?: string;
}

class FolhaService extends BaseService<FolhaRecord> {
  constructor() {
    super('folhas_pagamento', {
      defaultOrderBy: 'competencia'
    });
  }

  async list(competencia?: string, empresaId?: string): Promise<FolhaRecord[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let query = this.getQuery().select('*').order('competencia', { ascending: false }).limit(500);

    query = query.eq('empresa_id', empresaId);
    if (competencia) query = query.eq('competencia', competencia);

    const { data, error } = await query;
    if (error) throw error;
    return (data as FolhaRecord[]) || [];
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<FolhaRecord>> {
    const { filters, search } = options;
    const competencia = search || (filters as FolhaFilters)?.competencia;
    const empresaId = (filters as FolhaFilters)?.empresa_id;
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const data = await this.list(competencia, empresaId);
    return { data, total: data.length };
  }

  // Alias
  async listarFolhas(competencia?: string, empresaId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return this.list(competencia, empresaId);
  }


}

export const folhaService = new FolhaService();
