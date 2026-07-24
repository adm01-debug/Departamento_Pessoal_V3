// Helper de rate limit atômico para edge functions sensíveis.
//
// Uso:
//   const rl = await checkRateLimit(admin, { key: `esocial:${userId}`, limit: 30, windowSec: 60 });
//   if (!rl.allowed) return rateLimitResponse(rl);
//
// A tabela `public.rate_limits` é acessada via RPC `edge_rate_limit_check`, que usa
// pg_advisory_xact_lock para serializar verificações concorrentes da mesma chave,
// eliminando a corrida TOCTOU do SELECT+INSERT não-atômico anterior.
// RLS bloqueia acesso não-service-role — sempre passe um client com service role.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './contract.ts';

export interface RateLimitOptions {
  key: string;           // Deve incluir namespacing (ex: `esocial:<userId>`)
  limit: number;         // Máx requisições permitidas na janela
  windowSec: number;     // Janela em segundos
  /**
   * Burst opcional (janela curta anti-rajada). Se informado, a chamada é
   * bloqueada quando EITHER o bucket principal OR o bucket de burst estourar.
   * Ex.: { burstLimit: 20, burstWindowSec: 10 } além de 60/min.
   */
  burstLimit?: number;
  burstWindowSec?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;         // epoch seconds
  limit: number;
  windowSec: number;
  /** Motivo do bloqueio quando allowed=false (main|burst) */
  reason?: 'main' | 'burst';
}

// Fallback em memória (H21): ativado quando o RPC está indisponível.
// Não é compartilhado entre instâncias de edge function, mas impede que uma falha de
// DB deixe todos os endpoints sem proteção (fail-closed com limite reduzido).
const _memFallback = new Map<string, { count: number; windowStart: number }>();
const MEM_LIMIT_FRACTION = 0.5; // usa 50% do limite normal em modo degradado

interface RpcResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  admin: SupabaseClient,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);

  // Atomic check via DB RPC (pg_advisory_xact_lock — eliminates SELECT+INSERT race).
  const { data, error } = await admin.rpc('edge_rate_limit_check', {
    p_key: opts.key,
    p_limit: opts.limit,
    p_window_sec: opts.windowSec,
    p_now: now,
  });

  if (error) {
    // Fail-closed com fallback em memória (H21):
    // Quando o RPC está indisponível, mantemos contadores locais com limite
    // reduzido (50%). Isso evita tanto o fail-open irrestrito quanto uma negação
    // total de serviço — em modo degradado a proteção permanece ativa.
    console.error('[rateLimit] RPC indisponível — fallback em memória (fail-closed):', error.message);

    const fallbackLimit = Math.max(1, Math.floor(opts.limit * MEM_LIMIT_FRACTION));
    const windowStart = now - opts.windowSec;
    let slot = _memFallback.get(opts.key);
    if (!slot || slot.windowStart < windowStart) {
      slot = { count: 0, windowStart: now };
      _memFallback.set(opts.key, slot);
    }
    const allowed = slot.count < fallbackLimit;
    if (allowed) slot.count++;

    // Evita vazamento de memória: descarta entradas mais antigas quando o mapa cresce
    if (_memFallback.size > 1000) {
      const oldest = _memFallback.keys().next().value;
      if (oldest !== undefined) _memFallback.delete(oldest);
    }

    return {
      allowed,
      remaining: Math.max(0, fallbackLimit - slot.count),
      reset: windowStart + opts.windowSec,
      limit: fallbackLimit,
      windowSec: opts.windowSec,
    };
  }

  const rpc = data as RpcResult;
  const allowedMain = rpc.allowed;

  // Bucket de burst opcional (janela curta anti-rajada, in-memory)
  let allowedBurst = true;
  if (opts.burstLimit && opts.burstWindowSec) {
    const bKey = `__burst:${opts.key}`;
    const bWinStart = now - opts.burstWindowSec;
    let slot = _memFallback.get(bKey);
    if (!slot || slot.windowStart < bWinStart) {
      slot = { count: 0, windowStart: now };
      _memFallback.set(bKey, slot);
    }
    allowedBurst = slot.count < opts.burstLimit;
    if (allowedBurst && allowedMain) slot.count++;
  }

  const allowed = allowedMain && allowedBurst;

  return {
    allowed,
    remaining: allowed ? rpc.remaining : 0,
    reset: rpc.reset,
    limit: opts.limit,
    windowSec: opts.windowSec,
    reason: allowed ? undefined : (!allowedBurst ? 'burst' : 'main'),
  };
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Rate limit excedido',
      code: 'RATE_LIMIT_EXCEEDED',
      limit: result.limit,
      window_seconds: result.windowSec,
      reset: result.reset,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.windowSec),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.reset),
      },
    },
  );
}
