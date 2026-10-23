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
import { corsHeaders } from './contract.ts';

/**
 * Cliente mínimo aceito pelo rate limit (apenas `rpc`).
 *
 * A tipagem é ESTRUTURAL de propósito: cada Edge Function fixa a própria versão
 * de `@supabase/supabase-js`, e duas versões do tipo `SupabaseClient` não são
 * atribuíveis entre si. O runtime é o mesmo objeto; só o tipo muda.
 */
export interface RateLimitRpcClient {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
}

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
  admin: RateLimitRpcClient,
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

/* ─── Rate limit DUPLO (empresa + usuário) — SaaS multiempresa ─────────────── */

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

function slotDeMemoria(key: string, now: number, windowSec: number) {
  const windowStart = now - windowSec;
  let slot = _memFallback.get(key);
  if (!slot || slot.windowStart < windowStart) {
    slot = { count: 0, windowStart: now };
    _memFallback.set(key, slot);
  }
  return slot;
}

/**
 * Verifica DOIS baldes na MESMA transação (RPC `edge_rate_limit_check_dual`).
 *
 * - Empresa: teto do tenant, compartilhado por todos os usuários da empresa.
 * - Usuário: teto individual, para impedir que uma pessoa consuma a empresa toda.
 *
 * A quota só é consumida quando os dois permitem. Se o RPC estiver indisponível,
 * aplica fallback em memória com limite reduzido (fail-closed), como o helper
 * simples — nunca fail-open.
 */
export async function checkRateLimitDuplo(
  admin: RateLimitRpcClient,
  opts: RateLimitDuploOptions,
): Promise<RateLimitDuploResult> {
  const now = Math.floor(Date.now() / 1000);

  const { data, error } = await admin.rpc('edge_rate_limit_check_dual', {
    p_empresa_key: opts.empresaKey,
    p_empresa_limit: opts.empresaLimit,
    p_usuario_key: opts.usuarioKey ?? null,
    p_usuario_limit: opts.usuarioLimit ?? 0,
    p_window_sec: opts.windowSec,
    p_now: now,
  });

  if (error) {
    console.error('[rateLimit] RPC dual indisponível — fallback em memória (fail-closed):', error.message);

    const empresaFallbackLimit = Math.max(1, Math.floor(opts.empresaLimit * MEM_LIMIT_FRACTION));
    const empresaSlot = slotDeMemoria(opts.empresaKey, now, opts.windowSec);
    const empresaOk = empresaSlot.count < empresaFallbackLimit;

    // Sem usuário confiável: aplica apenas o balde da empresa (nunca inventa).
    if (!opts.usuarioKey || !opts.usuarioLimit) {
      const allowed = empresaOk;
      if (allowed) empresaSlot.count += 1;
      if (_memFallback.size > 1000) {
        const oldest = _memFallback.keys().next().value;
        if (oldest !== undefined) _memFallback.delete(oldest);
      }
      return {
        allowed,
        reason: allowed ? undefined : 'empresa',
        empresa: {
          current: empresaSlot.count,
          limit: empresaFallbackLimit,
          remaining: Math.max(0, empresaFallbackLimit - empresaSlot.count),
        },
        usuario: { current: 0, limit: 0, remaining: 0 },
        reset: now + opts.windowSec,
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

    if (_memFallback.size > 1000) {
      const oldest = _memFallback.keys().next().value;
      if (oldest !== undefined) _memFallback.delete(oldest);
    }

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
      reset: now + opts.windowSec,
      windowSec: opts.windowSec,
    };
  }

  const rpc = data as RpcDuploResult;
  const semUsuario = !opts.usuarioKey || !opts.usuarioLimit;
  return {
    allowed: Boolean(rpc?.allowed),
    reason: rpc?.reason ?? undefined,
    empresa: {
      current: Number(rpc?.empresa_current ?? 0),
      limit: Number(rpc?.empresa_limit ?? opts.empresaLimit),
      remaining: Number(rpc?.empresa_remaining ?? 0),
    },
    usuario: semUsuario
      ? { current: 0, limit: 0, remaining: 0 }
      : {
          current: Number(rpc?.usuario_current ?? 0),
          limit: Number(rpc?.usuario_limit ?? opts.usuarioLimit),
          remaining: Number(rpc?.usuario_remaining ?? 0),
        },
    reset: Number(rpc?.reset ?? now + opts.windowSec),
    windowSec: opts.windowSec,
  };
}

export function rateLimitDuploResponse(result: RateLimitDuploResult): Response {
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
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.windowSec),
        'X-RateLimit-Limit': String(result.usuario.limit || result.empresa.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.reset),
        'X-RateLimit-Empresa-Limit': String(result.empresa.limit),
      },
    }
  );
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
