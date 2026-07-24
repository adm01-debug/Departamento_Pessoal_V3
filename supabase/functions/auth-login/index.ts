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
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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

    // 4. Account lockout check (5 failures in 15 min → 30 min lockout).
    const { data: lockout, error: lockoutErr } = await admin.rpc('check_account_lockout', { p_email: email });
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
    const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ email, password }),
    });

    const authBody = await authRes.json();
    const success = authRes.ok && !!authBody.access_token;

    // 6. Record attempt (fire-and-forget).
    admin.rpc('record_login_attempt', { p_email: email, p_success: success, p_ip: ip })
      .catch((e: unknown) => console.warn('[auth-login] record_login_attempt falhou:', (e as Error)?.message));

    if (!success) {
      return new Response(
        JSON.stringify({ success: false, error: authBody.error_description ?? authBody.msg ?? 'Credenciais inválidas', code: 'INVALID_CREDENTIALS' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, session: authBody }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    await captureException(err, { function: 'auth-login' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
