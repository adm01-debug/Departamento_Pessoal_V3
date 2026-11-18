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
 * UM ID POR REQUISIÇÃO, não por aba. A coluna é definida assim na migration
 * `20260724120000_p3_064_query_telemetry_trace_id.sql`: "trace_id da
 * REQUISIÇÃO distribuída", com índice "útil para debugging de UMA request". A
 * versão de `origin/muri:src/lib/tracing.ts` guardava um único UUID em
 * `sessionStorage['dp_trace_id']` e devolvia o mesmo para a aba inteira — isso
 * é id de sessão: com ele, todas as queries da aba colidem no mesmo valor e a
 * coluna deixa de isolar uma requisição, que é a razão de existir do índice.
 */

/** UUID v4 por chamada, com fallback para navegador sem `crypto.randomUUID`. */
export function novoTraceId(): string {
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
 * Acrescenta um `trace_id` novo ao corpo da requisição. Não sobrescreve um
 * `trace_id` já posto pelo chamador: quem precisa amarrar duas chamadas no
 * mesmo trace (fan-out) passa o seu e ele vence.
 */
export function withTraceId<T extends Record<string, unknown>>(body: T): T & { trace_id: string } {
  return { trace_id: novoTraceId(), ...body };
}
