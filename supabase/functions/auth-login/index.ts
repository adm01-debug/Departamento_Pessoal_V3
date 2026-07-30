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
import { corsHeaders, createErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { captureException } from '../_shared/sentry.ts';

const BodySchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
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
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return createErrorResponse('Método não permitido', 405, 'METHOD_NOT_ALLOWED');
  }

  const ip = getClientIP(req);

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
      return createErrorResponse('Dados de login inválidos', 400, 'VALIDATION_ERROR');
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
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 5. Forward to Supabase Auth REST API.
    // Usamos o cliente oficial em vez de fetch manual: ele resolve o endpoint
    // de auth corretamente dentro do runtime das edge functions (o fetch direto
    // para SUPABASE_URL/auth/v1 estava travando até o timeout, derrubando 100%
    // dos logins com 500 "Erro interno").
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    const success = !authErr && !!authData?.session?.access_token;
    const errorMessage = authErr?.message ?? 'Credenciais inválidas';


    // 6. Record attempt (fire-and-forget).
    admin.rpc('record_login_attempt', { p_email: email, p_success: success, p_ip: ip })
      .catch((e: unknown) => console.warn('[auth-login] record_login_attempt falhou:', (e as Error)?.message));

    if (!success) {
      return new Response(
        JSON.stringify({ success: false, error: errorMessage, code: 'INVALID_CREDENTIALS' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, session: authData.session }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    await captureException(err, { function: 'auth-login' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
