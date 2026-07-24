import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { getCorsHeaders, parseJsonBody } from '../_shared/contract.ts';
import { captureException } from '../_shared/sentry.ts';

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('verificar'), tokenId: z.string().uuid() }),
  z.object({
    action: z.literal('assinar'),
    tokenId: z.string().uuid(),
    assinaturaBase64: z.string().min(50).max(5_000_000),
    ipAddress: z.string().max(64).optional(),
  }),
  z.object({ action: z.literal('listar') }),
]);

let _corsHeaders: Record<string, string> = {};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ..._corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

serve(async (req: Request): Promise<Response> => {
  _corsHeaders = { ...getCorsHeaders(req), 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: _corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ success: false, error: 'Payload inválido', details: parsed.error.flatten() }, 400);
    }
    const body = parsed.data;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit por IP — endpoints públicos (assinar/verificar) precisam de proteção
    // contra brute force de tokens: 20 req / min / IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'anon';
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `assinatura:${body.action}:${ip}`, limit: 20, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);


    // 'assinar' é público — protegido pelo token de admissão (UUID + expiração + one-shot).
    // 'verificar' também é público (o candidato precisa checar o estado antes de assinar).
    // 'listar' é operação administrativa: exige auth + admin.
    if (body.action === 'verificar') {
      const { data: token, error } = await supabase
        .from('admissao_tokens')
        .select('id, contrato_assinado, data_expiracao, admissoes(nome, cargo, departamento)')
        .eq('id', body.tokenId)
        .single();
      if (error || !token) return json({ success: false, error: 'Token não encontrado' }, 404);

      const expirado = new Date(token.data_expiracao) < new Date();
      return json({
        success: true,
        data: {
          valido: !expirado && !token.contrato_assinado,
          expirado,
          assinado: token.contrato_assinado,
          admissao: token.admissoes,
        },
      });
    }

    if (body.action === 'assinar') {
      // CSRF fail-closed em state-changing público
      const csrf = await verifyCsrf(req.clone());
      if (!csrf.ok) return csrf.response!;

      const { data: token, error: fetchErr } = await supabase
        .from('admissao_tokens')
        .select('id, token, contrato_assinado, data_expiracao')
        .eq('id', body.tokenId)
        .single();
      if (fetchErr || !token) return json({ success: false, error: 'Token não encontrado' }, 404);

      if (token.contrato_assinado) return json({ success: false, error: 'Contrato já assinado' }, 409);
      if (new Date(token.data_expiracao) < new Date()) return json({ success: false, error: 'Token expirado' }, 410);

      // Hash SHA-256 para prova de integridade
      const nowIso = new Date().toISOString();
      const encoder = new TextEncoder();
      const data = encoder.encode(body.assinaturaBase64 + token.token + nowIso);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0')).join('');

      // IP real do cliente (não confiar em body.ipAddress puro — usar como fallback)
      const clientIp =
        req.headers.get('cf-connecting-ip') ??
        req.headers.get('x-real-ip') ??
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        body.ipAddress ??
        'unknown';

      const { data: updated, error: updateErr } = await supabase
        .from('admissao_tokens')
        .update({
          contrato_assinado: true,
          assinado_em: nowIso,
          assinatura_base64: body.assinaturaBase64,
          ip_assinatura: clientIp,
          hash_assinatura: hashHex,
        })
        .eq('id', body.tokenId)
        .eq('contrato_assinado', false) // proteção contra race condition (double-sign)
        .select('id')
        .maybeSingle();
      if (updateErr) throw updateErr;
      if (!updated) return json({ success: false, error: 'Contrato já assinado' }, 409);

      const { error: auditErr } = await supabase.from('audit_log').insert({
        tabela: 'admissao_tokens',
        registro_id: body.tokenId,
        acao: 'ASSINATURA_DIGITAL',
        dados_novos: { hash: hashHex, ip: clientIp, timestamp: nowIso },
      });
      if (auditErr) throw auditErr;

      return json({ success: true, data: { hash: hashHex, assinado_em: nowIso } });
    }

    // action === 'listar' — requer autenticação + admin
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ success: false, error: 'Autenticação obrigatória' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claimsData?.user?.id) return json({ success: false, error: 'Sessão inválida' }, 401);

    const { data: isAdm } = await supabase.rpc('is_admin', { _user_id: claimsData.user.id });
    if (!isAdm) return json({ success: false, error: 'Requer perfil administrador' }, 403);

    const { data: tokens, error } = await supabase
      .from('admissao_tokens')
      .select('id, token, contrato_assinado, assinado_em, data_expiracao, admissoes(nome, cargo)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    return json({ success: true, data: tokens });
  } catch (error: unknown) {
    try { captureException(error, { fn: 'assinaturaDigital' }); } catch { /* noop */ }
    // Erro genérico — assinatura envolve dados sensíveis, nunca vazar detalhes
    return json({ success: false, error: 'Erro interno na assinatura digital', code: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
