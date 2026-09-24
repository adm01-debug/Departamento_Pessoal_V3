import { BaseService, ListOptions, ListResponse } from './baseService';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';

class AdmissaoService extends BaseService<Tables<'admissoes'>, Insertable<'admissoes'>, Updatable<'admissoes'>> {
  constructor() {
    super('admissoes', {
      defaultOrderBy: 'data_prevista',
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<Tables<'admissoes'>>> {
    const { filters } = options;
    const empresaId = filters?.empresa_id as string | undefined;
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const data = await this.listarAdmissoes(empresaId);
    return { data, total: data.length };
  }

  async listarAdmissoes(empresaId: string): Promise<Tables<'admissoes'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let query = this.getQuery().select('*').order('data_prevista', { ascending: false });
    query = query.eq('empresa_id', empresaId);
    const { data, error } = await query;
    if (error) throw error;
    return (data as Tables<'admissoes'>[]) || [];
  }

  // Aliases
  async getAll(empresaId: string) {
    return this.listarAdmissoes(empresaId);
  }

  async getById(id: string, empresaId: string) {
    return this.buscarPorId(id, empresaId);
  }
  async create(d: Insertable<'admissoes'>) {
    return this.criar(d);
  }
  async update(id: string, d: Updatable<'admissoes'>, empresaId: string) {
    return this.atualizar(id, d, empresaId);
  }
  // BUG PRÉ-EXISTENTE (achado ao tipar, não corrigido): o enum
  // `etapa_admissao` só tem 'solicitacao'|'documentos'|'validacao'|'pendente'|
  // 'exame'|'contrato'|'assinatura'|'esocial' — não existe 'concluida' nem
  // 'cancelada'. Chamar estes métodos contra o banco real sempre falharia
  // (violação do enum do Postgres). Não há coluna de status separada em
  // `admissoes` para representar esses dois estados. Nenhum lugar do app
  // chama `concluir`/`cancelar` hoje (apenas testes que mockam o DB e por
  // isso nunca pegaram o erro). Corrigir de verdade exige uma decisão de
  // produto (nova coluna? novo valor de enum? reaproveitar 'esocial' como
  // etapa final?) — fora do escopo de uma limpeza de tipos. O cast abaixo
  // preserva o comportamento exato de antes (quebrado) sem inventar uma
  // semântica nova.
  async concluir(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return this.atualizar(id, { etapa: 'concluida' as Tables<'admissoes'>['etapa'] }, empresaId);
  }
  async cancelar(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return this.atualizar(id, { etapa: 'cancelada' as Tables<'admissoes'>['etapa'] }, empresaId);
  }
}

export const admissaoService = new AdmissaoService();
