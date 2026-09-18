import { BaseService, ListOptions, ListResponse } from './baseService';
import { Colaborador } from '@/types/entities';
import { supabaseBase } from '@/integrations/supabase/client';

class ColaboradorService extends BaseService<Colaborador> {
  constructor() {
    super('colaboradores', { 
      searchColumn: 'nome_completo', 
      defaultOrderBy: 'nome_completo',
      useVersioning: true 
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<Colaborador>> {
    const {
      search,
      page = 1,
      pageSize = 25,
      filters = {}
    } = options;

    const { status, departamento, cargo, empresaId } = filters;

    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    // Explicit column selection to prevent failures on missing optional columns in external DB
    const columns = 'id, nome_completo, cpf, email, status, data_admissao, empresa_id, matricula, foto_url, telefone, cargo, departamento';
    let query = this.getQuery().select(columns, { count: 'exact' });

    query = query.eq('empresa_id', empresaId);
    if (status && status !== 'all') query = query.eq('status', status);
    if (departamento && departamento !== 'all') query = query.eq('departamento', departamento);
    if (cargo && cargo !== 'all') query = query.eq('cargo', cargo);

    if (search) {
      // `cpf` é armazenado apenas com dígitos (ver CPFInput/ColaboradorFormPage),
      // então a busca por CPF precisa remover TODA formatação (inclusive "-"),
      // enquanto os demais campos usam a sanitização genérica (evita quebrar o
      // ilike por causa dos caracteres especiais % e _).
      const s = search.replace(/[%_.,()]/g, '');
      const cpfDigits = search.replace(/\D/g, '');
      const orParts: string[] = [];
      if (s) {
        orParts.push(
          `nome_completo.ilike.%${s}%`,
          `email.ilike.%${s}%`,
          `matricula.ilike.%${s}%`,
          `cargo.ilike.%${s}%`,
          `departamento.ilike.%${s}%`
        );
      }
      if (cpfDigits) orParts.push(`cpf.ilike.%${cpfDigits}%`);
      if (orParts.length) query = query.or(orParts.join(','));
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('nome_completo', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return { data: (data as Colaborador[]) || [], total: count || 0 };
  }

  async getSummary(empresaId: string, filters: any = {}) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    // Optimized: Run counts in parallel using Supabase count feature.
    // Os cinco valores abaixo são exatamente o enum `status_colaborador` do
    // banco (fonte de verdade) — não existe "inativo" no schema real.
    const { departamento, cargo } = filters;
    const statuses = ['ativo', 'pendente', 'desligado', 'ferias', 'afastado'] as const;

    const countPromises = statuses.map(async (status) => {
      let query = supabaseBase
        .from('colaboradores')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);

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

    results.forEach(r => {
      summary[r.status] = r.count;
    });
    
    return summary;
  }

  // Alias for backward compatibility
  async list(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return (await this.listar({ filters: { empresaId }, pageSize: 1000 })).data;
  }

  async getById(id: string) { return this.buscarPorId(id); }
  async create(d: any) { return this.criar(d); }
  async update(id: string, d: any, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return this.atualizar(id, d, empresaId);
  }

}

export const colaboradorService = new ColaboradorService();
