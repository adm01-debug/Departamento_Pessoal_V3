import { BaseService, ListOptions, ListResponse } from './baseService';
// MOCK VISUAL — ver src/mocks/admissoesMock.ts
import { mockAdmissaoCriada, mockAdmissaoAtualizada } from '@/mocks/admissoesMock';

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
    return (data as any[]) || [];
  }

  // Aliases
  async getAll(empresaId: string) { return this.listarAdmissoes(empresaId); }


  // ── MOCK VISUAL — ver src/mocks/admissoesMock.ts ──────────────────────────
  // Em modo demonstrativo as escritas são absorvidas em memória para a UI
  // continuar responsiva (Kanban, Nova Admissão, Concluir/Cancelar) sem gravar
  // nada no Supabase. Fora do modo mock os guards devolvem undefined e o
  // comportamento original é mantido intacto.
  async criar(d: any) {
    const mock = mockAdmissaoCriada(d);
    if (mock) return mock;
    return super.criar(d);
  }

  async atualizar(id: string, d: any, empresaId?: string) {
    const mock = mockAdmissaoAtualizada(id, d);
    if (mock) return mock;
    return super.atualizar(id, d, empresaId);
  }

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
