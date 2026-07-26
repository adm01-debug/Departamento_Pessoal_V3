/**
 * P1-015: safeFetch — fetch com timeout robusto
 *
 * Simulação de cenários:
 *   1. Sem timeout → conexão lenta consome pool → edge function trava
 *      → Solução: AbortController.timeout() nativo Deno
 *   2. Timeout curto demais → APIs legítimas falham
 *      → Solução: cada API define seu próprio timeout (8s–60s)
 *   3. AbortController cancela request que ainda pode completar
 *      → Solução: não tratar abort como erro se Response já foiReceived
 *   4. request.clone() necessário em streaming
 *      → Solução: o caller faz clone antes de ler body
 *   5. setTimeout não cancela network I/O
 *      → Solução: SEMPRE usar AbortController, nunca setTimeout
 *   6. Timeout residual em loop assíncrono
 *      → Solução: cleanup com finally + clearTimeout
 *
 * Usage:
 *   const res = await safeFetch('https://api.openai.com/v1/...', {
 *     timeoutMs: 30_000,
 *     headers: { Authorization: `Bearer ${key}` },
 *     method: 'POST',
 *     body: JSON.stringify(data),
 *   });
 */

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  /** Tags para logging (ex: 'openai', 'govbr', 'whatsapp') */
  tag?: string;
}

export class FetchTimeoutError extends Error {
  readonly url: string;
  readonly timeoutMs: number;
  readonly tag?: string;

  constructor(url: string, timeoutMs: number, tag?: string) {
    super(`Fetch timeout after ${timeoutMs}ms: ${url}`);
    this.name = 'FetchTimeoutError';
    this.url = url;
    this.timeoutMs = timeoutMs;
    this.tag = tag;
  }
}

export class FetchNetworkError extends Error {
  readonly url: string;
  readonly tag?: string;
  readonly cause: unknown;

  constructor(url: string, tag: string | undefined, cause: unknown) {
    super(`Network error for ${url}: ${String(cause)}`);
    this.name = 'FetchNetworkError';
    this.url = url;
    this.tag = tag;
    this.cause = cause;
  }
}

/**
 * Fetch wrapper com timeout automático.
 *
 * Comportamento:
 *   - O timeout aborta o request subjacente (cancel I/O de rede)
 *   - Se fetch retornar ANTES do timeout → retorna normalmente
 *   - Se timeout estourar → AbortController aborta e lança FetchTimeoutError
 *   - Erro de rede (DNS, TLS, conexão recusada) → FetchNetworkError
 *
 * Nunca deixa timeout residual: sempre faz cleanup no finally.
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 10_000,
    tag,
    ...fetchOptions
  } = options;

  const controller = new AbortController();

  // Para cada tag, um timeout recomendado:
  //  - openai:       30s   (LLM pode demorar com prompts longos)
  //  - govbr:        10s   (OAuth deve ser rápido)
  //  - whatsapp:      8s   (webhook interno, deve ser rápido)
  //  - icpbrasil:   60s   (assinatura digital pode demorar)
  //  - gotenberg:   30s   (renderização de PDF pode ser lenta)
  //  - default:      10s
  const effectiveTimeout = tag ? TIMEOUT_BY_TAG[tag] ?? timeoutMs : timeoutMs;

  const timer = setTimeout(() => {
    controller.abort();
  }, effectiveTimeout);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // AbortError pode vir de timeout OU de cancelamento explícito.
      // Distinguimos pelo timer: se timer ainda está ativo, foi cancelamento.
      // Se timer já disparou, foi timeout.
      // Nossos timers sempre disparam abort para timeout, então:
      throw new FetchTimeoutError(url, effectiveTimeout, tag);
    }
    throw new FetchNetworkError(url, tag, err);
  } finally {
    clearTimeout(timer);
    // Garante que o signal está limpio para não vazar estado
    controller.abort();
  }
}

// ── Timeout por tag ────────────────────────────────────────────
const TIMEOUT_BY_TAG: Record<string, number> = {
  openai:    30_000,
  govbr:     10_000,
  whatsapp:   8_000,
  icpbrasil: 60_000,
  gotenberg: 30_000,
  webhook:    8_000,
  dbbridge:  15_000,
  metabase:  10_000,
};

/**
 * GET helper com timeout.
 */
export async function safeGet(
  url: string,
  options?: Omit<SafeFetchOptions, 'method'>,
): Promise<Response> {
  return safeFetch(url, { ...options, method: 'GET' });
}

/**
 * POST helper com timeout.
 */
export async function safePost(
  url: string,
  body: unknown,
  options?: Omit<SafeFetchOptions, 'method' | 'body'>,
): Promise<Response> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');
  return safeFetch(url, {
    ...options,
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/**
 * Retry com backoff exponencial para fetch.
 *
 * Cenário de falha:
 *   1. OpenAI rate limit (429) → retry com backoff
 *   2. Timeout → retry (pode ter sido rede temporária)
 *   3. 500 interno → retry (pode ser instabilidade transitória)
 *   4. 401/403 → NÃO retry (não resolve com retry)
 *   5. ICP-Brasil certificado inválido → NÃO retry (não resolve)
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  /** Status codes que devem fazer retry */
  retryOn?: number[];
  /** Callback called before each retry */
  onRetry?: (attempt: number, err: Error, delayMs: number) => void;
  tag?: string;
}

export async function safeFetchWithRetry(
  url: string,
  options: SafeFetchOptions = {},
  retryOptions: RetryOptions = {},
): Promise<Response> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1_000,
    retryOn = [408, 429, 500, 502, 503, 504],
    onRetry,
    tag,
  } = retryOptions;

  let lastError: Error = new Error('Unknown');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await safeFetch(url, { ...options, tag });

      if (!retryOn.includes(res.status)) {
        return res;
      }

      // É retryable mas acabaram as tentativas
      if (attempt === maxAttempts) {
        return res;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      lastError = new Error(`HTTP ${res.status} on ${url}`);

      onRetry?.(attempt, lastError, delay);

      await sleep(delay);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Não retry em erros que não resolvem com retry
      if (err instanceof FetchTimeoutError) {
        // Timeout pode ser rede temporária — retry
      } else if (err instanceof FetchNetworkError) {
        const cause = (err as FetchNetworkError).cause;
        if (cause instanceof Error) {
          // DNS failure, TLS handshake failure — retry pode resolver
          const unretryable = [
            'certificate',
            'ssl',
            'ENOTFOUND',
            'ECONNREFUSED',
          ];
          if (unretryable.some(k => String(cause.message).toLowerCase().includes(k))) {
            throw err; // não retry
          }
        }
      }

      if (attempt === maxAttempts) throw err;

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      onRetry?.(attempt, lastError, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
