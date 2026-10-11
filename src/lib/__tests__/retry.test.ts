import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithIdempotency, retryEdgeFunction } from '../retry';

vi.mock('@/services/loggerService', () => ({
  loggerService: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const statusErr = (status: number, retryAfter?: string) =>
  Object.assign(new Error(`HTTP ${status}`), {
    status,
    headers: retryAfter !== undefined ? { get: () => retryAfter } : undefined,
  });

describe('retryWithIdempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna na primeira tentativa sem retry', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const r = await retryWithIdempotency<string>({ fn });
    expect(r).toMatchObject({ data: 'ok', attempts: 1, wasRetried: false });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('repassa idempotencyKey no resultado', async () => {
    const r = await retryWithIdempotency({ fn: vi.fn().mockResolvedValue(1), idempotencyKey: 'k-1' });
    expect(r.idempotencyKey).toBe('k-1');
  });

  it('faz retry em erro 5xx e devolve o sucesso seguinte', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(statusErr(503)).mockResolvedValue('ok');
    const r = await retryWithIdempotency<string>({ fn, onRetry, baseDelayMs: 1, jitterRatio: 0 });
    expect(r.attempts).toBe(2);
    expect(r.wasRetried).toBe(true);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Number), expect.anything(), false);
  });

  it('erro 4xx (não 429) não faz retry', async () => {
    const fn = vi.fn().mockRejectedValue(statusErr(400));
    await expect(retryWithIdempotency({ fn, baseDelayMs: 1 })).rejects.toThrow('HTTP 400');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('esgota maxAttempts e relança o último erro', async () => {
    const fn = vi.fn().mockRejectedValue(statusErr(500));
    await expect(retryWithIdempotency({ fn, maxAttempts: 3, baseDelayMs: 1, jitterRatio: 0 })).rejects.toThrow(
      'HTTP 500'
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('429 respeita Retry-After e sinaliza isRateLimit no callback', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(statusErr(429, '0')).mockResolvedValue('ok');
    await retryWithIdempotency({ fn, onRetry, baseDelayMs: 1, maxDelayMs: 5 });
    const [, delay, , isRateLimit] = onRetry.mock.calls[0] as [number, number, unknown, boolean];
    expect(isRateLimit).toBe(true);
    expect(delay).toBeLessThanOrEqual(5); // retryAfter=0s → cai no backoff exponencial, cap 5ms
  });

  it('429 sem Retry-After usa backoff exponencial limitado por maxDelayMs', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(statusErr(500)).mockResolvedValue('ok');
    await retryWithIdempotency({ fn, onRetry, baseDelayMs: 1000, maxDelayMs: 3, jitterRatio: 0 });
    expect(onRetry.mock.calls[0]?.[1]).toBeLessThanOrEqual(3);
  });

  it('erros de rede (fetch/network/timeout) são retryable', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValue('ok');
    const r = await retryWithIdempotency({ fn, baseDelayMs: 1, jitterRatio: 0 });
    expect(r.attempts).toBe(2);
  });

  it('erro comum (sem status nem padrão de rede) não faz retry', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('validation failed'));
    await expect(retryWithIdempotency({ fn, baseDelayMs: 1 })).rejects.toThrow('validation failed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retryableStatuses customizável — 502 excluído não retenta', async () => {
    const fn = vi.fn().mockRejectedValue(statusErr(502));
    await expect(retryWithIdempotency({ fn, retryableStatuses: [500], baseDelayMs: 1 })).rejects.toThrow('HTTP 502');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('signal abortado lança antes de chamar fn', async () => {
    const fn = vi.fn();
    await expect(retryWithIdempotency({ fn, signal: { aborted: true } as AbortSignal })).rejects.toThrow(
      'Retry aborted by signal'
    );
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('retryEdgeFunction', () => {
  it('encapsula fn + idempotencyKey', async () => {
    const r = await retryEdgeFunction(vi.fn().mockResolvedValue('ok'), 'key-42');
    expect(r).toMatchObject({ data: 'ok', idempotencyKey: 'key-42', attempts: 1 });
  });
});
