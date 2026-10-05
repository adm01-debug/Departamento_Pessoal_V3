import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

// Onda 23: rate limit hardening.
// Bugs originais:
//  - Sem auth → anon podia spoofar `key` e/ou exaurir quota de outro user
//  - Cliente escolhia `limit` — passando 999999 anulava o guard-rail
//  - `key` sem namespacing — colisão trivial entre usuários
// Fix: JWT obrigatória, namespacing forçado por user.id, limites com hard-cap
// server-side (limit ≤ 1000/janela, window ≤ 3600s), min = 1.

const BodySchema = z.object({
  key: z.string().min(1).max(128).regex(/^[a-zA-Z0-9:_.-]+$/, 'chave inválida'),
  limit: z.number().int().min(1).max(1000).optional(),
  window_seconds: z.number().int().min(1).max(3600).optional(),
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';


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

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Self-throttle do próprio endpoint — agora via RPC atômica (o bucket
    // em memória anterior não era compartilhado entre isolates).
    const self = await checkRateLimit(admin as never, {
      key: `rateLimit:self:${userId}`,
      limit: 30,
      windowSec: 60,
    });
    if (!self.allowed) {
      return new Response(JSON.stringify({
        success: false, error: 'Rate limit endpoint abuse detected',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    const parsed = BodySchema.safeParse(_pb ?? {});
    if (!parsed.success) return createValidationErrorResponse(parsed.error, req);

    const limit = parsed.data.limit ?? 100;
    const windowSec = parsed.data.window_seconds ?? 60;
    // Namespacing forçado: quota é sempre por usuário
    const key = `u:${userId}:${parsed.data.key}`;

    // Decisão atômica via edge_rate_limit_check (pg_advisory_xact_lock) —
    // o SELECT+INSERT anterior tinha corrida TOCTOU entre chamadas
    // concorrentes da mesma chave.
    const rl = await checkRateLimit(admin as never, { key, limit, windowSec });
    const allowed = rl.allowed;

    return new Response(
      JSON.stringify({
        success: true,
        allowed,
        remaining: rl.remaining,
        reset: rl.reset,
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
