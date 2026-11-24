/**
 * P3-064: Tracing distribuído entre Edge Functions.
 *
 * Como funciona:
 * 1. Frontend gera trace_id (UUID v4) via src/lib/tracing.ts e inclui no body.
 * 2. Bridge (external-db-bridge) extrai e propaga via Sentry scope + logs.
 * 3. Edge Functions usam trace_id nos logs e em qualquer auditoria.
 *
 * Semanas de análise P3-064:
 * - CORS contract só permite headers específicos; trace_id viaja no body.
 * - Se não vier no body, geramos novo no bridge (para queries diretas).
 * - Sentry scope.setTag('trace_id', ...) correlaciona erros no dashboard.
 * - query_telemetry.trace_id registra trace em cada query para fan-out auditing.
 *
 * Uso:
 *   const { traceId, log, withTrace } = getTraceContext(request);
 *   log.info('iniciando calculo', { empresa_id });
 *   await withTrace(() => expensiveOperation());
 */

export interface TraceContext {
  traceId: string;
  parentSpanId?: string;
  log: {
    debug: (event: string, data?: Record<string, unknown>) => void;
    info: (event: string, data?: Record<string, unknown>) => void;
    warn: (event: string, data?: Record<string, unknown>) => void;
    error: (event: string, data?: Record<string, unknown>) => void;
    fatal: (event: string, data?: Record<string, unknown>) => void;
  };
  /** Executa fn com o trace_id no escopo. Útil para fan-out. */
  withTrace: <T>(fn: () => Promise<T>) => Promise<T>;
}

/** Headers candidatas onde o trace_id pode vir (futuro, via CORS relaxado). */
const TRACE_HEADERS = [
  'x-trace-id',
  'x-correlation-id',
  'x-request-id',
  'cf-ray',        // Cloudflare: único por request
];

/** Tenta extrair trace_id de headers ou body. Retorna UUID gerado se não encontrar. */
export function getOrCreateTraceId(request: Request | null, body?: unknown): string {
  // 1. Header (futuro — quando CORS permitir)
  if (request) {
    for (const header of TRACE_HEADERS) {
      const value = request.headers.get(header);
      if (value && value.length >= 16 && value.length <= 128) return value;
    }
  }

  // 2. Body — idempotency-key carrega o trace_id (P3-061 client o gera)
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    const candidate = b.trace_id ?? b.traceId ?? b.traceId ?? b.correlation_id;
    if (typeof candidate === 'string' && candidate.length >= 16) return candidate;
  }

  // 3. Gerar novo (UUID v4 — crypto.randomUUID é síncrono em Deno)
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback para ambientes restritos
    return `${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
  }
}

/** Retorna contexto de tracing com logger colorido e withTrace. */
export function getTraceContext(request: Request | null, body?: unknown): TraceContext {
  const traceId = getOrCreateTraceId(request, body);

  const makeLog =
    (level: 'debug' | 'info' | 'warn' | 'error' | 'fatal') =>
    (event: string, data?: Record<string, unknown>) => {
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        level,
        event,
        trace_id: traceId,
        ...data,
      });
      switch (level) {
        case 'debug': case 'info':  console.log(line); break;
        case 'warn':                  console.warn(line); break;
        case 'error': case 'fatal':  console.error(line); break;
      }
    };

  const traceLog = {
    debug: makeLog('debug'),
    info:  makeLog('info'),
    warn:  makeLog('warn'),
    error: makeLog('error'),
    fatal: makeLog('fatal'),
  };

  const withTrace = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      traceLog.error('trace_exception', {
        trace_id: traceId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };

  return { traceId, log: traceLog, withTrace };
}

/** Injeta trace_id no Sentry scope para correlação de erros. */
export async function setSentryTrace(request: Request | null, body?: unknown): Promise<void> {
  try {
    // Dynamic import para não falhar se Sentry não estiver configurado
    const { setTag } = await import('./sentry.ts');
    const traceId = getOrCreateTraceId(request, body);
    setTag('trace_id', traceId);
  } catch {
    // Sentry não disponível — silencioso
  }
}
