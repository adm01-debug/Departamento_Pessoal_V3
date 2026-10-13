// Edge function: auth-login — server-side brute-force protection (H20).
//
// Centralises Supabase email/password login so that lockout checks are
// enforced before Supabase Auth is ever invoked — closing the bypass window
// that exists when the React UI calls signInWithPassword() directly.
//
// Flow:
//  1. IP-level rate limit (30 req / 5 min) via _shared/rateLimit — anonymous
//  2. Account lockout check (5 failures / 15 min) via SECURITY DEFINER RPC
//  3. Forward email+password to Supabase Auth REST API
//  4. Record attempt outcome in public.login_attempts
//  5. Return token on success / 429 or 401 on failure

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { createErrorResponse, getCorsHeaders, parseJsonBody } from '../_shared/contract.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { captureException } from '../_shared/sentry.ts';

const BodySchema = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
  password: z.string().min(1).max(128),
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// Projetos migrados para signing keys expõem SUPABASE_PUBLISHABLE_KEY;
// os antigos, SUPABASE_ANON_KEY. Aceitar ambos evita apikey vazia no /auth/v1.
const ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';

const IP_RATE_LIMIT = 30;       // requests per window
const IP_WINDOW_SEC = 5 * 60;   // 5 minutes

/** Extract the best-effort client IP from headers (Cloudflare, Netlify, AWS). */
function getClientIP(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return createErrorResponse('Método não permitido', 405, 'METHOD_NOT_ALLOWED', undefined, req);
  }

  const ip = getClientIP(req);

  // Guard de configuração: sem URL/chave de serviço, `createClient` lançaria
  // fora do try (500 opaco) ou o login seria reportado como "credenciais
  // inválidas". Falhar explicitamente como erro de CONFIGURAÇÃO, nunca como
  // senha errada.
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error(
      '[auth-login] configuração ausente: SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não definidos no projeto.',
    );
    return createErrorResponse(
      'Servidor de autenticação mal configurado',
      500,
      'AUTH_MISCONFIGURED',
      undefined,
      req,
    );
  }

  // Admin client (service-role) for lockout checks and attempt recording.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1. IP-level rate limit — anonymous, no auth required.
    const ipKey = `login:ip:${ip}`;
    const ipRL = await checkRateLimit(admin, { key: ipKey, limit: IP_RATE_LIMIT, windowSec: IP_WINDOW_SEC });
    if (!ipRL.allowed) return rateLimitResponse(ipRL);

    // 2. Parse and validate request body.
    const { body: pb, errorResponse } = await parseJsonBody(req);
    if (errorResponse) return errorResponse;
    const parsed = BodySchema.safeParse(pb ?? {});
    if (!parsed.success) {
      return createErrorResponse('Dados de login inválidos', 400, 'VALIDATION_ERROR', undefined, req);
    }
    const { email, password } = parsed.data;

    // 3. Per-email rate limit — more granular than IP (catches credential stuffing).
    const emailKey = `login:email:${email}`;
    const emailRL = await checkRateLimit(admin, { key: emailKey, limit: 10, windowSec: IP_WINDOW_SEC });
    if (!emailRL.allowed) return rateLimitResponse(emailRL);

    // 4. Account lockout check (5 failures in 15 min → lockout escalonado).
    // Observabilidade: um erro aqui degrada para fail-open (não travamos todos os
    // logins por indisponibilidade do DB), mas NUNCA em silêncio — foi exatamente
    // um erro mudo que manteve a proteção desligada sem ninguém perceber.
    const { data: lockout, error: lockoutErr } = await admin.rpc('check_account_lockout', { p_email: email });
    if (lockoutErr) {
      console.error('[auth-login] check_account_lockout indisponível — proteção de lockout DEGRADADA:', lockoutErr.message);
      await captureException(new Error(`check_account_lockout falhou: ${lockoutErr.message}`), { function: 'auth-login' });
    }
    if (!lockoutErr && lockout?.[0]?.is_locked) {

      const lockedUntil: string | null = lockout[0].locked_until ?? null;
      return new Response(
        JSON.stringify({
          success: false,
          error: lockedUntil
            ? `Conta bloqueada até ${new Date(lockedUntil).toLocaleTimeString('pt-BR')}.`
            : 'Conta temporariamente bloqueada por excesso de tentativas.',
          code: 'ACCOUNT_LOCKED',
          locked_until: lockedUntil,
        }),
        { status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    // 5. Forward to Supabase Auth REST API.
    // Usamos o cliente oficial em vez de fetch manual: ele resolve o endpoint
    // de auth corretamente dentro do runtime das edge functions (o fetch direto
    // para SUPABASE_URL/auth/v1 estava travando até o timeout, derrubando 100%
    // dos logins com 500 "Erro interno").
    // Sem chave anônima o signInWithPassword devolve "Invalid API key", que antes
    // era convertido em INVALID_CREDENTIALS. Isso é falha de CONFIGURAÇÃO.
    if (!ANON_KEY) {
      console.error('[auth-login] SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY ausente — login impossível.');
      await captureException(new Error('auth-login misconfigured: anon key ausente'), { function: 'auth-login' });
      return createErrorResponse(
        'Servidor de autenticação mal configurado',
        500,
        'AUTH_MISCONFIGURED',
        undefined,
        req,
      );
    }

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    const success = !authErr && !!authData?.session?.access_token;

    // Classificação da falha do Supabase Auth. Só "credenciais inválidas" é, de
    // fato, senha/e-mail errados — os demais casos (rate limit, e-mail não
    // confirmado, conta desativada, erro interno do Auth) NÃO devem ser
    // reportados como INVALID_CREDENTIALS nem incrementar o contador de lockout.
    let failureCode = 'INVALID_CREDENTIALS';
    let failureMessage = 'Credenciais inválidas';
    let failureStatus = 401;
    let contabilizaFalha = false;

    if (!success) {
      const authErrCode = (authErr as { code?: string } | null)?.code ?? '';
      const authErrStatus = (authErr as { status?: number } | null)?.status ?? 0;
      const authErrMessage = authErr?.message ?? '';

      if (
        authErrCode === 'invalid_credentials' ||
        /invalid login credentials/i.test(authErrMessage)
      ) {
        failureCode = 'INVALID_CREDENTIALS';
        failureMessage = 'Credenciais inválidas';
        failureStatus = 401;
        contabilizaFalha = true;
      } else if (authErrCode === 'email_not_confirmed' || /email not confirmed/i.test(authErrMessage)) {
        failureCode = 'EMAIL_NOT_CONFIRMED';
        failureMessage = 'É necessário confirmar o e-mail antes de entrar.';
        failureStatus = 403;
      } else if (authErrCode === 'user_banned' || /banned/i.test(authErrMessage)) {
        failureCode = 'USER_BANNED';
        failureMessage = 'Esta conta está desativada. Contate o administrador.';
        failureStatus = 403;
      } else if (
        authErrCode === 'over_request_rate_limit' ||
        authErrCode === 'over_email_send_rate_limit' ||
        authErrStatus === 429
      ) {
        failureCode = 'RATE_LIMIT_EXCEEDED';
        failureMessage = 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.';
        failureStatus = 429;
      } else {
        // Erro interno do Supabase Auth / configuração incorreta (ex.: "Invalid API key").
        // Não expõe detalhes internos e NÃO conta como tentativa de senha errada.
        console.error(
          '[auth-login] Supabase Auth falhou:',
          authErrCode || authErrStatus,
          authErrMessage,
        );
        await captureException(
          new Error(`signInWithPassword falhou: ${authErrMessage}`),
          { function: 'auth-login' },
        );
        failureCode = 'AUTH_UPSTREAM_ERROR';
        failureMessage = 'Servidor de autenticação indisponível. Tente novamente em instantes.';
        failureStatus = 502;
      }
    }

    // 6. Record attempt (fire-and-forget).
    // Só registra quando o resultado é significativo para o lockout: sucesso
    // (zera contadores) ou senha realmente errada. Falhas de infraestrutura/
    // configuração NÃO entram no contador — do contrário um erro do Auth
    // bloquearia contas legítimas.
    if (success || contabilizaFalha) {
      // PostgrestBuilder é "thenable" mas NÃO é Promise: não possui .catch().
      // O .catch() anterior lançava TypeError e derrubava todo login com 500.
      void admin
        .rpc('record_login_attempt', { p_email: email, p_success: success, p_ip: ip })
        .then(
          ({ error }) =>
            error && console.warn('[auth-login] record_login_attempt falhou:', error.message),
          (e: unknown) => console.warn('[auth-login] record_login_attempt falhou:', (e as Error)?.message),
        );
    }

    if (!success) {
      return new Response(
        JSON.stringify({ success: false, error: failureMessage, code: failureCode }),
        { status: failureStatus, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, session: authData.session }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    // Diagnóstico: sem esta linha o 500 era opaco e impossível de rastrear.
    console.error('[auth-login] falha inesperada:', (err as Error)?.name, (err as Error)?.message, (err as Error)?.stack);
    await captureException(err, { function: 'auth-login' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR', undefined, req);
  }
});
