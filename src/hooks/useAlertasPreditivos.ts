/**
 * useAlertasPreditivos — porta de entrada da edge `alertas-preditivos`.
 *
 * A edge existe e esta publicada em producao (sonda em 18/11/2026:
 * POST /functions/v1/alertas-preditivos devolve 405 para GET, ou seja esta no
 * ar), mas nenhum arquivo do `src` a invocava: o RH nunca via esses alertas.
 *
 * Deliberadamente uma MUTATION, nao uma query automatica: a edge INSERE em
 * `notificacoes` os alertas urgentes (index.ts:408). Rodar sozinha ao montar o
 * Dashboard criaria notificacao a cada visita. Quem dispara e o usuario.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Gravidade que a edge atribui a cada sinal (index.ts:147,231). */
export type NivelAlertaPreditivo = 'critica' | 'alta' | 'media';

/** Um sinal detectado para um colaborador (index.ts:168-175). */
export interface AlertaPreditivo {
  colaboradorId: string;
  nome: string;
  sinal: string;
  nivel: NivelAlertaPreditivo;
  justificativa: string;
  metrica: number;
}

/**
 * Resposta da edge. `status: 'sem_colaboradores'` vem do atalho de
 * index.ts:134, que responde 200 com `alertas: []` e sem os demais campos.
 */
export interface RespostaAlertasPreditivos {
  empresaId: string;
  mode: 'turnover' | 'absenteismo' | 'both';
  status?: 'sem_colaboradores';
  totalColaboradores?: number;
  turnoverRate3m?: number;
  alertasAbsenteismo?: AlertaPreditivo[];
  alertasTurnover?: AlertaPreditivo[];
  totalAlertas?: number;
  alertasCriticos?: number;
  iaResumo?: string | null;
  geradoEm?: string;
}

export function useAlertasPreditivos() {
  return useMutation<RespostaAlertasPreditivos, Error, { empresaId: string }>({
    mutationFn: async ({ empresaId }) => {
      const { data, error } = await supabase.functions.invoke<RespostaAlertasPreditivos>('alertas-preditivos', {
        body: { empresaId, mode: 'both' },
      });
      if (error) throw error;
      if (!data) throw new Error('Resposta vazia da analise preditiva');
      return data;
    },
  });
}
