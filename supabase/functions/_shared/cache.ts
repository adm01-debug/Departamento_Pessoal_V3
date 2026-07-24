// MP-032: Cache-Control helper for read-only Edge Function responses.
// Usage: return jsonResponse(data, { cache: cachePublic(300) });

export interface CachePolicy {
  'Cache-Control': string;
  Vary?: string;
}

/** Public CDN-cacheable response for anonymous read-only endpoints. */
export function cachePublic(sMaxAgeSeconds: number, staleWhileRevalidate = 60): CachePolicy {
  return {
    'Cache-Control': `public, max-age=0, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidate}`,
    Vary: 'Accept-Encoding, Origin',
  };
}

/** Private per-user cache (browser only). */
export function cachePrivate(maxAgeSeconds: number): CachePolicy {
  return {
    'Cache-Control': `private, max-age=${maxAgeSeconds}`,
    Vary: 'Accept-Encoding, Authorization',
  };
}

/** No caching (default for mutations and sensitive data). */
export function cacheNone(): CachePolicy {
  return { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };
}

/** ETag builder for conditional GET support. */
export async function computeETag(payload: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `"${hex.slice(0, 32)}"`;
}

// =====================================================================
// P4-067: Cache in-memory para tabelas estáticas
// =====================================================================
// Tabelas de referência (CBO, CNAE, IRRF, INSS, feriados, rubricas globais)
// raramente mudam. Cache em memória com TTL de 5min + invalidação explícita.

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 min

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

let totalHits = 0;
let totalMisses = 0;

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hit_rate: number;
}

/** Obtém valor do cache. Se ausente/expirado, chama loader(). */
export async function cachedFetch<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > Date.now()) {
    entry.hits++;
    totalHits++;
    return entry.value;
  }
  totalMisses++;
  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs, hits: 0 });
  return value;
}

/** Invalida entrada(s) por key ou prefixo */
export function invalidateCache(keyOrPrefix: string): number {
  let removed = 0;
  for (const key of cache.keys()) {
    if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`)) {
      cache.delete(key);
      removed++;
    }
  }
  return removed;
}

/** Limpa todo o cache (uso em testes ou admin) */
export function clearCache(): void {
  cache.clear();
  totalHits = 0;
  totalMisses = 0;
}

export function getCacheStats(): CacheStats {
  const total = totalHits + totalMisses;
  return {
    size: cache.size,
    hits: totalHits,
    misses: totalMisses,
    hit_rate: total > 0 ? totalHits / total : 0,
  };
}
