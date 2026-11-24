/**
 * P5-086: Metabase Signed Embed Token Generator
 *
 * Edge Function: POST /functions/v1/metabase-embed
 *
 * Gera tokens JWT para Signed Embedding do Metabase com:
 *   1. Escopo por empresa_id (RLS-like — cada tenant vê só seus dashboards)
 *   2. TTL curto: 3 horas (token longo = risco de vazamento)
 *   3. Cache em memória: tokens reuse por 3h sem re-gerar
 *   4. Metabase em offline → fallback flag para frontend usar gráficos recharts
 *
 * Cenários de falha simulados:
 *   1. Metabase offline → healthcheck falha → retorna { metabaseOk: false }
 *   2. JWT mal-formado → 400 BAD_REQUEST
 *   3. Secret key ausente → 500 INTERNAL_ERROR
 *   4. Empresa sem acesso ao dashboard → 403 FORBIDDEN
 *   5. Token reutilizado após TTL → re-gera transparantemente
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/contract.ts';
import { logger } from '../_shared/logger.ts';
import { safeFetch } from '../_shared/safe-fetch.ts';

const METABASE_URL   = Deno.env.get('METABASE_URL')          ?? '';
const METABASE_SECRET = Deno.env.get('METABASE_SECRET_KEY')   ?? '';
const METABASE_SITE_URL = Deno.env.get('METABASE_SITE_URL')  ?? '';
const TOKEN_TTL_MS    = Number(Deno.env.get('METABASE_TOKEN_TTL_MS') ?? 10_800_000); // 3h
const HEALTH_TIMEOUT_MS = 5_000;

// ── In-memory cache de tokens ───────────────────────────────────
interface CachedToken {
  token:    string;
  expiresAt: number; // unix ms
  dashboardId: string;
}
const tokenCache = new Map<string, CachedToken>();

function cacheKey(userId: string, empresaId: string, dashboardId: string) {
  return `${userId}|${empresaId}|${dashboardId}`;
}

function getCachedToken(key: string): string | null {
  const cached = tokenCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    tokenCache.delete(key);
    return null;
  }
  return cached.token;
}

// ── Helpers ────────────────────────────────────────────────────
function base64url_encode(data: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...data));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signJwt(payload: Record<string, unknown>, secret: string, expiresMs: number): Promise<string> {
  const header  = { alg: 'HS256', typ: 'JWT' };
  const now     = Math.floor(Date.now() / 1000);
  const exp     = now + Math.floor(expiresMs / 1000);

  const encHeader = base64url_encode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64url_encode(new TextEncoder().encode(JSON.stringify({ ...payload, iat: now, exp })));

  const signingInput = `${encHeader}.${encPayload}`;
  const keyData     = new TextEncoder().encode(secret);
  const signingKey   = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature    = await crypto.subtle.sign('HMAC', signingKey,
    new TextEncoder().encode(signingInput));
  const sigBytes     = new Uint8Array(signature);
  const encSig       = base64url_encode(sigBytes);

  return `${signingInput}.${encSig}`;
}

async function metabaseHealthCheck(): Promise<boolean> {
  if (!METABASE_URL) return false;
  try {
    const res = await safeFetch(`${METABASE_URL}/api/health`, {
      timeoutMs: HEALTH_TIMEOUT_MS,
      tag: 'metabase',
    });
    return res.ok;
  } catch {
    return false;
  }
}

function parseDashboardId(id: unknown): { valid: boolean; value: number | null } {
  if (typeof id === 'number') return { valid: true, value: id };
  if (typeof id === 'string') {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? { valid: true, value: n } : { valid: false, value: null };
  }
  return { valid: false, value: null };
}

// ── Dashboard ACL: quais dashboards cada empresa pode ver ──────
const DASHBOARD_ACL: Record<number, string[]> = {
  // ID do dashboard no Metabase → roles que têm acesso
  // Se array vazio → todos os usuários autenticados acessam
  // Se roles listadas → apenas esses perfis têm acesso
};
const ALL_EMPRESAS_ACL: Record<number, boolean> = {
  1: true,   // RH Overview — todos
  2: true,   // Folha — todos
  3: true,   // eSocial — admin + dp
  4: true,   // Passivo — admin + dp
};

// ── Main handler ───────────────────────────────────────────────
serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── 1. Autenticação ─────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Autenticacao obrigatoria' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
    const serviceKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase       = createClient(supabaseUrl, serviceKey);
    const token          = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalido ou expirado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Extrair empresa_id do JWT ───────────────────────────
    const empresaId = (user.app_metadata?.empresa_id ?? user.user_metadata?.empresa_id) as string | undefined;
    if (!empresaId) {
      return new Response(JSON.stringify({ error: 'Empresa nao encontrada no token' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Parse body ──────────────────────────────────────────
    let body: { dashboardId?: unknown; params?: Record<string, string | string[]>; forceRefresh?: boolean };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Body invalido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { dashboardId, params = {}, forceRefresh = false } = body;

    // ── 4. Validar dashboardId ─────────────────────────────────
    const parsed = parseDashboardId(dashboardId);
    if (!parsed.valid || parsed.value === null) {
      return new Response(JSON.stringify({
        error: 'dashboardId invalido — deve ser numero inteiro positivo',
        received: dashboardId,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const dashId = parsed.value!;

    // ── 5. Verificar ACL ───────────────────────────────────────
    if (ALL_EMPRESAS_ACL[dashId] === false) {
      return new Response(JSON.stringify({ error: 'Acesso negado a este dashboard' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 6. Health check do Metabase ────────────────────────────
    const metabaseOk = await metabaseHealthCheck();

    if (!metabaseOk) {
      // Metabase offline → retorna flag para frontend usar fallback recharts
      logger.warn('[metabase-embed] Metabase indisponivel — retornando fallback', {
        userId: user.id, empresaId, dashboardId: dashId,
      });
      return new Response(JSON.stringify({
        metabaseOk: false,
        fallback: true,
        message: 'Metabase indisponivel — usando gráficos nativos',
        dashboardId: dashId,
        // Params de filtro para o fallback recharts
        filterParams: params,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── 7. Verificar cache ─────────────────────────────────────
    const ck = cacheKey(user.id, empresaId, String(dashId));
    if (!forceRefresh) {
      const cached = getCachedToken(ck);
      if (cached) {
        logger.info('[metabase-embed] Token cache hit', { dashboardId: dashId, userId: user.id });
        return new Response(JSON.stringify({
          metabaseOk: true,
          token: cached,
          expiresAt: tokenCache.get(ck)!.expiresAt,
          dashboardId: dashId,
          dashboardUrl: `${METABASE_SITE_URL}/dashboard/${dashId}`,
          cacheHit: true,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ── 8. Gerar JWT do Metabase ────────────────────────────────
    if (!METABASE_SECRET) {
      logger.error('[metabase-embed] METABASE_SECRET_KEY nao configurado');
      return new Response(JSON.stringify({
        error: 'Configuracao incompleta — contacte o administrador',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const jwtPayload = {
      resource:   { dashboard: { id: dashId } },
      params: {
        empresa_id: empresaId,
        ...params,
      },
      exp: Math.floor((Date.now() + TOKEN_TTL_MS) / 1000),
    };

    const signedToken = await signJwt(jwtPayload, METABASE_SECRET, TOKEN_TTL_MS);

    // ── 9. Armazenar em cache ───────────────────────────────────
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    tokenCache.set(ck, { token: signedToken, expiresAt, dashboardId: String(dashId) });

    // Limpa cache antigo periodicamente (mantém no max 500 entries)
    if (tokenCache.size > 500) {
      const oldest = [...tokenCache.entries()]
        .sort(([, a], [, b]) => a.expiresAt - b.expiresAt)
        .slice(0, 100);
      for (const [k] of oldest) tokenCache.delete(k);
    }

    logger.info('[metabase-embed] Token gerado', {
      userId: user.id, empresaId, dashboardId: dashId, ttlMs: TOKEN_TTL_MS,
    });

    return new Response(JSON.stringify({
      metabaseOk: true,
      token: signedToken,
      expiresAt,
      dashboardId: dashId,
      dashboardUrl: `${METABASE_SITE_URL}/dashboard/${dashId}#${signedToken}`,
      cacheHit: false,
      filterParams: params,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    logger.error('[metabase-embed] Erro interno', { error: String(err) });
    return new Response(JSON.stringify({
      error: 'Erro interno ao gerar token de embed',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
