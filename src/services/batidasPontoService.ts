import { supabase } from '@/integrations/supabase/client';
import { pontoAuditService } from './pontoAuditService';
export const batidasPontoService = {
  async listar(colaboradorId: string, dataInicio?: string, dataFim?: string, empresaId?: string): Promise<any[]> {
    if (empresaId !== undefined && !empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any)
      .from('batidas_ponto')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .order('data')
      .order('ordem');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    if (dataInicio) q = q.gte('data', dataInicio);
    if (dataFim) q = q.lte('data', dataFim);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async listarPorData(data: string, empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = (supabase as any)
      .from('batidas_ponto')
      .select('*, colaborador:colaboradores!batidas_ponto_colaborador_id_fkey(nome_completo, foto_url)')
      .eq('data', data)
      .order('ordem');
    q = q.eq('empresa_id', empresaId);
    const { data: result, error } = await q;
    if (error) throw error;
    return result || [];
  },
  /**
   * Batidas de um INTERVALO de datas locais (`yyyy-MM-dd`), com o colaborador
   * embutido — usado pelo painel de Geofencing, que precisa do período inteiro
   * (e não só do dia) para calcular conformidade, faixas de distância e a
   * comparação com o período anterior.
   *
   * O filtro de tenant é obrigatório aqui como em todas as leituras deste
   * serviço: sem `empresa_id` não há isolamento e a consulta é recusada em vez
   * de rodar contra os dados de outra empresa.
   */
  async listarPorPeriodo(empresaId: string, dataInicio: string, dataFim: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    if (!dataInicio || !dataFim) throw new Error('intervalo de datas obrigatório para listar batidas');

    const { data: result, error } = await (supabase as any)
      .from('batidas_ponto')
      .select('*, colaborador:colaboradores!batidas_ponto_colaborador_id_fkey(nome_completo, foto_url)')
      .eq('empresa_id', empresaId)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data')
      .order('hora');
    if (error) throw error;
    return result || [];
  },
  async registrar(d: any): Promise<any> {
    const { data, error } = await (supabase as any).from('batidas_ponto').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de batida de ponto foi retornado.');
    return data;
  },
  async ajustar(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    try {
      const { data: anterior } = await (supabase as any)
        .from('batidas_ponto')
        .select('*')
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .single();

      const { data, error } = await (supabase as any)
        .from('batidas_ponto')
        .update({ ...d, ajustado: true })
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .select()
        .maybeSingle();
      if (error) throw error;

      if (data) {
        await pontoAuditService.logAdjustment(id, anterior, data);
      }

      if (!data) throw new Error('Nenhum registro de batida de ponto foi retornado.');
      return data;
    } catch (e) {
      throw new Error('Falha ao ajustar batida de ponto', { cause: e });
    }
  },
  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data: anterior } = await (supabase as any)
      .from('batidas_ponto')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .single();

    const { error } = await (supabase as any).from('batidas_ponto').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

    if (anterior) {
      await pontoAuditService.logExclusion(id, anterior);
    }
  },
  async fecharPeriodo(empresaId: string, dataInicio: string, dataFim: string): Promise<any> {
    const { data, error } = await (supabase as any)
      .from('periodos_ponto')
      .insert({
        empresa_id: empresaId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: 'fechado',
        fechado_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await pontoAuditService.logMassAction(empresaId, 'FECHAMENTO_PERIODO', { dataInicio, dataFim });
    return data;
  },
};
