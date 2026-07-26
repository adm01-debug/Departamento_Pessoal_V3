/**
 * @fileoverview Retry com backoff exponencial + idempotency key.
 * P3-061: Evita duplicação em operações de escrita (POST/PUT/PATCH).
 *
 * Uso:
 *   const result = await retryWithIdempotency({
 *     fn: () => supabase.functions.invoke('calcular-folha', { body }),
 *     idempotencyKey: `${empresaId}:${competencia}:${Date.now()}`,
 *     onRetry: (attempt, delay, error) => logger.warn(`retry ${attempt}`, { delay, error }),
 *   });
 *
 * - Sem idempotency key: retry normal com backoff
 * - Com idempotency key: retry é seguro (server ignora retries da mesma key)
 * - 429 (rate limit): respeita Retry-After header
 * - 5xx: retry com backoff
 * - 4xx (não 429): não retry (erro de cliente)
 */

import { loggerService } from '@/services/loggerService';

export interface RetryOptions {
  /** Função a executar. Deve ser idempotente se idempotencyKey for fornecida. */
  fn: () => Promise<unknown>;
  /** Idempotency key — se fornecida, retries são seguros no server. */
  idempotencyKey?: string;
  /** Máximo de tentativas (default: 4). */
  maxAttempts?: number;
  /** Backoff base em ms (default: 500). */
  baseDelayMs?: number;
  /** Backoff máximo em ms (default: 8000). */
  maxDelayMs?: number;
  /** Jitter ratio 0-1 (default: 0.2 = ±20%). */
  jitterRatio?: number;
  /** Callback a cada retry (pode ser usado para métricas). */
  onRetry?: (attempt: number, delayMs: number, error: unknown, isRateLimit: boolean) => void;
  /** Códigos HTTP que devem fazer retry (default: [429, 500, 502, 503, 504]). */
  retryableStatuses?: number[];
  /** Abort signal externo (default: null). */
  signal?: AbortSignal | null;
}

export interface RetryResult<T> {
  data: T;
  attempts: number;
  totalLatencyMs: number;
  wasRetried: boolean;
  idempotencyKey?: string;
}

/** Extrai retry-after em segundos de uma Response ou header brute. */
function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!isNaN(n)) return n;
  // HTTP-date format: "Wed, 21 Oct 2015 07:28:00 GMT"
  const date = new Date(value).getTime();
  if (!isNaN(date)) return Math.max(0, (date - Date.now()) / 1000);
  return null;
}

/** Determina se um erro/response é retryable. */
function isRetryable(err: unknown, retryableStatuses: number[]): { yes: boolean; isRateLimit: boolean } {
  if (err instanceof Error) {
    // Network errors, DNS failures, timeouts
    if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('timeout') || err.message === 'Failed to fetch') {
      return { yes: true, isRateLimit: false };
    }
  }
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status: number }).status;
    return { yes: retryableStatuses.includes(status), isRateLimit: status === 429 };
  }
  return { yes: false, isRateLimit: false };
}

function computeDelay(attempt: number, baseDelayMs: number, maxDelayMs: number, jitterRatio: number, retryAfterSeconds?: number): number {
  if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, maxDelayMs);
  }
  const exponential = baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = exponential * jitterRatio * (Math.random() * 2 - 1);
  return Math.min(Math.max(exponential + jitter, 0), maxDelayMs);
}

export async function retryWithIdempotency<T>(options: RetryOptions): Promise<RetryResult<T>> {
  const {
    fn,
    idempotencyKey,
    maxAttempts = 4,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    jitterRatio = 0.2,
    onRetry,
    retryableStatuses = [429, 500, 502, 503, 504],
    signal = null,
  } = options;

  const start = Date.now();
  let attempt = 0;
  let wasRetried = false;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt++;
    if (signal?.aborted) throw new Error('Retry aborted by signal');

    try {
      const result = await fn();
      return {
        data: result as T,
        attempts: attempt,
        totalLatencyMs: Date.now() - start,
        wasRetried,
        idempotencyKey,
      };
    } catch (err: unknown) {
      lastError = err;

      // Extrai Retry-After de response
      let retryAfterSeconds: number | undefined;
      if (typeof err === 'object' && err !== null && 'status' in err) {
        const response = err as { status: number; headers?: { get: (name: string) => string | null } };
        if (response.status === 429 && response.headers) {
          retryAfterSeconds = parseRetryAfter(response.headers.get('retry-after'))
            ?? parseRetryAfter(response.headers.get('Retry-After'))
            ?? undefined;
        }
      }

      const { yes: shouldRetry, isRateLimit } = isRetryable(err, retryableStatuses);

      if (!shouldRetry || attempt >= maxAttempts) {
        loggerService.error('retryWithIdempotency: max attempts reached or non-retryable error', {
          attempts: attempt,
          idempotencyKey,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      wasRetried = true;
      const delayMs = computeDelay(attempt, baseDelayMs, maxDelayMs, jitterRatio, retryAfterSeconds);

      onRetry?.(attempt, delayMs, err, isRateLimit);
      loggerService.warn('retryWithIdempotency: retrying', {
        attempt,
        delayMs,
        idempotencyKey,
        isRateLimit,
        error: err instanceof Error ? err.message : String(err),
      });

      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/** Retry com idempotency key embutida no body da requisição.
 *  Útil para edgeFunctionsService.calcularFolha que já suporta idempotency_key no body. */
export async function retryEdgeFunction<T>(
  invokeFn: () => Promise<T>,
  idempotencyKey: string,
  options?: Omit<RetryOptions, 'fn' | 'idempotencyKey'>
): Promise<RetryResult<T>> {
  return retryWithIdempotency<T>({
    fn: invokeFn,
    idempotencyKey,
    ...options,
  });
}
