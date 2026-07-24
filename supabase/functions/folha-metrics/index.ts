// folha-metrics — Fase 6
// Retorna métricas agregadas de compliance da folha (últimas 24h).
// Consumido por dashboards internos / alertas.
//
// Segurança: JWT obrigatório, role admin/rh, CSRF fail-closed, no-store.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const NO_STORE = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const jsonOk = (b: Record<string, unknown>) => new Response(JSON.stringify(b), { status: 200, headers: NO_STORE });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return createErrorResponse('Não autenticado', 401, 'UNAUTHORIZED');

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claims?.user?.id) return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');

    const userId = claims.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Restringe a admin/rh
    const { data: roles } = await admin.rpc('get_user_roles', { _user_id: userId });
    const allowed = Array.isArray(roles) && roles.some((r: string) => r === 'admin' || r === 'rh');
    if (!allowed) return createErrorResponse('Sem permissão', 403, 'FORBIDDEN');

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `folha-metrics:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Métricas de idempotência (últimas 24h)
    const { data: idemp, error: idempErr } = await admin
      .from('idempotency_keys')
      .select('status, endpoint')
      .gte('created_at', since);
    if (idempErr) return createErrorResponse('Falha ao ler idempotency', 500, 'IDEMP_ERROR');

    const idempByStatus: Record<string, number> = {};
    const idempByEndpoint: Record<string, number> = {};
    for (const r of idemp ?? []) {
      idempByStatus[r.status ?? 'unknown'] = (idempByStatus[r.status ?? 'unknown'] ?? 0) + 1;
      idempByEndpoint[r.endpoint ?? 'unknown'] = (idempByEndpoint[r.endpoint ?? 'unknown'] ?? 0) + 1;
    }

    // Métricas de compliance da folha (últimas 24h)
    const { data: audit, error: auditErr } = await admin
      .from('audit_log')
      .select('acao')
      .eq('tabela', 'folhas_pagamento')
      .in('acao', ['PAYROLL_CALC', 'CLOSE', 'REOPEN'])
      .gte('created_at', since);
    if (auditErr) return createErrorResponse('Falha ao ler audit', 500, 'AUDIT_ERROR');

    const auditByAcao: Record<string, number> = {};
    for (const r of audit ?? []) {
      auditByAcao[r.acao ?? 'unknown'] = (auditByAcao[r.acao ?? 'unknown'] ?? 0) + 1;
    }

    // Alertas Slack (opt-in via SLACK_WEBHOOK_URL). No-op se não configurado.
    // Thresholds conservadores; ajustar via env se necessário.
    const conflictCount = idempByStatus['conflict'] ?? 0;
    const failedCount = idempByStatus['failed'] ?? 0;
    const conflictThreshold = Number(Deno.env.get('FOLHA_ALERT_CONFLICT_THRESHOLD') ?? '20');
    const failedThreshold = Number(Deno.env.get('FOLHA_ALERT_FAILED_THRESHOLD') ?? '5');
    const slackUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    let alerted = false;
    if (slackUrl && (conflictCount >= conflictThreshold || failedCount >= failedThreshold)) {
      try {
        await fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text:
              `:warning: *Folha — anomalia nas últimas 24h*\n` +
              `• conflitos idempotência: *${conflictCount}* (limite ${conflictThreshold})\n` +
              `• falhas: *${failedCount}* (limite ${failedThreshold})\n` +
              `• eventos folha: ${JSON.stringify(auditByAcao)}`,
          }),
        });
        alerted = true;
      } catch (e) {
        console.error('[folha-metrics] slack falhou:', (e as Error)?.message);
      }
    }

    return jsonOk({
      window_hours: 24,
      generated_at: new Date().toISOString(),
      idempotency: {
        total: (idemp ?? []).length,
        by_status: idempByStatus,
        by_endpoint: idempByEndpoint,
      },
      folha_audit: {
        total: (audit ?? []).length,
        by_acao: auditByAcao,
      },
      alerts: {
        slack_configured: Boolean(slackUrl),
        triggered: alerted,
        thresholds: { conflict: conflictThreshold, failed: failedThreshold },
      },
    });
  } catch (e) {
    console.error('[folha-metrics] erro:', (e as Error)?.message);
    return createErrorResponse('Erro interno', 500, 'INTERNAL_ERROR');
  }
});
