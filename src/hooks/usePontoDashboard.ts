/**
 * @fileoverview Consultas agregadas que alimentam os cards de resumo do
 * Controle de Ponto (Situação da Equipe, Pendências e Fechamento).
 *
 * Os três cards olham para o MESMO recorte — colaboradores ativos da empresa
 * + registros do mês corrente. Antes, cada card abriria a própria consulta
 * (três idas ao banco para ler as mesmas linhas); aqui há fonte única com
 * `queryKey` por empresa, então os cards compartilham o cache do React Query.
 *
 * Regra de tenant: toda consulta filtra por `empresa_id` da empresa ativa e
 * fica DESABILITADA sem empresa — `eq('empresa_id', '')` devolveria vazio em
 * silêncio e o card mostraria "zero pendências" sem ser verdade.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from './useEmpresas';
import { formatDateLocalISO } from '@/utils/dateLocal';

/** Janela de apuração (primeiro e último dia, em `YYYY-MM-DD`). */
export interface PeriodoApuracao {
  inicio: string;
  fim: string;
}

/** Colaborador com vínculo ativo — o mínimo para contar e nomear a equipe. */
export interface ColaboradorEquipe {
  id: string;
  nome_completo: string;
}

/**
 * Recorte de `registros_ponto` usado nos resumos.
 *
 * Só as colunas lidas pelos cards: horas em texto `HH:MM`, atraso em minutos e
 * as quatro marcações do dia (a jornada é considerada aberta quando falta a
 * última saída).
 */
export interface RegistroPontoResumo {
  id: string;
  colaborador_id: string;
  data: string;
  entrada_1: string | null;
  saida_1: string | null;
  entrada_2: string | null;
  saida_2: string | null;
  horas_trabalhadas: string | null;
  horas_extras: string | null;
  horas_falta: string | null;
  atraso_minutos: number | null;
}

/** Cache curto: o ponto muda durante o dia, mas não a cada segundo. */
const STALE_TIME_RESUMO = 60_000;

/**
 * Primeiro e último dia do mês corrente no fuso LOCAL.
 *
 * `new Date(ano, mes + 1, 0)` devolve o último dia do mês certo mesmo em
 * fevereiro bissexto — sem tabela de dias e sem `toISOString` (que trocaria
 * de dia em UTC-3 à noite).
 */
export function periodoDoMesCorrente(referencia: Date = new Date()): PeriodoApuracao {
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const fim = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);
  return { inicio: formatDateLocalISO(inicio), fim: formatDateLocalISO(fim) };
}

/**
 * Colaboradores com vínculo ativo da empresa (nome + id).
 *
 * Devolve a lista — e não só o `count` — porque os cards precisam do NOME em
 * "jornadas em aberto". Trazer id + nome numa consulta evita o embed
 * `colaboradores!registros_ponto_colaborador_id_fkey(...)` (que depende do
 * nome da constraint e quebra se o schema divergir).
 */
export function useColaboradoresEquipePonto() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id ?? null;

  return useQuery({
    queryKey: ['ponto-equipe-ativa', empresaId],
    queryFn: async (): Promise<ColaboradorEquipe[]> => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome_completo')
        .eq('empresa_id', empresaId)
        .eq('status', 'ativo')
        .order('nome_completo')
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as ColaboradorEquipe[];
    },
    enabled: !!empresaId,
    staleTime: STALE_TIME_RESUMO,
  });
}

/**
 * Registros de ponto da empresa na janela informada (mês corrente por padrão).
 *
 * `limit(5000)` é teto de segurança: uma empresa de 200 pessoas × 31 dias gera
 * ~6.200 linhas, então o card agrega o que veio e o "*" fica explícito no
 * `select` (só as colunas do resumo, sem `hash_digital`/`metadata`).
 */
export function useRegistrosPontoEmpresa(periodo: PeriodoApuracao) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id ?? null;

  return useQuery({
    queryKey: ['ponto-registros-competencia', empresaId, periodo.inicio, periodo.fim],
    queryFn: async (): Promise<RegistroPontoResumo[]> => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('registros_ponto')
        .select(
          'id, colaborador_id, data, entrada_1, saida_1, entrada_2, saida_2, horas_trabalhadas, horas_extras, horas_falta, atraso_minutos'
        )
        .eq('empresa_id', empresaId)
        .gte('data', periodo.inicio)
        .lte('data', periodo.fim)
        .order('data', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as RegistroPontoResumo[];
    },
    enabled: !!empresaId,
    staleTime: STALE_TIME_RESUMO,
  });
}

/**
 * Solicitações de ajuste aguardando decisão do RH.
 *
 * Usa `head: true` + `count: 'exact'`: o card só precisa do número, não das
 * linhas. O filtro de status é o mesmo de `PontoAdjustmentRequests`
 * (`status === 'pendente'`).
 */
export function useSolicitacoesAjustePontoPendentes() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id ?? null;

  return useQuery({
    queryKey: ['ponto-ajustes-pendentes', empresaId],
    queryFn: async (): Promise<number> => {
      if (!empresaId) return 0;
      const { count, error } = await supabase
        .from('solicitacoes_ajuste_ponto')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('status', 'pendente');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!empresaId,
    staleTime: STALE_TIME_RESUMO,
  });
}
