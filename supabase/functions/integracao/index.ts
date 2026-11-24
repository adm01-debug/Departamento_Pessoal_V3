import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

/**
 * Integrações externas — Edge Function endurecida.
 *
 * Simulação de cenários cobertos:
 *  1. Requisição sem JWT → 401.
 *  2. JWT válido mas user sem vínculo à empresa → 403.
 *  3. Payload sem `action` ou com `action` fora do whitelist → 400.
 *  4. Payload sem `empresaId` (uuid inválido) → 400.
 *  5. CSRF ausente/origem inválida em POST → 403.
 *  6. Erros internos → 500 + captureException + sem vazamento de stack.
 *  7. Ação `ping` funciona apenas para telemetria (não toca dados).
 *  8. Ação `sync` grava log de integração escopo tenant.
 */

const BodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('ping'),
    empresaId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('sync'),
    empresaId: z.string().uuid(),
    provider: z.enum(['bitrix24', 'esocial', 'resend', 'webhook_generic']),
    payload: z.record(z.unknown()).optional(),
  }),
  z.object({
    action: z.literal('status'),
    empresaId: z.string().uuid(),
    provider: z.enum(['bitrix24', 'esocial', 'resend', 'webhook_generic']).optional(),
  }),
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  try {
    // 1. CSRF fail-closed em state-changing
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    // 2. Auth JWT obrigatória
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ success: false, error: 'Autenticação obrigatória' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ success: false, error: 'Sessão inválida' }, 401);
    }
    const userId = userData.user.id;

    // 3. Zod validation
    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ success: false, error: 'Payload inválido', details: parsed.error.flatten() }, 400);
    }
    const body = parsed.data;

    // 4. Tenant scope — service key para RPCs de autorização
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: belongs } = await admin.rpc('user_belongs_to_empresa', {
      _user_id: userId,
      _empresa_id: body.empresaId,
    });
    if (!belongs) {
      const { data: isAdm } = await admin.rpc('is_admin', { _user_id: userId });
      if (!isAdm) {
        return json({ success: false, error: 'Sem acesso a esta empresa' }, 403);
      }
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `integracao:${userId}`, limit: 20, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // 5. Dispatch de ação
    if (body.action === 'ping') {
      return json({
        success: true,
        data: { pong: true, timestamp: new Date().toISOString(), empresaId: body.empresaId },
      });
    }

    if (body.action === 'status') {
      const query = admin
        .from('integracoes')
        .select('id, nome, tipo, ativo, ultima_sincronizacao')
        .eq('empresa_id', body.empresaId);
      if (body.provider) query.eq('tipo', body.provider);
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return json({ success: true, data });
    }

    // action === 'sync'
    const { error: logErr } = await admin.from('integracao_logs').insert({
      empresa_id: body.empresaId,
      tipo: body.provider,
      payload: body.payload ?? {},
      user_id: userId,
      status: 'received',
    });
    if (logErr) {
      // Fallback: não bloqueia a resposta se a tabela auxiliar estiver indisponível
      console.warn('[integracao] falha ao gravar log:', logErr.message);
    }

    await admin.from('audit_log').insert({
      tabela: 'integracoes',
      registro_id: body.empresaId,
      acao: 'SYNC_INTEGRATION',
      user_id: userId,
      dados_novos: { provider: body.provider, hasPayload: !!body.payload },
    });

    return json({
      success: true,
      data: { queued: true, provider: body.provider, timestamp: new Date().toISOString() },
    });
  } catch (error: unknown) {
    captureException(error, { fn: 'integracao' });
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return json({ success: false, error: message }, 500);
  }
});
