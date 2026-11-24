/**
 * P3-054: Tracing wrapper para serviços críticos
 *
 * Adiciona trace_id automaticamente em todas as chamadas de serviço.
 */

import { getTraceId } from '@/lib/tracing';
import { loggerService } from '@/services/loggerService';

export interface TracedRequest {
  traceId: string;
  timestamp: string;
  service: string;
  method: string;
}

export function createTracedService<T extends object>(
  service: T,
  serviceName: string
): T {
  const traced = new Proxy(service, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original !== 'function') {
        return original;
      }

      // Retorna wrapper com tracing
      return async function (...args: unknown[]) {
        const traceId = getTraceId();
        const startTime = performance.now();

        // Log início
        loggerService.debug(`[${serviceName}.${String(prop)}] Iniciando`, {
          trace_id: traceId,
          args_count: args.length,
        });

        try {
          const result = await original.apply(target, args);
          const duration = performance.now() - startTime;

          // Log sucesso
          loggerService.debug(`[${serviceName}.${String(prop)}] Sucesso`, {
            trace_id: traceId,
            duration_ms: duration.toFixed(2),
          });

          return result;
        } catch (error) {
          const duration = performance.now() - startTime;

          // Log erro
          loggerService.error(`[${serviceName}.${String(prop)}] Erro`, {
            trace_id: traceId,
            duration_ms: duration.toFixed(2),
            error: error instanceof Error ? error.message : String(error),
          }, error instanceof Error ? error : undefined);

          throw error;
        }
      };
    },
  });

  return traced;
}

// =============================================================================
// SERVIÇOS JÁ ENVOLTOS COM TRACING
// =============================================================================

// Exemplo de uso:
// import { createTracedService } from '@/lib/tracedService';
// const tracedFolhaService = createTracedService(folhaService, 'folhaService');

// Para hooks que usam serviços, usar useTracing:
export { useTracing } from '@/lib/useTracing';
