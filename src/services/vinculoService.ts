import { BaseService } from './baseService';
import { loggerService } from './loggerService';
import { mockOr, getMockVinculosPorColaborador, getMockVinculosResumo } from '@/mocks/colaboradoresMock';

export interface VinculoRow {
  id: string;
  colaborador_id: string;
  tipo: string;
  categoria: string | null;
  data_inicio: string;
  data_fim: string | null;
  matricula: string | null;
  status: string | null;
  created_at: string;
}

export interface VinculosResumo {
  quantidadePassagens: number;
  quantidadeRecontratacoes: number;
  primeiraAdmissao: string | null;
  admissaoAtual: string | null;
}

// `vinculos` não tem `empresa_id` própria — o isolamento de tenant é feito
// pela RLS via join com `colaboradores` (ver policy `vinculos_tenant_all`).
class VinculoService extends BaseService<VinculoRow> {
  constructor() {
    super('vinculos', { requireEmpresaId: false });
  }

  async listarPorColaborador(colaboradorId?: string): Promise<VinculoRow[]> {
    const mock = mockOr(getMockVinculosPorColaborador(colaboradorId));
    if (mock !== undefined) return mock;
    if (!colaboradorId) return [];

    const { data, error } = await this.getQuery()
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .order('data_inicio', { ascending: false });
    if (error) throw error;
    return (data as VinculoRow[]) || [];
  }

  /**
   * Cria o vínculo de abertura (1ª admissão ou recontratação). Best-effort:
   * uma falha aqui não pode travar a criação/recontratação do colaborador —
   * mesmo padrão de risco já aceito hoje entre `desligamentos` e
   * `colaboradores` em `rescisaoService.processarPagamento`.
   */
  async criarVinculoInicial(colaboradorId: string, dataInicio: string, tipo: 'Admissão' | 'Readmissão' = 'Admissão'): Promise<void> {
    try {
      if (!colaboradorId || !dataInicio) return;
      const { error } = await this.getQuery().insert({
        colaborador_id: colaboradorId,
        tipo,
        data_inicio: dataInicio,
        data_fim: null,
        status: 'ativo',
      });
      if (error) throw error;
    } catch (e) {
      loggerService.error('Falha ao criar vínculo inicial', { colaboradorId, dataInicio, tipo }, e as Error);
    }
  }

  /** Encerra o vínculo em aberto (`data_fim IS NULL`) do colaborador. Best-effort — ver `criarVinculoInicial`. */
  async fecharVinculoAberto(colaboradorId: string, dataFim: string): Promise<void> {
    try {
      if (!colaboradorId || !dataFim) return;
      const { data: aberto, error: findError } = await this.getQuery()
        .select('id')
        .eq('colaborador_id', colaboradorId)
        .is('data_fim', null)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (findError) throw findError;
      if (!aberto) return; // nada a fechar — ex.: colaborador legado sem vínculo registrado

      const { error } = await this.getQuery()
        .update({ data_fim: dataFim, status: 'encerrado' })
        .eq('id', (aberto as { id: string }).id);
      if (error) throw error;
    } catch (e) {
      loggerService.error('Falha ao fechar vínculo aberto', { colaboradorId, dataFim }, e as Error);
    }
  }

  /**
   * Uma única query `.in('colaborador_id', ids)` para todos os colaboradores
   * de uma página da listagem — evita N+1. Agregação (contagem, 1ª admissão,
   * admissão atual) é feita client-side sobre o resultado já filtrado.
   */
  async contarPassagensPorColaboradores(colaboradorIds: string[]): Promise<Record<string, VinculosResumo>> {
    const result: Record<string, VinculosResumo> = {};
    if (colaboradorIds.length === 0) return result;

    const mock = mockOr(getMockVinculosResumo(colaboradorIds));
    if (mock) return mock;

    const { data, error } = await this.getQuery()
      .select('colaborador_id, data_inicio, data_fim')
      .in('colaborador_id', colaboradorIds);
    if (error) throw error;

    const porColaborador = new Map<string, { data_inicio: string; data_fim: string | null }[]>();
    for (const row of (data as { colaborador_id: string; data_inicio: string; data_fim: string | null }[]) || []) {
      const lista = porColaborador.get(row.colaborador_id) || [];
      lista.push(row);
      porColaborador.set(row.colaborador_id, lista);
    }

    for (const [colaboradorId, vinculos] of porColaborador) {
      const ordenados = [...vinculos].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
      const aberto = ordenados.find((v) => !v.data_fim);
      result[colaboradorId] = {
        quantidadePassagens: ordenados.length,
        quantidadeRecontratacoes: Math.max(ordenados.length - 1, 0),
        primeiraAdmissao: ordenados[0]?.data_inicio ?? null,
        admissaoAtual: (aberto ?? ordenados[ordenados.length - 1])?.data_inicio ?? null,
      };
    }

    return result;
  }
}

export const vinculoService = new VinculoService();
