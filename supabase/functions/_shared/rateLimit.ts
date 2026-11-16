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
import { getCorsHeaders } from './contract.ts';

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

function isValidRpcResult(value: unknown, expectedLimit: number): value is RpcResult {
  if (typeof value !== 'object' || value === null) return false;
  const rpc = value as Record<string, unknown>;
  return (
    typeof rpc.allowed === 'boolean' &&
    typeof rpc.current === 'number' && Number.isFinite(rpc.current) && rpc.current >= 0 &&
    typeof rpc.limit === 'number' && rpc.limit === expectedLimit &&
    typeof rpc.remaining === 'number' && Number.isFinite(rpc.remaining) &&
    rpc.remaining >= 0 && rpc.remaining <= expectedLimit &&
    typeof rpc.reset === 'number' && Number.isFinite(rpc.reset)
  );
}

function memoryFallback(
  opts: RateLimitOptions,
  now: number,
  reason: string,
): RateLimitResult {
  // It is not shared between Edge isolates, but this prevents an RPC outage
  // from silently removing rate limiting altogether.
  console.error(`[rateLimit] RPC indisponível (${reason}) — fallback em memória (fail-closed)`);

  const fallbackLimit = Math.max(1, Math.floor(opts.limit * MEM_LIMIT_FRACTION));
  const windowStart = now - opts.windowSec;
  let slot = _memFallback.get(opts.key);
  if (!slot || slot.windowStart < windowStart) {
    slot = { count: 0, windowStart: now };
    _memFallback.set(opts.key, slot);
  }
  const allowed = slot.count < fallbackLimit;
  if (allowed) slot.count++;

  if (_memFallback.size > 1000) {
    const oldest = _memFallback.keys().next().value;
    if (oldest !== undefined) _memFallback.delete(oldest);
  }

  return {
    allowed,
    remaining: Math.max(0, fallbackLimit - slot.count),
    // Return the end of the active fallback window, not `now`.
    reset: slot.windowStart + opts.windowSec,
    limit: fallbackLimit,
    windowSec: opts.windowSec,
  };
}

function consumeBurst(
  opts: RateLimitOptions,
  now: number,
): Pick<RateLimitResult, 'allowed' | 'limit' | 'reset' | 'windowSec' | 'reason'> | null {
  if (!opts.burstLimit || !opts.burstWindowSec) return null;

  const key = `__burst:${opts.key}`;
  const windowStart = now - opts.burstWindowSec;
  let slot = _memFallback.get(key);
  if (!slot || slot.windowStart < windowStart) {
    slot = { count: 0, windowStart: now };
    _memFallback.set(key, slot);
  }

  if (slot.count >= opts.burstLimit) {
    return {
      allowed: false,
      limit: opts.burstLimit,
      reset: slot.windowStart + opts.burstWindowSec,
      windowSec: opts.burstWindowSec,
      reason: 'burst',
    };
  }

  // Reserve this first. A request rejected for a full burst must not consume
  // one token from the database-backed main window.
  slot.count++;
  return null;
}

/**
 * O helper só depende da RPC abaixo. Tipar a superfície mínima evita acoplar
 * todas as Edge Functions à mesma instância/versionamento de supabase-js — a
 * incompatibilidade entre os genéricos do cliente já fazia `deno check` de
 * consumers falhar mesmo quando a chamada RPC estava correta.
 */
export interface RateLimitRpcClient {
  rpc(
    name: 'edge_rate_limit_check',
    args: {
      p_key: string;
      p_limit: number;
      p_window_sec: number;
      p_now: number;
    },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export async function checkRateLimit(
  admin: RateLimitRpcClient,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);

  const burstRejection = consumeBurst(opts, now);
  if (burstRejection) return { ...burstRejection, remaining: 0 };

  // Atomic check via DB RPC (pg_advisory_xact_lock — eliminates SELECT+INSERT race).
  let result: { data: unknown; error: { message: string } | null };
  try {
    result = await admin.rpc('edge_rate_limit_check', {
      p_key: opts.key,
      p_limit: opts.limit,
      p_window_sec: opts.windowSec,
      p_now: now,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'RPC rejected without an Error';
    return memoryFallback(opts, now, message);
  }

  if (result.error) {
    return memoryFallback(opts, now, result.error.message);
  }

  if (!isValidRpcResult(result.data, opts.limit)) {
    return memoryFallback(opts, now, 'invalid RPC response shape');
  }

  const rpc = result.data;

  return {
    allowed: rpc.allowed,
    remaining: rpc.allowed ? rpc.remaining : 0,
    reset: rpc.reset,
    limit: opts.limit,
    windowSec: opts.windowSec,
    reason: rpc.allowed ? undefined : 'main',
  };
}

export function rateLimitResponse(result: RateLimitResult, req?: Request): Response {
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
        ...getCorsHeaders(req),
        'Content-Type': 'application/json',
        'Retry-After': String(result.windowSec),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.reset),
      },
    },
  );
}

