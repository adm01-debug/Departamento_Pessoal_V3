// pagar-desligamento — registra o pagamento da rescisão.
//
// A RPC public.pagar_desligamento tem efeito financeiro e, desde
// 20260722125517, só é executável por service_role ("deve passar por edge
// function com CSRF, rate limit e auditoria"). Esta é essa edge:
//   CSRF + Origin -> JWT (getUser) -> Zod strict -> desligamento da empresa
//   -> requireRh (RH/admin NA empresa) -> rate limit -> RPC com _actor_id.
// A RPC revalida o ator (pode_gerir_rh_para) e faz desligamento 'pago' +
// colaborador 'desligado' + audit_log numa única transação.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import {
  createErrorResponse,
  enforceOrigin,
  getCorsHeaders,
  handlePreflight,
  validateRequest,
} from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { requireRh } from '../_shared/authz.ts';
import { captureException } from '../_shared/sentry.ts';
import { erroDaRpc } from './rpcErrors.ts';

const BodySchema = z
  .object({
    empresaId: z.string().uuid(),
    desligamentoId: z.string().uuid(),
    comprovanteUrl: z.string().url().max(2048).nullish(),
  })
  .strict();

serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const forbiddenOrigin = enforceOrigin(req);
  if (forbiddenOrigin) return forbiddenOrigin;
  if (req.method !== 'POST') return createErrorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED', undefined, req);

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED', undefined, req);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED', undefined, req);

    const { data: body, errorResponse } = await validateRequest(req, BodySchema);
    if (errorResponse) return errorResponse;
    const { empresaId, desligamentoId, comprovanteUrl } = body!;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authz = await requireRh(admin, user.id, empresaId, req);
    if (authz.denied) return authz.denied;

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `pagar-desligamento:${user.id}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl, req);

    // O desligamento precisa ser da empresa informada (a autorização acima é
    // sobre empresaId; a RPC confere de novo pelo empresa_id da linha).
    const { data: deslig, error: dErr } = await admin
      .from('desligamentos')
      .select('id')
      .eq('id', desligamentoId)
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (dErr) return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR', undefined, req);
    if (!deslig) return createErrorResponse('Desligamento não encontrado', 404, 'NOT_FOUND', undefined, req);

    const { data, error } = await admin.rpc('pagar_desligamento', {
      _desligamento_id: desligamentoId,
      _comprovante_url: comprovanteUrl ?? null,
      _actor_id: user.id,
    });
    if (error) {
      const e = erroDaRpc(error as { code?: string; message?: string });
      if (e.status >= 500) captureException(error, { fn: 'pagar-desligamento' });
      return createErrorResponse(e.message, e.status, e.code, undefined, req);
    }

    return new Response(JSON.stringify({ ok: true, desligamento: Array.isArray(data) ? data[0] : data }), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    captureException(err, { fn: 'pagar-desligamento' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR', undefined, req);
  }
});
