import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

// Onda 23: rate limit hardening.
// Bugs originais:
//  - Sem auth → anon podia spoofar `key` e/ou exaurir quota de outro user
//  - Cliente escolhia `limit` — passando 999999 anulava o guard-rail
//  - `key` sem namespacing — colisão trivial entre usuários
// Fix: JWT obrigatória, namespacing forçado por user.id, limites com hard-cap
// server-side (limit ≤ 1000/janela, window ≤ 3600s), min = 1.

const BodySchema = z.object({
  key: z.string().min(1).max(128).regex(/^[a-zA-Z0-9:_\-\.]+$/, 'chave inválida'),
  limit: z.number().int().min(1).max(1000).optional(),
  window_seconds: z.number().int().min(1).max(3600).optional(),
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const selfRateBuckets = new Map<string, { count: number; resetAt: number }>();
const SELF_LIMIT = 30;
const SELF_WINDOW = 60_000;

function selfRateCheck(userId: string): boolean {
  const now = Date.now();
  const b = selfRateBuckets.get(userId);
  if (!b || b.resetAt <= now) {
    selfRateBuckets.set(userId, { count: 1, resetAt: now + SELF_WINDOW });
    return true;
  }
  b.count++;
  return b.count <= SELF_LIMIT;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return createErrorResponse('Não autenticado', 401, 'UNAUTHORIZED');

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    }
    const userId = userData.user.id;

    if (!selfRateCheck(userId)) {
      return new Response(JSON.stringify({
        success: false, error: 'Rate limit endpoint abuse detected',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const { body: _pb } = await parseJsonBody(req);
    const parsed = BodySchema.safeParse(_pb ?? {});
    if (!parsed.success) return createValidationErrorResponse(parsed.error);

    const limit = parsed.data.limit ?? 100;
    const windowSec = parsed.data.window_seconds ?? 60;
    // Namespacing forçado: quota é sempre por usuário
    const key = `u:${userId}:${parsed.data.key}`;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSec;

    // Best-effort cleanup — não bloqueia decisão se falhar
    admin.from('rate_limits').delete().lt('timestamp', windowStart).then(
      () => {}, (e) => console.warn('rate_limits cleanup falhou:', e?.message),
    );

    const { count, error: countError } = await admin
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('key', key)
      .gte('timestamp', windowStart);

    if (countError) {
      await captureException(countError, { function: 'rateLimit' });
      return createErrorResponse('Falha ao verificar rate limit', 500, 'RATE_LIMIT_ERROR');
    }

    const currentCount = count ?? 0;
    const allowed = currentCount < limit;

    if (allowed) {
      const { error: insErr } = await admin.from('rate_limits').insert({ key, timestamp: now });
      if (insErr) console.warn('rate_limits insert falhou:', insErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        allowed,
        remaining: Math.max(0, limit - currentCount - (allowed ? 1 : 0)),
        reset: windowStart + windowSec,
        limit,
        window_seconds: windowSec,
      }),
      {
        status: allowed ? 200 : 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...(allowed ? {} : { 'Retry-After': String(windowSec) }),
        },
      },
    );
  } catch (err) {
    await captureException(err, { function: 'rateLimit' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
