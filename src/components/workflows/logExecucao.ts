export interface EventoLogExecucao {
  timestamp: string | null;
  event: string;
  titulo: string;
  message: string | null;
}

const TITULOS_EVENTO: Record<string, string> = {
  automation_triggered: 'Gatilho de automação acionado',
};

/**
 * Normaliza `workflows_execucoes.log_execucao` (JSONB array de
 * `{ timestamp, event, message }`, gravado por `trigger_workflow_automation`)
 * em eventos ordenados por data. Entradas que não são objeto são descartadas.
 */
export function lerLogExecucao(raw: unknown): EventoLogExecucao[] {
  if (!Array.isArray(raw)) return [];
  const eventos: EventoLogExecucao[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const r = item as Record<string, unknown>;
    const event = typeof r.event === 'string' && r.event ? r.event : 'evento';
    eventos.push({
      timestamp: typeof r.timestamp === 'string' ? r.timestamp : null,
      event,
      titulo: TITULOS_EVENTO[event] ?? event,
      message: typeof r.message === 'string' && r.message ? r.message : null,
    });
  }
  const tempo = (t: string | null) => {
    const ms = t ? Date.parse(t) : NaN;
    return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
  };
  return eventos
    .map((e, i) => ({ e, i }))
    .sort((a, b) => tempo(a.e.timestamp) - tempo(b.e.timestamp) || a.i - b.i)
    .map(({ e }) => e);
}
