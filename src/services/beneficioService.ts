import { BaseService, ListOptions, ListResponse } from './baseService';
import { auditLogger } from '@/utils/auditLogger';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type BeneficioRow = Tables<'beneficios'>;
type BeneficioVinculoRow = Tables<'beneficios_colaborador'> & {
  beneficio: Pick<Tables<'beneficios'>, 'id' | 'nome' | 'tipo' | 'empresa_id'>;
};

class BeneficioService extends BaseService<BeneficioRow, TablesInsert<'beneficios'>, Partial<TablesInsert<'beneficios'>>> {
  constructor() {
    super('beneficios', { 
      defaultOrderBy: 'nome' 
    });
  }

  async listar(options: ListOptions = {}): Promise<ListResponse<BeneficioRow>> {
    const { filters, search } = options;
    const empresaId = (filters as ListOptions['filters'])?.empresa_id as string | undefined;
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let query = this.getQuery().select('*', { count: 'exact' });
    query = query.eq('empresa_id', empresaId);
    if (search) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      query = query.ilike('nome', `%${escapedSearch}%`);
    }

    const { data, count, error } = await query.order('nome');
    if (error) throw error;
    return { data: (data as BeneficioRow[]) || [], total: count || 0 };
  }

  async listComAdesao(empresaId: string): Promise<BeneficioRow[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await this.getQuery()
      .select('*, beneficios_colaborador(count)')
      .eq('empresa_id', empresaId);
    if (error) throw error;
    return (data as BeneficioRow[]) || [];
  }

  async criar(d: TablesInsert<'beneficios'>): Promise<BeneficioRow> {
    try {
      const data = await super.criar(d);
      await auditLogger.log({
        tabela: 'beneficios',
        registro_id: data.id,
        acao: 'INSERT',
        dados_novos: data
      });
      return data;
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Falha ao criar benefício', { cause: e });
    }
  }

  async atualizar(id: string, d: Partial<TablesInsert<'beneficios'>>, empresaId?: string): Promise<BeneficioRow> {
    try {
      const anterior = await this.buscarPorId(id, empresaId);
      const data = await super.atualizar(id, d, empresaId);

      await auditLogger.log({
        tabela: 'beneficios',
        registro_id: id,
        acao: 'UPDATE',
        dados_anteriores: anterior,
        dados_novos: data
      });

      return data;
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Falha ao atualizar benefício', { cause: e });
    }
  }

  async excluir(id: string, empresaId?: string): Promise<void> {
    try {
      const anterior = await this.buscarPorId(id, empresaId);
      await super.excluir(id, empresaId);

      await auditLogger.log({
        tabela: 'beneficios',
        registro_id: id,
        acao: 'DELETE',
        dados_anteriores: anterior
      });
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Falha ao excluir benefício', { cause: e });
    }
  }

  async vincularColaborador(tipoBeneficioId: string, colaboradorId: string, dados: Partial<TablesInsert<'beneficios_colaborador'>>, empresaId: string): Promise<BeneficioVinculoRow> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('beneficios_colaborador').insert({
      tipo_beneficio_id: tipoBeneficioId,
      colaborador_id: colaboradorId,
      ...dados
    }).select().single();
    if (error) throw error;
    return data as unknown as BeneficioVinculoRow;
  }

  async listarPorColaborador(colaboradorId: string, empresaId: string): Promise<BeneficioVinculoRow[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    // !inner enables filtering on beneficio.empresa_id, excluding orphan/cross-tenant rows
    const { data, error } = await supabase
      .from('beneficios_colaborador')
      .select('*, beneficio:tipos_beneficio!inner(*)')
      .eq('colaborador_id', colaboradorId)
      .eq('beneficio.empresa_id', empresaId);
    if (error) throw error;
    return (data as unknown as BeneficioVinculoRow[]) || [];
  }

  async obterResumoCustos(empresaId: string): Promise<Record<string, { empresa: number; colaborador: number; total: number }>> {
    const { data, error } = await supabase
      .from('beneficios_colaborador')
      .select(`
        id,
        valor,
        tipo_beneficio:tipos_beneficio!inner (
          id,
          nome,
          desconto_colaborador
        ),
        colaborador:colaboradores!inner (
          empresa_id
        )
      `)
      .eq('colaborador.empresa_id', empresaId)
      .eq('status_vinculo', 'ativo');

    if (error) throw error;

    return (data || []).reduce((acc: Record<string, { empresa: number; colaborador: number; total: number }>, item: any) => {
      const tipo = item.tipo_beneficio.nome || 'Outros';
      if (!acc[tipo]) acc[tipo] = { empresa: 0, colaborador: 0, total: 0 };
      
      const vTotal = Number(item.valor) || 0;
      const descontoColab = Number(item.tipo_beneficio.desconto_colaborador) || 0;
      const vColab = vTotal * descontoColab;
      
      acc[tipo].empresa += (vTotal - vColab);
      acc[tipo].colaborador += vColab;
      acc[tipo].total += vTotal;
      
      return acc;
    }, {});
  }
}

export const beneficioService = new BeneficioService();
