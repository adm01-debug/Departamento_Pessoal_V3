import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://esm.sh/zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { enforceOrigin, getCorsHeaders, handlePreflight, parseJsonBody } from '../_shared/contract.ts';
import { safeFetch, safeGet } from '../_shared/safe-fetch.ts';
import { cpfDoSub, type GovbrLookups, resolverLogin, validarVinculo } from './govbrIdentity.ts';

const GOVBR_BASE_URL = Deno.env.get('GOVBR_BASE_URL') ?? 'https://sso.acesso.gov.br';
const GOVBR_AUTH_URL = `${GOVBR_BASE_URL}/authorize`;
const GOVBR_TOKEN_URL = `${GOVBR_BASE_URL}/token`;
const GOVBR_USERINFO_URL = `${GOVBR_BASE_URL}/userinfo`;

const DEFAULT_ALLOWED_REDIRECT_ORIGINS = [
  'https://departamento-pessoal-v3.vercel.app',
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

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const forbiddenOrigin = enforceOrigin(req);
  if (forbiddenOrigin) return forbiddenOrigin;
  if (req.method !== 'POST') return json(req, { success: false, error: 'Method not allowed' }, 405);

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    const raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json(req, { success: false, error: 'Payload inválido' }, 422);
    }
    const body = parsed.data;

    // JWT é OPCIONAL: o botão "Entrar com gov.br" na tela de login chama
    // get_auth_url sem sessão, e o callback completa o login (modo anônimo,
    // state.user_id NULL). Com sessão ativa, o fluxo vincula a conta gov.br
    // ao perfil logado (state.user_id = userId).
    const authHeader = req.headers.get('Authorization') ?? '';
    let userId: string | null = null;
    if (authHeader.startsWith('Bearer ')) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData } = await userClient.auth.getUser();
      userId = userData?.user?.id ?? null;
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit: 5 tentativas/min por usuário ou por IP (fluxo anônimo).
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(supabase, {
      key: userId ? `govbr:${userId}` : `govbr:anon:${ip}`,
      limit: 5,
      windowSec: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl, req);

    if (body.action === 'get_auth_url') {
      if (!isAllowedRedirectUri(body.redirectUri)) {
        return json(req, { success: false, error: 'URI de redirecionamento não permitida' }, 400);
      }

      const clientId = Deno.env.get('GOVBR_CLIENT_ID');
      if (!clientId) {
        return json(req, { success: false, error: 'Gov.br não configurado' }, 503);
      }

      const newState = crypto.randomUUID();
      const nonce = crypto.randomUUID();

      const { error: stateErr } = await supabase.from('govbr_auth_state').insert({
        state: newState,
        nonce,
        redirect_uri: body.redirectUri,
        user_id: userId, // null = fluxo de login (anônimo); uuid = vinculação
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10min TTL
      });
      if (stateErr) throw stateErr;

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: 'openid profile govbr_confiabilidades',
        redirect_uri: body.redirectUri,
        nonce,
        state: newState,
      });

      return json(req, { success: true, url: `${GOVBR_AUTH_URL}?${params.toString()}` });
    }

    if (body.action === 'callback') {
      // O state é consultado só pelo valor (não por user_id): o request do
      // callback pode chegar com ou sem sessão conforme o modo do fluxo.
      const { data: authState } = await supabase
        .from('govbr_auth_state')
        .select('*')
        .eq('state', body.state)
        .maybeSingle();

      if (!authState) {
        return json(req, { success: false, error: 'Estado de autenticação inválido ou expirado' }, 400);
      }
      if (authState.user_id && authState.user_id !== userId) {
        return json(req, { success: false, error: 'Estado pertence a outra sessão' }, 403);
      }

      // Check expiry
      if (authState.expires_at && new Date(authState.expires_at) < new Date()) {
        await supabase.from('govbr_auth_state').delete().eq('id', authState.id);
        return json(req, { success: false, error: 'Estado expirado' }, 400);
      }

      const clientId = Deno.env.get('GOVBR_CLIENT_ID') ?? '';
      const clientSecret = Deno.env.get('GOVBR_CLIENT_SECRET') ?? '';

      const tokenResponse = await safeFetch(GOVBR_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: body.code,
          redirect_uri: authState.redirect_uri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
        timeoutMs: 10_000,
        tag: 'govbr',
      });

      if (!tokenResponse.ok) {
        return json(req, { success: false, error: 'Falha na troca de token com Gov.br' }, 502);
      }
      const tokens = await tokenResponse.json();

      const userResponse = await safeGet(GOVBR_USERINFO_URL, {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
        timeoutMs: 10_000,
        tag: 'govbr',
      });

      if (!userResponse.ok) {
        return json(req, { success: false, error: 'Falha ao obter dados do Gov.br' }, 502);
      }
      const userInfo = await userResponse.json();

      // gov.br: o claim `sub` É o CPF do titular. Sem sub válido não há
      // identidade — recusa antes de tocar em qualquer conta.
      const govbrSub = typeof userInfo?.sub === 'string' ? userInfo.sub.trim() : '';
      const govbrCpf = cpfDoSub(govbrSub);
      if (!govbrSub || !govbrCpf) {
        return json(req, { success: false, error: 'Gov.br não retornou um CPF válido' }, 502);
      }
      const nivel = typeof userInfo.nivel === 'string' && userInfo.nivel ? userInfo.nivel : 'Bronze';

      await supabase.from('govbr_auth_state').delete().eq('id', authState.id);

      const lookups: GovbrLookups = {
        async profilesPorGovbrUid(sub) {
          const { data, error } = await supabase.from('profiles').select('user_id').eq('govbr_uid', sub).limit(5);
          if (error) throw error;
          return (data ?? []).map((r: { user_id: string }) => r.user_id);
        },
        async usuariosPorCpf(cpf, cpfHash) {
          const fmt = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
          const { data, error } = await supabase
            .from('colaboradores')
            .select('user_id')
            .not('user_id', 'is', null)
            .or(`cpf_hash.eq.${cpfHash},cpf.eq.${cpf},cpf.eq."${fmt}"`)
            .limit(5);
          if (error) throw error;
          return (data ?? []).map((r: { user_id: string | null }) => r.user_id ?? '');
        },
        async cpfHashesDoUsuario(uid) {
          const { data, error } = await supabase.from('colaboradores').select('cpf_hash').eq('user_id', uid).limit(5);
          if (error) throw error;
          return (data ?? []).map((r: { cpf_hash: string | null }) => r.cpf_hash ?? '');
        },
      };

      const govbrCampos = {
        govbr_uid: govbrSub,
        govbr_nivel_autenticacao: nivel,
        cpf_validado_govbr: true,
        gov_br_vinculado: true,
      };

      // Modo vinculação: usuário logado vinculando a conta gov.br ao perfil.
      if (userId) {
        const vinculo = await validarVinculo(userId, govbrSub, govbrCpf, lookups);
        // 200 + success:false: o toast do front só mostra a mensagem real em 2xx.
        if (!vinculo.ok) return json(req, { success: false, error: vinculo.erro, code: vinculo.status });
        const { error: upErr } = await supabase.from('profiles').update(govbrCampos).eq('user_id', userId);
        if (upErr) throw upErr;
        return json(req, { success: true, mode: 'link', nivel });
      }

      // Modo login: sem sessão — localizar a conta pelo gov.br (govbr_uid ou
      // CPF do colaborador) e emitir um token de verificação (magiclink) que
      // o front troca por uma sessão via supabase.auth.verifyOtp.
      const alvo = await resolverLogin(govbrSub, govbrCpf, lookups);
      if (!alvo.ok) {
        // 200 + success:false para o toast exibir a mensagem real (respostas
        // não-2xx chegam ao front como FunctionsHttpError genérico).
        return json(req, { success: false, error: alvo.erro, code: alvo.status });
      }
      const profile = { user_id: alvo.userId };

      const { data: targetUser, error: targetErr } = await supabase.auth.admin.getUserById(profile.user_id);
      if (targetErr || !targetUser?.user?.email) {
        return json(req, { success: false, error: 'Conta encontrada mas sem e-mail cadastrado' });
      }

      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: targetUser.user.email,
        options: { redirectTo: authState.redirect_uri },
      });
      if (linkErr || !linkData?.properties?.hashed_token) {
        return json(req, { success: false, error: 'Falha ao gerar verificação de login' }, 502);
      }

      const { error: upErr } = await supabase.from('profiles').update(govbrCampos).eq('user_id', profile.user_id);
      if (upErr) throw upErr;

      return json(req, {
        success: true,
        mode: 'login',
        nivel,
        token_hash: linkData.properties.hashed_token,
        email: targetUser.user.email,
      });
    }

    return json(req, { success: false, error: 'Ação inválida' }, 400);
  } catch (error: unknown) {
    try { captureException(error, { function: 'auth-gov-br' }); } catch { /* noop */ }
    return json(req, { success: false, error: 'Erro interno' }, 500);
  }
});
