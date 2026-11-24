/**
 * ============================================================================
 * TURNOS & ESCALAS — FONTE DE DADOS DA TELA (React Query, zero mock).
 * ============================================================================
 *
 * Quatro consultas reais, todas isoladas por `empresa_id`:
 *
 *   1. `turnos`             → catálogo de turnos (mesma `queryKey` que a
 *                             `EditarEscalaDialog` do Ponto já usa, então as
 *                             duas telas compartilham cache);
 *   2. `escalas do período` → janela do calendário (semana ou mês);
 *   3. `escalas do período anterior` → base da variação dos KPI Cards;
 *   4. `equipe ativa`       → linhas do calendário + denominador do KPI de
 *                             colaboradores escalados.
 *
 * Há ainda uma quinta janela (hoje → +60 dias) que alimenta o card "Próximas
 * escalas": ele precisa de datas FORA do período aberto, senão clicar numa data
 * futura não teria para onde navegar.
 *
 * `invalidarEscalas()` é o único ponto de invalidação do módulo: qualquer
 * escrita (criar/editar/excluir escala ou turno) chama esta função, que invalida
 * todas as janelas + as chaves que outras telas leem (`escala-hoje` do Ponto e
 * `escala-atual` do dossiê), para o resto do sistema não ficar com dado velho.
 * ============================================================================
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { turnoService } from '@/services/turnoService';
import { useEmpresas, useNow } from '@/hooks';
import { chaveData } from './turnosCalendario';
import type { EscalaRegistro, MembroEquipe, TurnoRegistro } from './turnosMetricas';

/** Janela (em dias) do card "Próximas escalas". */
export const DIAS_PROXIMAS_ESCALAS = 60;

const STALE_TIME = 60 * 1000;

export interface UseTurnosEscalasArgs {
  /** Primeira data do período (`yyyy-MM-dd`). */
  inicio: string;
  /** Última data do período (`yyyy-MM-dd`). */
  fim: string;
  /** Janela do período anterior — a base da variação. */
  inicioAnterior: string;
  fimAnterior: string;
}

export interface UseTurnosEscalasResult {
  turnos: TurnoRegistro[];
  /** Escalas do período aberto (já ordenadas por data). */
  escalasPeriodo: EscalaRegistro[];
  /** Escalas do mesmo tamanho imediatamente antes do período. */
  escalasPeriodoAnterior: EscalaRegistro[];
  /** Escalas de hoje até `DIAS_PROXIMAS_ESCALAS` — card "Próximas escalas". */
  escalasProximas: EscalaRegistro[];
  equipe: MembroEquipe[];
  carregando: boolean;
  /** `true` enquanto QUALQUER consulta de dado falhou. */
  erro: boolean;
  recarregar: () => void;
  invalidarEscalas: () => void;
}

export function useTurnosEscalas({
  inicio,
  fim,
  inicioAnterior,
  fimAnterior,
}: UseTurnosEscalasArgs): UseTurnosEscalasResult {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const qc = useQueryClient();

  // `useNow` (hook do sistema) devolve um instante ESTÁVEL durante o render —
  // chamar `Date.now()` no corpo do componente é impuro e geraria chave de
  // cache instável a cada re-render.
  const agora = useNow();
  const hoje = chaveData(new Date(agora));
  const fimProximas = chaveData(new Date(agora + DIAS_PROXIMAS_ESCALAS * 24 * 60 * 60 * 1000));

  const turnosQuery = useQuery({
    queryKey: ['turnos', empresaId],
    queryFn: () => turnoService.listarTurnos(empresaId!),
    enabled: !!empresaId,
    staleTime: STALE_TIME,
  });

  const periodoQuery = useQuery({
    queryKey: ['turnos-escalas', empresaId, inicio, fim],
    queryFn: () => turnoService.listarEscalasPeriodo(empresaId!, inicio, fim),
    enabled: !!empresaId,
    staleTime: STALE_TIME,
  });

  const anteriorQuery = useQuery({
    queryKey: ['turnos-escalas', empresaId, inicioAnterior, fimAnterior],
    queryFn: () => turnoService.listarEscalasPeriodo(empresaId!, inicioAnterior, fimAnterior),
    enabled: !!empresaId,
    staleTime: STALE_TIME,
  });

  const proximasQuery = useQuery({
    queryKey: ['turnos-escalas', empresaId, hoje, fimProximas],
    queryFn: () => turnoService.listarEscalasPeriodo(empresaId!, hoje, fimProximas),
    enabled: !!empresaId,
    staleTime: STALE_TIME,
  });

  const equipeQuery = useQuery({
    queryKey: ['turnos-equipe', empresaId],
    queryFn: () => turnoService.listarEquipe(empresaId!),
    enabled: !!empresaId,
    staleTime: STALE_TIME,
  });

  const invalidarEscalas = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['turnos'] });
    qc.invalidateQueries({ queryKey: ['turnos-escalas'] });
    qc.invalidateQueries({ queryKey: ['turnos-equipe'] });
    // Consumidores de fora do módulo que leem a MESMA tabela.
    qc.invalidateQueries({ queryKey: ['escala-hoje'] });
    qc.invalidateQueries({ queryKey: ['escala-atual'] });
  }, [qc]);

  const recarregar = useCallback(() => {
    void turnosQuery.refetch();
    void periodoQuery.refetch();
    void anteriorQuery.refetch();
    void proximasQuery.refetch();
    void equipeQuery.refetch();
  }, [turnosQuery, periodoQuery, anteriorQuery, proximasQuery, equipeQuery]);

  return {
    turnos: (turnosQuery.data ?? []) as TurnoRegistro[],
    escalasPeriodo: (periodoQuery.data ?? []) as EscalaRegistro[],
    escalasPeriodoAnterior: (anteriorQuery.data ?? []) as EscalaRegistro[],
    escalasProximas: (proximasQuery.data ?? []) as EscalaRegistro[],
    equipe: (equipeQuery.data ?? []) as MembroEquipe[],
    carregando:
      turnosQuery.isLoading ||
      periodoQuery.isLoading ||
      anteriorQuery.isLoading ||
      equipeQuery.isLoading ||
      proximasQuery.isLoading,
    erro: !!(
      turnosQuery.error ||
      periodoQuery.error ||
      anteriorQuery.error ||
      equipeQuery.error ||
      proximasQuery.error
    ),
    recarregar,
    invalidarEscalas,
  };
}
