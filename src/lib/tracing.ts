/**
 * @fileoverview Tracing distribuído — P3-064.
 *
 * Gera e propaga trace_id do frontend para todas as Edge Functions.
 * O trace_id viaja no body das requisições (não em headers — CORS restrito).
 *
 * Uso:
 *   import { generateTraceId, withTrace } from '@/lib/tracing';
 *
 *   // Em qualquer lugar — gera ou reutiliza trace_id do sessionStorage
 *   const traceId = getTraceId();       // persiste na sessão
 *   const { traceId, withTrace } = useTracing();
 *
 *   // Com fetch direto a edge functions
 *   await fetch('/functions/v1/calcular-folha', {
 *     body: JSON.stringify({ empresa_id, competencia, trace_id: traceId }),
 *   });
 *
 *   // Com edgeFunctionsService (já propaga se configurado)
 *   edgeFunctionsService.calcularFolha({ empresaId, competencia, traceId });
 */

const TRACE_ID_KEY = 'dp_trace_id';

/** Gera novo trace_id (UUID v4) se não houver no sessionStorage. */
export function getTraceId(): string {
  if (typeof sessionStorage === 'undefined') {
    return crypto.randomUUID();
  }
  const stored = sessionStorage.getItem(TRACE_ID_KEY);
  if (stored && stored.length >= 16) return stored;
  const generated = crypto.randomUUID();
  sessionStorage.setItem(TRACE_ID_KEY, generated);
  return generated;
}

/** Gera trace_id limpo (sem persistência — para logging apenas). */
export function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback para Safari antigo
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/** Adiciona trace_id ao body de uma requisição. */
export function withTraceId<T extends Record<string, unknown>>(body: T): T {
  return { ...body, trace_id: getTraceId() };
}

/** Envelope de fetch que sempre inclui trace_id. */
export async function tracedFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { body?: unknown }
): Promise<Response> {
  const traceId = getTraceId();
  const mergedBody = init?.body
    ? typeof init.body === 'string'
      ? JSON.parse(init.body as string)
      : (init.body as unknown as Record<string, unknown>)
    : {};
  const finalBody = { ...mergedBody, trace_id: traceId };
  return fetch(input, {
    ...init,
    body: JSON.stringify(finalBody),
    headers: {
      ...init?.headers,
      'Content-Type': 'application/json',
    },
  });
}

/** Wrapper async com trace_id em escopo. */
export async function withTrace<T>(
  fn: (traceId: string) => Promise<T>,
  traceId?: string
): Promise<T> {
  const id = traceId ?? getTraceId();
  try {
    return await fn(id);
  } catch (err) {
    // Log local: correlation-ready
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      event: 'trace_exception',
      trace_id: id,
      error: err instanceof Error ? err.message : String(err),
    }));
    throw err;
  }
}
