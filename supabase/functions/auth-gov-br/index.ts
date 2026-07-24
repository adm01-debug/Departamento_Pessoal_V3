import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

const GOVBR_BASE_URL = Deno.env.get('GOVBR_BASE_URL') ?? 'https://sso.acesso.gov.br';
const GOVBR_AUTH_URL = `${GOVBR_BASE_URL}/authorize`;
const GOVBR_TOKEN_URL = `${GOVBR_BASE_URL}/token`;
const GOVBR_USERINFO_URL = `${GOVBR_BASE_URL}/userinfo`;

const DEFAULT_ALLOWED_REDIRECT_ORIGINS = [
  'https://sistema-dp.lovable.app',
  'https://unified-harmony-hub.lovable.app',
];

function isAllowedRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    const allowed = (Deno.env.get('ALLOWED_REDIRECT_ORIGINS') ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .concat(DEFAULT_ALLOWED_REDIRECT_ORIGINS);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // Also allow same Supabase project origin
    if (supabaseUrl) {
      try { allowed.push(new URL(supabaseUrl).origin); } catch { /* noop */ }
    }
    return allowed.some(origin => {
      try { return url.origin === new URL(origin).origin; } catch { return false; }
    });
  } catch {
    return false;
  }
}

const BodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('get_auth_url'),
    redirectUri: z.string().url().max(512),
  }),
  z.object({
    action: z.literal('callback'),
    code: z.string().min(1).max(2048),
    state: z.string().uuid(),
    redirectUri: z.string().url().max(512).optional(),
  }),
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // JWT auth required for both actions
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ success: false, error: 'Autenticação obrigatória' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ success: false, error: 'Sessão inválida' }, 401);
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit: 5 auth attempts per minute per user
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `govbr:${userId}`, limit: 5, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ success: false, error: 'Payload inválido' }, 422);
    }
    const body = parsed.data;

    if (body.action === 'get_auth_url') {
      if (!isAllowedRedirectUri(body.redirectUri)) {
        return json({ success: false, error: 'URI de redirecionamento não permitida' }, 400);
      }

      const clientId = Deno.env.get('GOVBR_CLIENT_ID');
      if (!clientId) {
        return json({ success: false, error: 'Gov.br não configurado' }, 503);
      }

      const newState = crypto.randomUUID();
      const nonce = crypto.randomUUID();

      await supabase.from('govbr_auth_state').insert({
        state: newState,
        nonce,
        redirect_uri: body.redirectUri,
        user_id: userId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10min TTL
      });

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: 'openid profile govbr_confiabilidades',
        redirect_uri: body.redirectUri,
        nonce,
        state: newState,
      });

      return json({ success: true, url: `${GOVBR_AUTH_URL}?${params.toString()}` });
    }

    if (body.action === 'callback') {
      const { data: authState } = await supabase
        .from('govbr_auth_state')
        .select('*')
        .eq('state', body.state)
        .eq('user_id', userId)
        .maybeSingle();

      if (!authState) {
        return json({ success: false, error: 'Estado de autenticação inválido ou expirado' }, 400);
      }

      // Check expiry
      if (authState.expires_at && new Date(authState.expires_at) < new Date()) {
        await supabase.from('govbr_auth_state').delete().eq('id', authState.id);
        return json({ success: false, error: 'Estado expirado' }, 400);
      }

      const clientId = Deno.env.get('GOVBR_CLIENT_ID') ?? '';
      const clientSecret = Deno.env.get('GOVBR_CLIENT_SECRET') ?? '';

      const tokenResponse = await fetch(GOVBR_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: body.code,
          redirect_uri: authState.redirect_uri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        return json({ success: false, error: 'Falha na troca de token com Gov.br' }, 502);
      }
      const tokens = await tokenResponse.json();

      const userResponse = await fetch(GOVBR_USERINFO_URL, {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });

      if (!userResponse.ok) {
        return json({ success: false, error: 'Falha ao obter dados do Gov.br' }, 502);
      }
      const userInfo = await userResponse.json();

      await supabase.from('profiles').update({
        govbr_uid: userInfo.sub,
        govbr_nivel_autenticacao: userInfo.nivel || 'Bronze',
        cpf_validado_govbr: true,
        nome_completo: userInfo.name,
      }).eq('user_id', userId);

      await supabase.from('govbr_auth_state').delete().eq('id', authState.id);

      return json({ success: true, nivel: userInfo.nivel || 'Bronze' });
    }

    return json({ success: false, error: 'Ação inválida' }, 400);
  } catch (error: unknown) {
    try { captureException(error, { fn: 'auth-gov-br' }); } catch { /* noop */ }
    return json({ success: false, error: 'Erro interno' }, 500);
  }
});