// ─── Rate limit duplo (empresa + usuário) ────────────────────────────────────
//
// Uso:
//   const rl = await checkRateLimitDuplo(admin, {
//     empresaKey: `capas:empresa:${empresaId}`, empresaLimit: 20,
//     usuarioKey: `capas:usuario:${userId}`, usuarioLimit: 5, windowSec: 60,
//   });
//   if (!rl.allowed) return rateLimitDuploResponse(rl, req);
//
// A RPC `edge_rate_limit_check_dual` (migration 20261023140000_edge_rate_limit_dual)
// verifica os DOIS baldes na MESMA transação: o teto do tenant e o teto
// individual. A quota só é consumida quando os dois permitem.

/** Cliente mínimo da RPC dual — mesma razão de tipagem estrutural do simples. */
export interface RateLimitDuploRpcClient {
  rpc(
    name: 'edge_rate_limit_check_dual',
    args: {
      p_empresa_key: string;
      p_empresa_limit: number;
      p_usuario_key: string | null;
      p_usuario_limit: number;
      p_window_sec: number;
      p_now: number;
    },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export interface RateLimitDuploOptions {
  empresaKey: string;
  empresaLimit: number;
  /** Ausente quando não há usuário confiável (ex.: worker sem requested_by). */
  usuarioKey?: string | null;
  usuarioLimit?: number | null;
  windowSec: number;
}

export interface RateLimitDuploResult {
  allowed: boolean;
  reason?: 'empresa' | 'usuario';
  empresa: { current: number; limit: number; remaining: number };
  usuario: { current: number; limit: number; remaining: number };
  reset: number;
  windowSec: number;
}

interface RpcDuploResult {
  allowed: boolean;
  reason: 'empresa' | 'usuario' | null;
  empresa_current: number;
  empresa_limit: number;
  empresa_remaining: number;
  usuario_current: number;
  usuario_limit: number;
  usuario_remaining: number;
  reset: number;
}

function isValidRpcDuploResult(value: unknown): value is RpcDuploResult {
  if (typeof value !== 'object' || value === null) return false;
  const rpc = value as Record<string, unknown>;
  const numero = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  return (
    typeof rpc.allowed === 'boolean' &&
    (rpc.reason === null || rpc.reason === 'empresa' || rpc.reason === 'usuario') &&
    numero(rpc.empresa_current) &&
    numero(rpc.empresa_limit) &&
    numero(rpc.empresa_remaining) &&
    numero(rpc.usuario_current) &&
    numero(rpc.usuario_limit) &&
    numero(rpc.usuario_remaining) &&
    numero(rpc.reset)
  );
}

function slotDeMemoria(key: string, now: number, windowSec: number) {
  const windowStart = now - windowSec;
  let slot = _memFallback.get(key);
  if (!slot || slot.windowStart < windowStart) {
    slot = { count: 0, windowStart: now };
    _memFallback.set(key, slot);
  }
  return slot;
}

function podaMemoria() {
  if (_memFallback.size > 1000) {
    const oldest = _memFallback.keys().next().value;
    if (oldest !== undefined) _memFallback.delete(oldest);
  }
}

/** Fallback em memória do duplo: limite reduzido, nunca fail-open. */
function memoryFallbackDuplo(
  opts: RateLimitDuploOptions,
  now: number,
  motivo: string,
): RateLimitDuploResult {
  console.error(`[rateLimit] RPC dual indisponível (${motivo}) — fallback em memória (fail-closed)`);

  const empresaFallbackLimit = Math.max(1, Math.floor(opts.empresaLimit * MEM_LIMIT_FRACTION));
  const empresaSlot = slotDeMemoria(opts.empresaKey, now, opts.windowSec);
  const empresaOk = empresaSlot.count < empresaFallbackLimit;

  // Sem usuário confiável: aplica apenas o balde da empresa (nunca inventa).
  if (!opts.usuarioKey || !opts.usuarioLimit) {
    if (empresaOk) empresaSlot.count += 1;
    podaMemoria();
    return {
      allowed: empresaOk,
      reason: empresaOk ? undefined : 'empresa',
      empresa: {
        current: empresaSlot.count,
        limit: empresaFallbackLimit,
        remaining: Math.max(0, empresaFallbackLimit - empresaSlot.count),
      },
      usuario: { current: 0, limit: 0, remaining: 0 },
      reset: empresaSlot.windowStart + opts.windowSec,
      windowSec: opts.windowSec,
    };
  }

  const usuarioFallbackLimit = Math.max(1, Math.floor(opts.usuarioLimit * MEM_LIMIT_FRACTION));
  const usuarioSlot = slotDeMemoria(opts.usuarioKey, now, opts.windowSec);
  const usuarioOk = usuarioSlot.count < usuarioFallbackLimit;
  const allowed = empresaOk && usuarioOk;
  if (allowed) {
    empresaSlot.count += 1;
    usuarioSlot.count += 1;
  }
  podaMemoria();

  return {
    allowed,
    reason: allowed ? undefined : !empresaOk ? 'empresa' : 'usuario',
    empresa: {
      current: empresaSlot.count,
      limit: empresaFallbackLimit,
      remaining: Math.max(0, empresaFallbackLimit - empresaSlot.count),
    },
    usuario: {
      current: usuarioSlot.count,
      limit: usuarioFallbackLimit,
      remaining: Math.max(0, usuarioFallbackLimit - usuarioSlot.count),
    },
    reset: empresaSlot.windowStart + opts.windowSec,
    windowSec: opts.windowSec,
  };
}

export async function checkRateLimitDuplo(
  admin: RateLimitDuploRpcClient,
  opts: RateLimitDuploOptions,
): Promise<RateLimitDuploResult> {
  const now = Math.floor(Date.now() / 1000);

  let result: { data: unknown; error: { message: string } | null };
  try {
    result = await admin.rpc('edge_rate_limit_check_dual', {
      p_empresa_key: opts.empresaKey,
      p_empresa_limit: opts.empresaLimit,
      p_usuario_key: opts.usuarioKey ?? null,
      p_usuario_limit: opts.usuarioLimit ?? 0,
      p_window_sec: opts.windowSec,
      p_now: now,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'RPC rejected without an Error';
    return memoryFallbackDuplo(opts, now, message);
  }

  if (result.error) return memoryFallbackDuplo(opts, now, result.error.message);
  if (!isValidRpcDuploResult(result.data)) {
    return memoryFallbackDuplo(opts, now, 'invalid RPC response shape');
  }

  const rpc = result.data;
  const semUsuario = !opts.usuarioKey || !opts.usuarioLimit;

  return {
    allowed: rpc.allowed,
    reason: rpc.reason ?? undefined,
    empresa: {
      current: rpc.empresa_current,
      limit: rpc.empresa_limit,
      remaining: rpc.allowed ? rpc.empresa_remaining : 0,
    },
    usuario: semUsuario
      ? { current: 0, limit: 0, remaining: 0 }
      : {
          current: rpc.usuario_current,
          limit: rpc.usuario_limit,
          remaining: rpc.allowed ? rpc.usuario_remaining : 0,
        },
    reset: rpc.reset,
    windowSec: opts.windowSec,
  };
}

export function rateLimitDuploResponse(result: RateLimitDuploResult, req?: Request): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Rate limit excedido',
      code: 'RATE_LIMIT_EXCEEDED',
      scope: result.reason ?? 'geral',
      empresa: result.empresa,
      usuario: result.usuario,
      window_seconds: result.windowSec,
      reset: result.reset,
    }),
    {
      status: 429,
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': 'application/json',
        'Retry-After': String(result.windowSec),
        'X-RateLimit-Limit': String(result.usuario.limit || result.empresa.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.reset),
        'X-RateLimit-Empresa-Limit': String(result.empresa.limit),
      },
    },
  );
}
