import { BaseService, ListOptions, ListResponse } from './baseService';
import { auditLogger } from '@/utils/auditLogger';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';

type DesligamentoComColaborador = Tables<'desligamentos'> & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
};

class DesligamentoService extends BaseService<
  Tables<'desligamentos'>,
  Insertable<'desligamentos'>,
  Updatable<'desligamentos'>
> {
  constructor() {
    super('desligamentos', {
      defaultOrderBy: 'data_desligamento',
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<DesligamentoComColaborador>> {
    const { filters } = options;
    const empresaId = filters?.empresa_id as string | undefined;
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let query = this.getQuery()
      .select('*, colaborador:colaboradores(nome_completo)', { count: 'exact' })
      .order('data_desligamento', { ascending: false })
      .limit(500);

    query = query.eq('empresa_id', empresaId);

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: (data as DesligamentoComColaborador[]) || [], total: count || 0 };
  }

  async criar(d: Insertable<'desligamentos'>): Promise<Tables<'desligamentos'>> {
    try {
      if (!d.colaborador_id) throw new Error('Colaborador é obrigatório');
      if (!d.data_desligamento) throw new Error('Data de desligamento é obrigatória');
      if (!d.tipo) throw new Error('Tipo de rescisão é obrigatório');
      if (!d.empresa_id) throw new Error('Empresa é obrigatória');

      const sanitized = {
        ...d,
        motivo: d.motivo?.trim().slice(0, 1000) || null,
        status: d.status || 'pendente',
        etapa: d.etapa || 'comunicacao',
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
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Erro ao criar desligamento', { cause: e });
    }
  }

  async atualizar(id: string, d: Updatable<'desligamentos'>, empresaId?: string): Promise<Tables<'desligamentos'>> {
    if (!id) throw new Error('ID é obrigatório');
    if (!empresaId) throw new Error('empresa_id obrigatório para atualizar desligamentos (isolamento de tenant)');

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
    } catch (e) {
      throw new Error('Falha ao atualizar desligamento', { cause: e });
    }
  }

  async excluir(id: string, empresaId?: string): Promise<void> {
    if (!id) throw new Error('ID é obrigatório');
    if (!empresaId) throw new Error('empresa_id obrigatório para excluir desligamentos (isolamento de tenant)');

    try {
      const anterior = await this.buscarPorId(id, empresaId);
      await super.excluir(id, empresaId);

      await auditLogger.log({
        tabela: 'desligamentos',
        registro_id: id,
        acao: 'DELETE',
        dados_anteriores: anterior,
      });
    } catch (e) {
      throw new Error('Falha ao excluir desligamento', { cause: e });
    }
  }
}

export const desligamentoService = new DesligamentoService();
