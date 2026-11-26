import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Indicadores de pessoal servidos pelo banco a partir das materialized views
 * de dashboard (refresh diário 05:00). Antes existia só a MV: nenhuma API nem
 * tela consumia os dados.
 */
export interface IndicadoresPeriodo {
  dias: number;
  meses: number;
  corte: string;
  primeiro_mes: string;
}

export interface TurnoverMes {
  mes: string;
  admissoes: number;
  desligamentos: number;
  movimentacao: number;
  efetivo_inicio: number;
  efetivo_fim: number;
  turnover_pct: number | null;
}

export interface CadastroDia {
  data: string;
  departamento: string;
  status: string;
  total: number;
}

export interface CadastroDepartamento {
  departamento: string;
  total: number;
  ativos: number;
  em_ferias: number;
  afastados: number;
  desligados: number;
}

export interface AbsenteismoMes {
  mes: string;
  tipo: string;
  total: number;
  dias_totais: number | null;
  media_dias: number;
  em_andamento: number;
  encerrados: number;
}

export interface FeriasSaldoColaborador {
  colaborador_id: string;
  nome: string;
  departamento: string;
  admissao: string;
  saldo_dias: number;
  anos_trabalhados: number;
  gozos_12m: number;
}

export interface FeriasResumo {
  colaboradores: number;
  saldo_total_dias: number;
  saldo_medio_dias: number;
  acima_30_dias: number;
  sem_gozo_12m: number;
}

export interface IndicadoresAtualizacao {
  disponivel: boolean;
  agenda?: string | null;
  ultima_execucao?: string | null;
  ultimo_status?: string | null;
}

export interface IndicadoresPessoal {
  periodo: IndicadoresPeriodo;
  turnover_mensal: TurnoverMes[];
  cadastros_diarios: CadastroDia[];
  cadastros_por_departamento: CadastroDepartamento[];
  absenteismo: AbsenteismoMes[];
  ferias_saldo: FeriasSaldoColaborador[];
  ferias_resumo: FeriasResumo;
  atualizacao: IndicadoresAtualizacao | null;
}

export function useIndicadoresPessoal(empresaId?: string, dias = 90, meses = 12) {
  return useQuery({
    queryKey: ['indicadores-pessoal', empresaId, dias, meses],
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<IndicadoresPessoal> => {
      const { data, error } = await supabase.rpc('get_indicadores_pessoal', {
        p_empresa_id: empresaId as string,
        p_dias: dias,
        p_meses: meses,
      });

      if (error) throw error;
      return data as unknown as IndicadoresPessoal;
    },
  });
}
