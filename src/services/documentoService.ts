import { BaseService, ListOptions, ListResponse } from './baseService';
import { Documento } from '@/types/entities';

class DocumentoService extends BaseService<Documento> {
  constructor() {
    super('documentos', {
      searchColumn: 'nome',
      defaultOrderBy: 'created_at'
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<Documento>> {
    const { filters } = options;
    const colabId = (filters as any)?.colaborador_id;
    const empId = (filters as any)?.empresa_id;
    if (!empId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const data = await this.listarDocumentos(empId, colabId);
    return { data, total: data.length };
  }

  async listarDocumentos(empresaId: string, colaboradorId?: string): Promise<Documento[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let query = this.getQuery()
      .select('*, colaborador:colaboradores(id, nome_completo, cpf)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (colaboradorId) query = query.eq('colaborador_id', colaboradorId);

    const { data, error } = await query;
    if (error) throw error;
    return (data as Documento[]) || [];
  }


}

export const documentoService = new DocumentoService();
