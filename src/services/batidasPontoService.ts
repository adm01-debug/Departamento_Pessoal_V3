import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { pontoAuditService } from './pontoAuditService';

type BatidaPonto = Tables<'batidas_ponto'>;
type PeriodoPonto = Tables<'periodos_ponto'>;
type BatidaComColaborador = BatidaPonto & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo' | 'foto_url'> | null;
};

export const batidasPontoService = {
  async listar(colaboradorId: string, dataInicio?: string, dataFim?: string, empresaId?: string): Promise<BatidaPonto[]> {
    if (empresaId !== undefined && !empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('batidas_ponto').select('*').eq('colaborador_id', colaboradorId).order('data').order('ordem');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    if (dataInicio) q = q.gte('data', dataInicio);
    if (dataFim) q = q.lte('data', dataFim);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as unknown as BatidaPonto[];

  },
  async listarPorData(data: string, empresaId: string): Promise<BatidaComColaborador[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('batidas_ponto').select('*, colaborador:colaboradores!batidas_ponto_colaborador_id_fkey(nome_completo, foto_url)').eq('data', data).order('ordem');
    q = q.eq('empresa_id', empresaId);
    const { data: result, error } = await q;
    if (error) throw error;
    return (result || []) as unknown as BatidaComColaborador[];

  },
  async registrar(d: any): Promise<BatidaPonto> {
    
    const { data, error } = await supabase.from('batidas_ponto').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de batida de ponto foi retornado.');
    return data as unknown as BatidaPonto;
  
  },
  async ajustar(id: string, d: TablesUpdate<'batidas_ponto'>, empresaId: string): Promise<BatidaPonto> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    try {
      const { data: anterior } = await supabase.from('batidas_ponto').select('*').eq('id', id).eq('empresa_id', empresaId).single();

      const { data, error } = await supabase.from('batidas_ponto').update({ ...d, ajustado: true }).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
      if (error) throw error;

      if (data) {
        await pontoAuditService.logAdjustment(id, anterior, data);
      }

      if (!data) throw new Error('Nenhum registro de batida de ponto foi retornado.');
      return data as unknown as BatidaPonto;
    } catch (e) {
      throw new Error('Falha ao ajustar batida de ponto', { cause: e });
    }
  },
  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data: anterior } = await supabase.from('batidas_ponto').select('*').eq('id', id).eq('empresa_id', empresaId).single();

    const { error } = await supabase.from('batidas_ponto').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

    if (anterior) {
      await pontoAuditService.logExclusion(id, anterior);
    }

  },
  async fecharPeriodo(empresaId: string, dataInicio: string, dataFim: string): Promise<PeriodoPonto> {
    
    const { data, error } = await supabase.from('periodos_ponto').insert({
      empresa_id: empresaId,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status: 'fechado',
      fechado_em: new Date().toISOString()
    } as unknown as TablesInsert<'periodos_ponto'>).select().single();
    
    if (error) throw error;
    
    await pontoAuditService.logMassAction(empresaId, 'FECHAMENTO_PERIODO', { dataInicio, dataFim });
    return data as unknown as PeriodoPonto;
  
  }
};


