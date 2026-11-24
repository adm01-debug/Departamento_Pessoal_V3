/**
 * P3-054/P3-064: Hook de Tracing para React
 *
 * Integra tracing distribuído com hooks React.
 * Gera e persiste trace_id na sessão.
 *
 * Uso:
 *   const { traceId, startSpan, endSpan, log } = useTracing();
 *
 *   startSpan('fetch-folha');
 *   await fetchFolha();
 *   endSpan('fetch-folha');
 *   log('info', 'Folha carregada');
 */

import { useCallback, useRef, useState } from 'react';
import { getTraceId, generateTraceId } from './tracing';
import { loggerService } from '@/services/loggerService';

export interface Span {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface TracingContext {
  traceId: string;
  /** Retorna o snapshot atual dos spans (refs não devem ser lidos durante o render). */
  getSpans: () => Span[];
  startSpan: (name: string, metadata?: Record<string, unknown>) => void;
  endSpan: (name: string, metadata?: Record<string, unknown>) => void;
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) => void;
  withSpan: <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>) => Promise<T>;
}

/**
 * Hook de tracing para React components
 */
export function useTracing(): TracingContext {
  const [traceId] = useState(getTraceId);
  const spans = useRef<Span[]>([]);
  const spanStartTimes = useRef<Map<string, number>>(new Map());

  const startSpan = useCallback((name: string, metadata?: Record<string, unknown>) => {
    const now = performance.now();
    spanStartTimes.current.set(name, now);
    spans.current.push({
      name,
      startTime: now,
      metadata,
    });
  }, []);

  const endSpan = useCallback((name: string, metadata?: Record<string, unknown>) => {
    const startTime = spanStartTimes.current.get(name);
    if (startTime === undefined) {
      loggerService.warn('Span end called without start', { name, traceId });
      return;
    }
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Atualiza o span no array
    const span = spans.current.find(s => s.name === name);
    if (span) {
      span.endTime = endTime;
      span.duration = duration;
      if (metadata) {
        span.metadata = { ...span.metadata, ...metadata };
      }
    }

    spanStartTimes.current.delete(name);

    // Log do span
    loggerService.info(`[${name}] ${duration.toFixed(2)}ms`, {
      trace_id: traceId,
      span_name: name,
      duration_ms: duration,
      ...metadata,
    });
  }, [traceId]);

  const log = useCallback((
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>
  ) => {
    const logData = {
      trace_id: traceId,
      spans: spans.current.map(s => ({
        name: s.name,
        duration: s.duration,
      })),
      ...data,
    };

    switch (level) {
      case 'debug':
        loggerService.debug(message, logData);
        break;
      case 'info':
        loggerService.info(message, logData);
        break;
      case 'warn':
        loggerService.warn(message, logData);
        break;
      case 'error':
        loggerService.error(message, logData, data?.error as Error);
        break;
    }
  }, [traceId]);

  const withSpan = useCallback(async <T,>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> => {
    startSpan(name, metadata);
    try {
      const result = await fn();
      endSpan(name, { success: true });
      return result;
    } catch (error) {
      endSpan(name, { success: false, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }, [startSpan, endSpan]);

  return {
    traceId,
    getSpans: () => [...spans.current],
    startSpan,
    endSpan,
    log,
    withSpan,
  };
}

/**
 * Gera novo trace_id isolado (sem persistência)
 */
export function useNewTraceId(): string {
  return generateTraceId();
}

/**
 * Provedor de tracing para contextos anônimos
 */
export const tracingContext = {
  getTraceId,
  generateTraceId,
};
