import { supabase } from '@/integrations/supabase/client';
import { loggerService } from '@/services/loggerService';

export const viewsService = {
  alertasRH: async () => {
    try {
      const { data, error } = await supabase.from('vw_alertas_rh').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      loggerService.warn('View vw_alertas_rh not found or inaccessible', { view: 'vw_alertas_rh' });
      return [];
    }
  },
  kpiTurnover: async () => {
    try {
      const { data, error } = await supabase.from('vw_kpi_turnover').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      loggerService.warn('View vw_kpi_turnover not found or inaccessible', { view: 'vw_kpi_turnover' });
      return [];
    }
  },
  kpiAbsenteismo: async () => {
    try {
      const { data, error } = await supabase.from('vw_kpi_absenteismo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      loggerService.warn('View vw_kpi_absenteismo not found or inaccessible', { view: 'vw_kpi_absenteismo' });
      return [];
    }
  },
  kpiBeneficiosCusto: async () => {
    try {
      const { data, error } = await supabase.from('vw_kpi_beneficios_custo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  kpiPontoResumo: async () => {
    try {
      const { data, error } = await supabase.from('vw_kpi_ponto_resumo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  bancoHorasSaldo: async () => {
    try {
      const { data, error } = await supabase.from('vw_banco_horas_saldo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  feriasResumo: async () => {
    try {
      const { data, error } = await supabase.from('vw_ferias_resumo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  faltasMensal: async () => {
    try {
      const { data, error } = await supabase.from('vw_faltas_mensal').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  cadastroIncompleto: async () => {
    try {
      const { data, error } = await supabase.from('vw_cadastro_incompleto').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  colaboradoresCompleto: async (limit = 100) => {
    try {
      const { data, error } = await supabase.from('vw_colaboradores_completo').select('*').limit(limit);
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  dashboardTime: async () => {
    try {
      const { data, error } = await supabase.from('vw_dashboard_time').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  batidasDia: async (data_ref: string) => {
    try {
      const { data, error } = await supabase.from('vw_batidas_dia').select('*').eq('data', data_ref);
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  batidasResumo: async () => {
    try {
      const { data, error } = await supabase.from('vw_batidas_resumo').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  folhaPontoMensal: async () => {
    try {
      const { data, error } = await supabase.from('vw_folha_ponto_mensal').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  alertasCompensacao: async () => {
    try {
      const { data, error } = await supabase.from('vw_alertas_compensacao').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
  saldoCompensacaoMensal: async () => {
    try {
      const { data, error } = await supabase.from('vw_saldo_compensacao_mensal').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },
};
