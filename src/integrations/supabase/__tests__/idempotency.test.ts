import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// O client importa import.meta.env; o setup global do projeto já provê os
// valores, mas garantimos aqui para o arquivo rodar isolado.
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');

// O setup global mocka '@/integrations/supabase/client'; aqui precisamos do
// módulo real, então pedimos a implementação original explicitamente.
const { fetchWithRetry } = await vi.importActual<typeof import('../client')>('../client');

describe('fetchWithRetry — idempotência sob retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Regressão do defeito real: a chave era gerada DENTRO do laço, então cada
   * tentativa levava um UUID novo. Um 502 devolvido depois do commit fazia a
   * retentativa parecer uma operação inédita — e a folha era lançada duas vezes.
   */
  it('reusa a MESMA Idempotency-Key em todas as tentativas de um write', async () => {
    const chavesEnviadas: string[] = [];

    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      chavesEnviadas.push(headers['Idempotency-Key']);
      // Duas falhas retryable, depois sucesso.
      return chavesEnviadas.length < 3 ? new Response(null, { status: 502 }) : new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchWithRetry('https://x/y', { method: 'POST' }, true);
    await vi.runAllTimersAsync();
    const { idempotencyKey } = await promise;

    expect(chavesEnviadas).toHaveLength(3);
    expect(new Set(chavesEnviadas).size).toBe(1);
    expect(chavesEnviadas[0]).toBe(idempotencyKey);
    expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('respeita uma Idempotency-Key fornecida pelo chamador', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { idempotencyKey } = await fetchWithRetry(
      'https://x/y',
      { method: 'POST', headers: { 'Idempotency-Key': 'chave-do-chamador' } },
      true
    );

    expect(idempotencyKey).toBe('chave-do-chamador');
  });

  it('não injeta Idempotency-Key em leituras', async () => {
    let headerVisto: string | undefined = 'ainda-nao-chamado';
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      headerVisto = (init.headers as Record<string, string>)['Idempotency-Key'];
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { idempotencyKey } = await fetchWithRetry('https://x/y', { method: 'POST' }, false);

    expect(headerVisto).toBeUndefined();
    expect(idempotencyKey).toBeNull();
  });
});
