import { BaseService, ListOptions, ListResponse } from './baseService';
import { Colaborador } from '@/types/entities';
import { supabase } from '@/integrations/supabase/client';
import { registrarAcessoPII } from './piiAccessLogService';

class ColaboradorService extends BaseService<Colaborador> {
  constructor() {
    super('colaboradores', {
      searchColumn: 'nome_completo',
      defaultOrderBy: 'nome_completo',
      useVersioning: true,
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<Colaborador>> {
    const { search, page = 1, pageSize = 25, filters = {} } = options;

    const { status, departamento, cargo, empresaId } = filters;

    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    // Explicit column selection to prevent failures on missing optional columns in external DB
    const columns = 'id, nome_completo, cpf, email, status, data_admissao, empresa_id, matricula, foto_url, telefone';
    let query = this.getQuery().select(columns, { count: 'exact' });

    query = query.eq('empresa_id', empresaId);
    if (status && status !== 'all') query = query.eq('status', status);
    if (departamento && departamento !== 'all') query = query.eq('departamento', departamento);
    if (cargo && cargo !== 'all') query = query.eq('cargo', cargo);

    if (search) {
      const s = search.replace(/[%_.,()]/g, '');
      if (s) query = query.or(`nome_completo.ilike.%${s}%,cpf.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.order('nome_completo', { ascending: true }).range(from, to);

    if (error) throw error;

    // E-036 (LGPD art.37): trilha de leitura de PII — a listagem expõe CPF,
    // e-mail e telefone de N colaboradores por página (alvo clássico de
    // scraping; a view v_pii_access_suspeitos agrega por hora/usuário).
    const rows = Array.isArray(data) ? data : [];
    void registrarAcessoPII('colaboradores', 'select', {
      empresaId: typeof empresaId === 'string' ? empresaId : null,
      registroCount: rows.length,
    });

    return { data: (data as Colaborador[]) || [], total: count || 0 };
  }

  async getSummary(empresaId: string, filters: { departamento?: string; cargo?: string } = {}) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    // Optimized: Run counts in parallel using Supabase count feature
    const { departamento, cargo } = filters;
    const statuses = ['ativo', 'desligado', 'afastado', 'ferias'] as const;

    const countPromises = statuses.map(async (status) => {
      let query = supabase.from('colaboradores').select('id', { count: 'exact', head: true }).eq('status', status);

      query = query.eq('empresa_id', empresaId);
      if (departamento && departamento !== 'all') query = query.eq('departamento', departamento);
      if (cargo && cargo !== 'all') query = query.eq('cargo', cargo);

      const { count, error } = await query;
      if (error) return { status, count: 0 };
      return { status, count: count || 0 };
    });

    const results = await Promise.all(countPromises);

    const summary: Record<string, number> = {
      total: results.reduce((acc, r) => acc + r.count, 0),
    };

    results.forEach((r) => {
      summary[r.status] = r.count;
      // UI compatibility mapping
      if (r.status === 'desligado') summary.inativo = r.count;
    });

    return summary;
  }

  /**
   * E50-41: CPF/matrícula viraram identidade por empresa (E50-40 criou os
   * índices únicos compostos `colaboradores_empresa_{cpf,matricula}_key`),
   * mas as constraints globais antigas (`colaboradores_cpf_key`,
   * `colaboradores_matricula_key`) ainda existem -- E50-42 só as remove
   * depois de um ciclo de observação. Até lá, cadastrar a mesma pessoa em
   * duas empresas segue bloqueado de fato pela constraint antiga; a
   * mensagem tem que refletir isso, não fingir que já funciona.
   */
  private mapDuplicidadeError(e: unknown): unknown {
    const pgCode = (e as { code?: string })?.code;
    const msg = (e as { message?: string })?.message || '';
    if (pgCode === '23505') {
      if (msg.includes('colaboradores_empresa_cpf_key')) {
        return new Error('Já existe um colaborador com este CPF nesta empresa.');
      }
      if (msg.includes('colaboradores_empresa_matricula_key')) {
        return new Error('Já existe um colaborador com esta matrícula nesta empresa.');
      }
      if (msg.includes('colaboradores_cpf_key')) {
        return new Error(
          'Este CPF já está cadastrado em outra empresa do grupo. Vínculo em mais de uma empresa ainda não é suportado — contate o suporte.'
        );
      }
      if (msg.includes('colaboradores_matricula_key')) {
        return new Error('Esta matrícula já está em uso em outra empresa do grupo.');
      }
    }
    // Erro não relacionado a duplicidade -- rethrow como veio, sem mascarar
    // a mensagem original (PostgrestError não é instanceof Error).
    return e;
  }

  async criar(payload: Record<string, unknown>): Promise<Colaborador> {
    try {
      return await super.criar(payload);
    } catch (e) {
      throw this.mapDuplicidadeError(e);
    }
  }

  async atualizar(id: string, payload: Record<string, unknown>, empresaId: string): Promise<Colaborador> {
    try {
      return await super.atualizar(id, payload, empresaId);
    } catch (e) {
      throw this.mapDuplicidadeError(e);
    }
  }

  // Alias for backward compatibility
  async list(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return (await this.listar({ filters: { empresaId }, pageSize: 1000 })).data;
  }

  async getById(id: string, empresaId: string) {
    return this.buscarPorId(id, empresaId);
  }
  async create(d: Record<string, unknown>) {
    return this.criar(d);
  }
  async update(id: string, d: Record<string, unknown>, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return this.atualizar(id, d, empresaId);
  }
}

export const colaboradorService = new ColaboradorService();
