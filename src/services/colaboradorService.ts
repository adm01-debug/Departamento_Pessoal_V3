import { BaseService, ListOptions, ListResponse } from './baseService';
import { Colaborador } from '@/types/entities';
import { supabaseBase } from '@/integrations/supabase/client';
import { mockOr, MOCK_COLABORADORES, findMockColaborador } from '@/mocks/colaboradoresMock';
import { vinculoService } from './vinculoService';

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

    const mockList = mockOr(MOCK_COLABORADORES);
    if (mockList) {
      let items: unknown[] = [...mockList];
      if (status && status !== 'all') items = items.filter((c: any) => c.status === status);
      if (departamento && departamento !== 'all') items = items.filter((c: any) => c.departamento === departamento);
      if (cargo && cargo !== 'all') items = items.filter((c: any) => c.cargo === cargo);
      if (search) {
        const s = search.toLowerCase();
        const cpfDigits = search.replace(/\D/g, '');
        items = items.filter((c: any) =>
          c.nome_completo.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s) ||
          c.matricula.toLowerCase().includes(s) ||
          c.cargo.toLowerCase().includes(s) ||
          c.departamento.toLowerCase().includes(s) ||
          (!!cpfDigits && c.cpf.replace(/\D/g, '').includes(cpfDigits))
        );
      }
      const total = items.length;
      const from = (page - 1) * pageSize;
      return { data: items.slice(from, from + pageSize) as unknown as Colaborador[], total };
    }

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

  // Opções dos dropdowns de filtro (Departamento/Cargo) — derivadas dos
  // valores realmente presentes em `colaboradores.departamento`/`.cargo`
  // (texto livre), e não das tabelas mestre `departamentos`/`cargos`. Essas
  // tabelas podem não existir para a empresa ativa (ex.: modo mock de
  // VITE_COLABORADORES_MOCK, ver colaboradoresMock.ts) ou divergir do texto
  // realmente gravado nos colaboradores — nos dois casos o dropdown ficaria
  // vazio ou com opções que não batem com nenhum colaborador.
  async listarOpcoesFiltro(empresaId: string): Promise<{ departamentos: string[]; cargos: string[] }> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    const mockList = mockOr(MOCK_COLABORADORES);
    let rows: { departamento?: string | null; cargo?: string | null }[];

    if (mockList) {
      rows = mockList;
    } else {
      const { data, error } = await supabaseBase
        .from('colaboradores')
        .select('departamento, cargo')
        .eq('empresa_id', empresaId);
      if (error) throw error;
      rows = data || [];
    }

    const uniqueSorted = (values: (string | null | undefined)[]) =>
      Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return {
      departamentos: uniqueSorted(rows.map((r) => r.departamento)),
      cargos: uniqueSorted(rows.map((r) => r.cargo)),
    };
  }

  async getSummary(empresaId: string, filters: any = {}) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    const mockList = mockOr(MOCK_COLABORADORES);
    if (mockList) {
      const { departamento, cargo } = filters;
      let items: unknown[] = mockList;
      if (departamento && departamento !== 'all') items = items.filter((c: any) => c.departamento === departamento);
      if (cargo && cargo !== 'all') items = items.filter((c: any) => c.cargo === cargo);
      const summary: Record<string, number> = { total: items.length };
      for (const status of ['ativo', 'pendente', 'desligado', 'ferias', 'afastado'] as const) {
        summary[status] = items.filter((c: any) => c.status === status).length;
      }
      return summary;
    }

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

  async buscarPorId(id: string, empresaId?: string): Promise<Colaborador | null> {
    const mock = mockOr(findMockColaborador(id));
    if (mock) return mock;
    return super.buscarPorId(id, empresaId);
  }

  // Cria o colaborador e, em seguida, o vínculo de abertura (1ª admissão) na
  // tabela `vinculos` — fonte de verdade para "quantas passagens" a pessoa
  // teve na empresa. Best-effort: se a criação do vínculo falhar, o
  // colaborador já criado não é revertido (ver vinculoService.criarVinculoInicial).
  async criar(payload: Record<string, unknown>): Promise<Colaborador> {
    const colaborador = await super.criar(payload);
    if (colaborador?.id && colaborador?.data_admissao) {
      await vinculoService.criarVinculoInicial(colaborador.id, colaborador.data_admissao, 'Admissão');
    }
    return colaborador;
  }

  async getById(id: string) { return this.buscarPorId(id); }
  async create(d: any) { return this.criar(d); }
  async update(id: string, d: any, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return this.atualizar(id, d, empresaId);
  }

  /**
   * Recontratação: reaproveita o MESMO colaborador.id (CPF é UNIQUE — não há
   * como criar um segundo registro para a mesma pessoa). Atualiza o
   * colaborador com os dados profissionais aprovados no fluxo e registra uma
   * NOVA linha em `vinculos` (nunca sobrescreve/apaga vínculos anteriores).
   */
  async recontratar(
    id: string,
    dados: { data_admissao: string; cargo?: string; departamento?: string; salario_base?: number },
    empresaId: string
  ): Promise<Colaborador> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    if (!dados.data_admissao) throw new Error('Nova data de admissão é obrigatória para recontratação');

    const atualizado = await this.atualizar(
      id,
      { ...dados, status: 'ativo', data_desligamento: null } as Record<string, unknown>,
      empresaId
    );

    await vinculoService.criarVinculoInicial(id, dados.data_admissao, 'Readmissão');

    return atualizado;
  }
}

export const colaboradorService = new ColaboradorService();
