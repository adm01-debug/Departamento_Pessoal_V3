import { supabase } from '@/integrations/supabase/client';
import { loggerService } from '@/services/loggerService';

function rethrowViewError(view: string, cause: unknown): never {
  const error = cause instanceof Error ? cause : new Error(String(cause));
  loggerService.error('Falha ao consultar view', { view }, error);
  throw error;
}

export const viewsService = {
  alertasRH: async () => {
    try {
      const { data, error } = await supabase.from('vw_alertas_rh').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_alertas_rh', e);
    }
  },
  kpiTurnover: async () => {
    try {
      const { data, error } = await supabase.from('vw_kpi_turnover').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_kpi_turnover', e);
    }
  },
  kpiAbsenteismo: async () => {
    try {
      const { data, error } = await supabase.from('vw_kpi_absenteismo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_kpi_absenteismo', e);
    }
  },
  kpiBeneficiosCusto: async () => {
    try {
      const { data, error } = await supabase.from('vw_kpi_beneficios_custo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_kpi_beneficios_custo', e);
    }
  },
  kpiPontoResumo: async () => {
    try {
      const { data, error } = await supabase.from('vw_kpi_ponto_resumo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_kpi_ponto_resumo', e);
    }
  },
  bancoHorasSaldo: async () => {
    try {
      const { data, error } = await supabase.from('vw_banco_horas_saldo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_banco_horas_saldo', e);
    }
  },
  feriasResumo: async () => {
    try {
      const { data, error } = await supabase.from('vw_ferias_resumo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_ferias_resumo', e);
    }
  },
  faltasMensal: async () => {
    try {
      const { data, error } = await supabase.from('vw_faltas_mensal').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_faltas_mensal', e);
    }
  },
  cadastroIncompleto: async () => {
    try {
      const { data, error } = await supabase.from('vw_cadastro_incompleto').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_cadastro_incompleto', e);
    }
  },
  colaboradoresCompleto: async (limit = 100) => {
    try {
      const { data, error } = await supabase.from('vw_colaboradores_completo').select('*').limit(limit);
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_colaboradores_completo', e);
    }
  },
  dashboardTime: async () => {
    try {
      const { data, error } = await supabase.from('vw_dashboard_time').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_dashboard_time', e);
    }
  },
  batidasDia: async (data_ref: string) => {
    try {
      const { data, error } = await supabase.from('vw_batidas_dia').select('*').eq('data', data_ref);
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_batidas_dia', e);
    }
  },
  batidasResumo: async () => {
    try {
      const { data, error } = await supabase.from('vw_batidas_resumo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_batidas_resumo', e);
    }
  },
  folhaPontoMensal: async () => {
    try {
      const { data, error } = await supabase.from('vw_folha_ponto_mensal').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_folha_ponto_mensal', e);
    }
  },
  alertasCompensacao: async () => {
    try {
      const { data, error } = await supabase.from('vw_alertas_compensacao').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_alertas_compensacao', e);
    }
  },
  saldoCompensacaoMensal: async () => {
    try {
      const { data, error } = await supabase.from('vw_saldo_compensacao_mensal').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return rethrowViewError('vw_saldo_compensacao_mensal', e);
    }
  },
};
