import { BaseService } from './baseService';
import { loggerService } from './loggerService';
import type { Insertable, Tables, Updatable } from '@/integrations/supabase/database.types';
import { mockOr, getMockVinculosPorColaborador, getMockVinculosResumo } from '@/mocks/colaboradoresMock';

export type VinculoRow = Tables<'vinculos'>;

export interface VinculosResumo {
  quantidadePassagens: number;
  quantidadeRecontratacoes: number;
  primeiraAdmissao: string | null;
  admissaoAtual: string | null;
  /**
   * Maior `data_fim` entre as passagens já encerradas. O resumo só trazia datas
   * de INÍCIO, então quem validava "a nova admissão é posterior?" contra
   * `admissaoAtual` aceitava data anterior ao último desligamento — as duas
   * passagens ficavam sobrepostas em `vinculos`.
   */
  ultimoEncerramento: string | null;
}

// `vinculos` não tem `empresa_id` própria — o isolamento de tenant é feito
// pela RLS via join com `colaboradores` (policy `tenant_vinculos`, authenticated/ALL).
class VinculoService extends BaseService<VinculoRow, Insertable<'vinculos'>, Updatable<'vinculos'>, false> {
  constructor() {
    super('vinculos', { requireEmpresaId: false });
  }

  async listarPorColaborador(colaboradorId?: string): Promise<VinculoRow[]> {
    const mock = mockOr(getMockVinculosPorColaborador(colaboradorId));
    if (mock !== undefined) return mock as unknown as VinculoRow[];
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
  async criarVinculoInicial(
    colaboradorId: string,
    dataInicio: string,
    tipo: 'Admissão' | 'Readmissão' = 'Admissão'
  ): Promise<void> {
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

  /**
   * Registra uma passagem JÁ ENCERRADA. Usado ao recontratar cadastro legado
   * (nenhuma linha em `vinculos`): sem ela o único vínculo passa a ser a
   * readmissão e `useHistoricoColaborador` — que usa
   * `colaboradores.data_admissao` como fallback da admissão inicial SÓ enquanto
   * não existe vínculo nenhum (useHistoricoColaborador.ts:298-318) — rotula a
   * readmissão como "Admissão inicial" e a passagem antiga desaparece da linha
   * do tempo. Best-effort — ver `criarVinculoInicial`.
   */
  async criarVinculoHistorico(colaboradorId: string, dataInicio: string, dataFim: string): Promise<void> {
    try {
      if (!colaboradorId || !dataInicio || !dataFim) return;
      const { error } = await this.getQuery().insert({
        colaborador_id: colaboradorId,
        tipo: 'Admissão',
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: 'encerrado',
      });
      if (error) throw error;
    } catch (e) {
      loggerService.error('Falha ao registrar passagem anterior', { colaboradorId, dataInicio, dataFim }, e as Error);
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
    if (mock) return mock as unknown as Record<string, VinculosResumo>;

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
      const encerramentos = ordenados.map((v) => v.data_fim).filter((d): d is string => !!d);
      result[colaboradorId] = {
        quantidadePassagens: ordenados.length,
        quantidadeRecontratacoes: Math.max(ordenados.length - 1, 0),
        primeiraAdmissao: ordenados[0]?.data_inicio ?? null,
        admissaoAtual: (aberto ?? ordenados[ordenados.length - 1])?.data_inicio ?? null,
        ultimoEncerramento: encerramentos.length > 0 ? encerramentos.reduce((a, b) => (a > b ? a : b)) : null,
      };
    }

    return result;
  }
}

export const vinculoService = new VinculoService();
