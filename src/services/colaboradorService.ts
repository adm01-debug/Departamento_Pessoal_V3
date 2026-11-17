import type { ListOptions, ListResponse } from './baseService';
import { BaseService } from './baseService';
import type { Colaborador } from '@/types/entities';
import { colaboradorSchema } from '@/schemas/colaborador';
import { validateInput } from '@/schemas/validate';
import { supabase } from '@/integrations/supabase/client';
import { registrarAcessoPII } from './piiAccessLogService';

// Teto da external-db-bridge (MAX_LIMIT em supabase/functions/external-db-bridge/index.ts).
const MAX_LINHAS_OPCOES_FILTRO = 1000;

// A bridge rejeita expressao `or` com mais de 500 caracteres
// (external-db-bridge/validation.ts, isSafeOrExpression). A busca repete o termo
// em 5 colunas (89 caracteres fixos + 4 virgulas), entao acima de ~81 caracteres
// a listagem quebrava com INVALID_OR_FILTER em vez de so nao achar nada. 60 deixa
// folga para a clausula de CPF: 93 + 5*60 + 13 + 11 = 417.
const LIMITE_TERMO_BUSCA = 60;

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
    const columns =
      'id, nome_completo, cpf, email, status, data_admissao, empresa_id, matricula, foto_url, telefone, cargo, departamento';
    let query = this.getQuery().select(columns, { count: 'exact' });

    query = query.eq('empresa_id', empresaId);
    if (status && status !== 'all') query = query.eq('status', status);
    if (departamento && departamento !== 'all') query = query.eq('departamento', departamento);
    if (cargo && cargo !== 'all') query = query.eq('cargo', cargo);

    if (search) {
      // `cpf` é gravado apenas com dígitos (ver CPFInput/ColaboradorFormPage),
      // então a busca por CPF precisa remover TODA formatação (inclusive "-"),
      // enquanto os demais campos usam a sanitização genérica (que protege o
      // ilike/or contra os caracteres especiais % _ . , ( ) ).
      const s = search.replace(/[%_.,()]/g, '').slice(0, LIMITE_TERMO_BUSCA);
      // Clausula de CPF so quando o termo e mesmo um numero formatado: buscar a
      // matricula 'A12' viraria `cpf.ilike.%12%` e traria todo colaborador cujo
      // CPF contenha 12, sem nenhum campo casando com o que foi digitado.
      const cpfDigits = /^[\d.\-/\s]+$/.test(search.trim()) ? search.replace(/\D/g, '').slice(0, 11) : '';
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

  /**
   * Opções dos dropdowns de filtro (Departamento/Cargo) — derivadas dos valores
   * realmente presentes em `colaboradores.departamento`/`.cargo`, e não das
   * tabelas mestre `departamentos`/`cargos`: essas colunas são texto livre
   * (migration 002_colaboradores.sql) e não FK, então as tabelas mestre podem
   * divergir do texto gravado e oferecer opção que não casa com colaborador
   * nenhum (filtro que devolve lista vazia).
   *
   * O `.limit()` e OBRIGATORIO: um select sem limite nao manda `limit` no
   * payload da bridge (client.ts createQueryBuilder) e a external-db-bridge
   * aplica o default de 100 linhas (index.ts `queryLimit`), sem ORDER BY —
   * as opcoes sairiam de um subconjunto arbitrario dos colaboradores.
   *
   * LIMITE CONHECIDO: 1000 e o teto da bridge (MAX_LIMIT), nao ha como pedir
   * mais em uma chamada. Numa empresa com mais de 1000 colaboradores, um valor
   * que apareca somente fora desse primeiro lote nao entra no dropdown (a busca
   * por texto continua achando o colaborador). A correcao definitiva e uma RPC
   * de valores distintos no banco — funcao nova em producao, decisao do dono.
   */
  async listarOpcoesFiltro(empresaId: string): Promise<{ departamentos: string[]; cargos: string[] }> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    const { data, error } = await this.getQuery()
      .select('departamento, cargo')
      .eq('empresa_id', empresaId)
      .limit(MAX_LINHAS_OPCOES_FILTRO);
    if (error) throw error;

    const rows = (Array.isArray(data) ? data : []) as { departamento?: string | null; cargo?: string | null }[];

    const uniqueSorted = (values: (string | null | undefined)[]) =>
      Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return {
      departamentos: uniqueSorted(rows.map((r) => r.departamento)),
      cargos: uniqueSorted(rows.map((r) => r.cargo)),
    };
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
    validateInput(colaboradorSchema, payload, 'colaboradorService.criar');
    try {
      return await super.criar(payload);
    } catch (e) {
      throw this.mapDuplicidadeError(e);
    }
  }

  async atualizar(id: string, payload: Record<string, unknown>, empresaId: string): Promise<Colaborador> {
    validateInput(colaboradorSchema, payload, 'colaboradorService.atualizar');
    try {
      return await super.atualizar(id, payload, empresaId);
    } catch (e) {
      throw this.mapDuplicidadeError(e);
    }
  }

  // Alias for backward compatibility
  async list(empresaId: string, _semMock = false) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    return (await this.listar({ filters: { empresaId }, pageSize: 1000 })).data;
  }

  /**
   * Subordinados diretos de um gestor (Dossiê → Trabalho & Hierarquia).
   *
   * Consulta própria porque `list()` seleciona um conjunto fixo e enxuto de
   * colunas (ver `columns` em `listar`) que NÃO inclui `supervisor_id` nem
   * `cargo`: filtrar a lista inteira no cliente por `supervisor_id` devolvia
   * sempre zero. Aqui o filtro é no banco, trazendo só as linhas do gestor.
   */
  async listarSubordinados(supervisorId: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await this.getQuery()
      .select('id, nome_completo, cargo, foto_url')
      .eq('empresa_id', empresaId)
      .eq('supervisor_id', supervisorId)
      .order('nome_completo');
    if (error) throw error;
    return (data ?? []) as { id: string; nome_completo: string; cargo: string | null; foto_url: string | null }[];
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
