import { BaseService, ListOptions, ListResponse } from './baseService';
import { auditLogger } from '@/utils/auditLogger';

class DesligamentoService extends BaseService<any> {
  constructor() {
    super('desligamentos', { 
      defaultOrderBy: 'data_desligamento' 
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<any>> {
    const { filters } = options;
    const empresaId = (filters as any)?.empresa_id;
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let query = this.getQuery()
      .select('*, colaborador:colaboradores(nome_completo)', { count: 'exact' })
      .order('data_desligamento', { ascending: false })
      .limit(500);

    query = query.eq('empresa_id', empresaId);

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  async criar(d: any): Promise<any> {
    try {
      if (!d.colaborador_id) throw new Error('Colaborador é obrigatório');
      if (!d.data_desligamento) throw new Error('Data de desligamento é obrigatória');
      if (!d.tipo) throw new Error('Tipo de rescisão é obrigatório');
      if (!d.empresa_id) throw new Error('Empresa é obrigatória');

      const sanitized = {
        ...d,
        motivo: d.motivo?.trim().slice(0, 1000) || null,
        status: d.status || 'pendente',
        etapa: d.etapa || 'comunicacao'
      };

      const data = await super.criar(sanitized);

      if (data) {
        await auditLogger.log({
          tabela: 'desligamentos',
          registro_id: data.id,
          acao: 'INSERT',
          dados_novos: data,
        });
      }

      return data;
    } catch (e: any) {
      throw new Error(e.message || 'Erro ao criar desligamento', { cause: e });
    }
  }

  async atualizar(id: string, d: any, empresaId?: string): Promise<any> {
    if (!id) throw new Error('ID é obrigatório');

    try {
      const anterior = await this.buscarPorId(id, empresaId);
      const data = await super.atualizar(id, d, empresaId);

      if (data) {
        await auditLogger.log({
          tabela: 'desligamentos',
          registro_id: id,
          acao: 'UPDATE',
          dados_anteriores: anterior,
          dados_novos: data,
        });
      }

      return data;
    } catch (e: any) {
      throw new Error('Falha ao atualizar desligamento', { cause: e });
    }
  }

  async excluir(id: string, empresaId?: string): Promise<void> {
    if (!id) throw new Error('ID é obrigatório');

    try {
      const anterior = await this.buscarPorId(id, empresaId);
      await super.excluir(id, empresaId);

      await auditLogger.log({
        tabela: 'desligamentos',
        registro_id: id,
        acao: 'DELETE',
        dados_anteriores: anterior,
      });
    } catch (e: any) {
      throw new Error('Falha ao excluir desligamento', { cause: e });
    }
  }
}

export const desligamentoService = new DesligamentoService();
