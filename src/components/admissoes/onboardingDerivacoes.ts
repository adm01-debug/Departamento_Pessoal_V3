/**
 * Derivações PURAS da área de Onboarding (aba "Onboarding" do módulo de
 * Admissões). Mesma entrada → mesma saída, nada de JSX, nada de classe CSS.
 *
 * POR QUE UM MÓDULO PRÓPRIO: `admissoesDerivacoes.ts` é a régua do processo
 * admissionAL (prazo da admissão, checklist de documentos, progresso por etapa).
 * A jornada de integração que esta aba mostra é outra coisa: lê `tarefas` de
 * `tarefas_onboarding`, avança por marcos de tempo (Pré-onboarding → 30 dias) e
 * mede risco por prazo de tarefa. Misturar as duas réguas num arquivo só
 * convidaria a UI a usar o checklist de admissão no lugar do de integração.
 *
 * O que é REAPROVEITADO de `admissoesDerivacoes` é só o que é genérico e já
 * testado: `dataValida`, `inicioDoDia`, `DIA_MS` e `iniciais`. Nada de uma
 * segunda cópia de parsing de data ou de avatar textual.
 */
import { DIA_MS, dataValida, inicioDoDia } from './admissoesDerivacoes';
import { formatDate } from '@/utils/format';

/** Linha de `tarefas_onboarding` como o card a consome (tolerante a campo nulo). */
export interface TarefaOnboarding {
  id?: string | number;
  titulo?: string | null;
  descricao?: string | null;
  responsavel_nome?: string | null;
  /** Dias corridos somados ao `created_at` para achar o prazo da tarefa. */
  prazo_dias?: number | null;
  concluida?: boolean | null;
  concluida_em?: string | null;
  created_at?: string | null;
}

/** Registro de `admissoes` já com as tarefas aninhadas (a query do módulo). */
export interface ColaboradorOnboarding {
  id?: string | number;
  nome?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  etapa?: string | null;
  data_prevista?: string | null;
  created_at?: string | null;
  metadata?: { responsavel?: string | null } | null;
  tarefas?: TarefaOnboarding[] | null;
}

/** Espelho do default da coluna `prazo_dias` (`tarefas_onboarding`). */
const PRAZO_DIAS_PADRAO = 5;

export interface ProgressoOnboarding {
  total: number;
  concluidas: number;
  pendentes: number;
  /** 0-100 arredondado; 0 quando não há tarefas (nunca NaN). */
  valor: number;
}

/** Progresso do onboarding = tarefas concluídas ÷ total (0 quando vazio). */
export function progressoOnboarding(tarefas?: TarefaOnboarding[] | null): ProgressoOnboarding {
  const lista = tarefas ?? [];
  const total = lista.length;
  const concluidas = lista.filter((t) => t.concluida === true).length;
  return {
    total,
    concluidas,
    pendentes: total - concluidas,
    valor: total > 0 ? Math.round((concluidas / total) * 100) : 0,
  };
}

/**
 * Prazo de uma tarefa = `created_at` + `prazo_dias`. Devolve `null` quando a
 * base não traz `created_at` (não inventar data).
 */
export function prazoDaTarefa(tarefa: TarefaOnboarding): Date | null {
  const base = dataValida(tarefa.created_at);
  if (!base) return null;
  const dias =
    typeof tarefa.prazo_dias === 'number' && Number.isFinite(tarefa.prazo_dias) ? tarefa.prazo_dias : PRAZO_DIAS_PADRAO;
  const prazo = new Date(base.getTime());
  prazo.setDate(prazo.getDate() + dias);
  return prazo;
}

/** Primeira tarefa ainda não concluída — a "próxima ação" concreta do card. */
export function proximaTarefa(tarefas?: TarefaOnboarding[] | null): TarefaOnboarding | null {
  return (tarefas ?? []).find((t) => t.concluida !== true) ?? null;
}

/** Estado visual de cada marco da régua horizontal. */
export type EstadoMarco = 'concluido' | 'atual' | 'pendente';

/**
 * Distribui o progresso (0-100) pelos marcos: o índice "atual" anda de 0 a N-1
 * conforme o percentual sobe; o que ficou atrás é `concluido` e o que vem é
 * `pendente`. Com 100% TODOS viram `concluido` (não há marco "em andamento" num
 * onboarding terminado).
 */
export function estadosDosMarcos(valor: number, quantidade: number): EstadoMarco[] {
  if (quantidade <= 0) return [];
  if (valor >= 100) return Array.from({ length: quantidade }, () => 'concluido' as EstadoMarco);
  const atual = Math.min(quantidade - 1, Math.max(0, Math.round((valor / 100) * (quantidade - 1))));
  return Array.from({ length: quantidade }, (_, i) => (i < atual ? 'concluido' : i === atual ? 'atual' : 'pendente'));
}

export interface ResumoOnboarding {
  concluidas: number;
  pendentes: number;
  /** Pendentes com prazo já vencido — o "em risco/atrasada" dos status pills. */
  atrasadas: number;
}

/** Contadores do rodapé do card (concluídas / pendentes / em risco). */
export function resumoOnboarding(tarefas: TarefaOnboarding[] | null | undefined, hoje: number): ResumoOnboarding {
  let concluidas = 0;
  let pendentes = 0;
  let atrasadas = 0;
  (tarefas ?? []).forEach((tarefa) => {
    if (tarefa.concluida === true) {
      concluidas += 1;
      return;
    }
    pendentes += 1;
    const prazo = prazoDaTarefa(tarefa);
    if (prazo && inicioDoDia(prazo) < hoje) atrasadas += 1;
  });
  return { concluidas, pendentes, atrasadas };
}

export type TomPrazo = 'atraso' | 'hoje' | 'proximo' | 'neutro';

export interface PrazoFormatado {
  texto: string;
  tom: TomPrazo;
}

/**
 * Rótulo humano do prazo: `Atrasado 3d` / `Hoje, 16:00` / `Amanhã, 09:00` /
 * `03/10/2026`, sempre comparando pelo INÍCIO do dia (a hora só enfeita o
 * "hoje/amanhã"). `null` quando não há prazo calculável.
 */
export function formatarPrazo(prazo: Date | null, hoje: number): PrazoFormatado | null {
  if (!prazo) return null;
  const dias = Math.round((inicioDoDia(prazo) - hoje) / DIA_MS);
  if (dias < 0) return { texto: `Atrasado ${Math.abs(dias)}d`, tom: 'atraso' };
  const hora = `${String(prazo.getHours()).padStart(2, '0')}:${String(prazo.getMinutes()).padStart(2, '0')}`;
  if (dias === 0) return { texto: `Hoje, ${hora}`, tom: 'hoje' };
  if (dias === 1) return { texto: `Amanhã, ${hora}`, tom: 'proximo' };
  return { texto: formatDate(prazo), tom: 'neutro' };
}
