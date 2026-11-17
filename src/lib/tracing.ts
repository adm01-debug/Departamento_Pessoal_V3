/**
 * Correlação distribuída: o lado do frontend do contrato que o backend já
 * esperava. `supabase/functions/_shared/trace.ts:5` diz, por caminho:
 *
 *   "1. Frontend gera trace_id (UUID v4) via src/lib/tracing.ts e inclui no body."
 *
 * Este arquivo não existia. O bridge declara `trace_id` no schema
 * (`external-db-bridge/request-schema.ts:49`) com o comentário "era rejeitada
 * pelo .strict() e o trace_id nunca chegava à telemetria", e o
 * `edgeFunctionsService` registra que "correlação, se necessária, deve ir no
 * body" — porque o CORS das funções não aceita header novo.
 *
 * Resgatado de `origin/muri:src/lib/tracing.ts`, onde estava órfão (nenhum
 * arquivo o importava nem lá). Vieram só as duas funções que o contrato pede;
 * `tracedFetch`, `withTrace`, `tracedService` e `useTracing` ficaram de fora
 * por não terem consumidor.
 */

const TRACE_ID_KEY = 'dp_trace_id';

/** UUID v4, com fallback para navegador sem `crypto.randomUUID`. */
function novoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * trace_id da aba, estável enquanto ela viver: é o que permite ligar, num
 * atendimento de suporte, tudo o que o usuario fez na sessao aos logs que o
 * bridge e as Edge Functions escreveram.
 *
 * `sessionStorage` pode lancar (aba privada, cookies bloqueados) — nesse caso
 * devolve um id de uso unico em vez de derrubar a chamada que ia ser traceada.
 */
export function getTraceId(): string {
  try {
    const guardado = sessionStorage.getItem(TRACE_ID_KEY);
    if (guardado && guardado.length >= 16) return guardado;
    const gerado = novoId();
    sessionStorage.setItem(TRACE_ID_KEY, gerado);
    return gerado;
  } catch {
    return novoId();
  }
}

/** Acrescenta `trace_id` ao corpo da requisicao, sem sobrescrever um ja posto. */
export function withTraceId<T extends Record<string, unknown>>(body: T): T & { trace_id: string } {
  return { trace_id: getTraceId(), ...body };
}
