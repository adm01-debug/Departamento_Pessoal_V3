/**
 * P3-055 + P4-072: Endpoint /functions/v1/metricas
 * KPIs em tempo real para o dashboard DP v2.
 *
 * Autenticação: JWT Bearer (obrigatório — IDOR protected).
 * Tenant scope: empresa_id validado via user_belongs_to_empresa RPC.
 * Rate limit: 60 req/min por usuário.
 * Cache: 60s (Cache-Control) — dashboard polling-friendly.
 *
 * Dados de来源:
 *   - Tabelas raw: colaboradores, esocial_eventos, metricas_processamento (delta)
 *   - MVs: mv_folha_summary (P4-072), mv_telemetry_dashboard (P3-054)
 *
 * Nota: métricas de bridge (p95, error rate) exigem table access;
 *       se mv_telemetry_dashboard não existir, fallback para query direta.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { metricasSchema } from '../_shared/schemas/common.ts';
import { corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { getOrCreateTraceId } from '../_shared/trace.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// ── Helpers ──────────────────────────────────────────────────

async function safeQuery<T>(
  supabase: ReturnType<typeof createClient>,
  query: () => Promise<{ data: T; error: unknown }>
): Promise<T | null> {
  try {
    const { data, error } = await query();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

// ── KPIs de Bridge via MV (P3-054) ──────────────────────────

async function getBridgeKpis(
  supabase: ReturnType<typeof createClient>,
  empresaId: string
) {
  // Tenta MV primeiro (refresh noturno — rápido)
  const mv = await safeQuery<{ p95_ms: number; avg_ms: number; errors_1h: number; slow_1h: number }[]>(
    supabase,
    () => supabase
      .from('mv_telemetry_dashboard')
      .select('p95_ms, avg_ms')
      .gte('hour', new Date(Date.now() - 3600_000).toISOString())
      .limit(1)
  );

  // Fallback: query direta em query_telemetry
  if (!mv || mv.length === 0) {
    const [errResult, slowResult] = await Promise.all([
      safeQuery(supabase, () =>
        supabase.from('query_telemetry')
          .select('id', { count: 'exact', head: true })
          .eq('severity', 'error')
          .gte('created_at', new Date(Date.now() - 3600_000).toISOString())
      ),
      safeQuery(supabase, () =>
        supabase.from('query_telemetry')
          .select('id', { count: 'exact', head: true })
          .gt('duration_ms', 5000)
          .gte('created_at', new Date(Date.now() - 3600_000).toISOString())
      ),
    ]);
    return {
      p95_latency_ms: null,
      error_count_1h: errResult?.count ?? 0,
      slow_query_count_1h: slowResult?.count ?? 0,
      source: 'telemetry_direct' as const,
    };
  }

  const p95s = mv.map((r) => r.p95_ms).filter(Boolean);
  const avgs = mv.map((r) => r.avg_ms).filter(Boolean);
  const p95 = p95s.length ? Math.max(...p95s) : null;

  return {
    p95_latency_ms: p95,
    error_count_1h: mv[0]?.errors_1h ?? 0,
    slow_query_count_1h: mv[0]?.slow_1h ?? 0,
    source: 'mv_telemetry_dashboard' as const,
  };
}

// ── KPIs de folha via MV (P4-072) ───────────────────────────

async function getFolhaKpis(
  supabase: ReturnType<typeof createClient>,
  empresaId: string
) {
  const mv = await safeQuery<{
    competencia_month: string;
    total_bruto: number;
    total_liquido: number;
    total_descontos: number;
    headcount_folha: number;
    total_fgts: number;
    total_inss: number;
  }[]>(
    supabase,
    () => supabase
      .from('mv_folha_summary')
      .select('competencia_month, total_bruto, total_liquido, total_descontos, headcount_folha, total_fgts, total_inss')
      .eq('empresa_id', empresaId)
      .order('competencia_month', { ascending: false })
      .limit(2)
  );

  if (!mv || mv.length === 0) return null;

  const current = mv[0];
  const prev = mv[1];

  return {
    competencia: current.competencia_month,
    total_bruto: current.total_bruto ?? 0,
    total_liquido: current.total_liquido ?? 0,
    total_descontos: current.total_descontos ?? 0,
    headcount_folha: current.headcount_folha ?? 0,
    total_fgts: current.total_fgts ?? 0,
    total_inss: current.total_inss ?? 0,
    variacao_bruto_pct: prev && prev.total_bruto > 0
      ? Number((((current.total_bruto ?? 0) - prev.total_bruto) / prev.total_bruto * 100).toFixed(2))
      : null,
    source: 'mv_folha_summary' as const,
  };
}

// ── Main handler ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const traceId = getOrCreateTraceId(req, null);

  try {
    // CSRF
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceKey) {
      return createErrorResponse('Configuração incompleta', 500, 'INTERNAL_ERROR');
    }

    // User
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    }
    const userId = userData.user.id;

    // Parse body
    let empresaId: string | undefined;
    try {
      const body = await req.clone().json();
      if (!empresaId && body?.empresaId) empresaId = body.empresaId;
    } catch { /* ignore */ }

    if (!empresaId) return createErrorResponse('empresaId é obrigatório', 422, 'VALIDATION_ERROR');

    // Validate with Zod
    const parsed = metricasSchema.safeParse({ empresaId });
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0]?.message ?? 'Invalid', 422, 'VALIDATION_ERROR');
    }

    // Tenant + admin check
    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: belongs }, { data: isAdm }] = await Promise.all([
      admin.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresaId }),
      admin.rpc('is_admin', { _user_id: userId }),
    ]);
    if (!belongs && !isAdm) return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');

    // Rate limit
    const rl = await checkRateLimit(admin, { key: `metricas:${userId}`, limit: 60, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const userClient2 = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── Queries paralelas ──────────────────────────────────────
    const [
      colabsResult,
      esocialResult,
      processingResult,
      bridgeKpis,
      folhaKpis,
    ] = await Promise.allSettled([
      // Colaboradores: status breakdown
      userClient2
        .from('colaboradores')
        .select('status, departamento', { count: 'exact' })
        .eq('empresa_id', empresaId),
      // eSocial: status breakdown
      userClient2
        .from('esocial_eventos')
        .select('status', { count: 'exact' })
        .eq('empresa_id', empresaId),
      // Processing: recent errors
      userClient2
        .from('metricas_processamento')
        .select('status, tempo_execucao_ms', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .gte('timestamp', new Date(Date.now() - 3600_000).toISOString())
        .limit(200),
      // Bridge KPIs (P3-054)
      getBridgeKpis(userClient2, empresaId),
      // Folha KPIs via MV (P4-072)
      getFolhaKpis(userClient2, empresaId),
    ]);

    // ── Processamento dos resultados ───────────────────────────
    const colabs = colabsResult.status === 'fulfilled' ? colabsResult.value.data ?? [] : [];
    const colabsCount = colabsResult.status === 'fulfilled' ? (colabsResult.value.count ?? 0) : 0;
    const esocial = esocialResult.status === 'fulfilled' ? esocialResult.value.data ?? [] : [];
    const processing = processingResult.status === 'fulfilled' ? processingResult.value.data ?? [] : [];

    const ativos = colabs.filter((c: any) => c.status === 'ativo').length;
    const deptos = [...new Set(colabs.map((c: any) => c.departamento).filter(Boolean))];
    const esocialEnviados = esocial.filter((e: any) => e.status === 'enviado').length;
    const esocialPendente = esocial.filter((e: any) => e.status === 'pendente').length;
    const esocialErros = esocial.filter((e: any) => e.status === 'erro').length;
    const processingTotal = processing.length;
    const processingOk = processing.filter((p: any) => p.status === 'success').length;
    const processingErros = processing.filter((p: any) => p.status !== 'success').length;
    const processingLatency = processingTotal > 0
      ? Math.round(processing.reduce((a: number, p: any) => a + (p.tempo_execucao_ms ?? 0), 0) / processingTotal)
      : null;

    const response = {
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      empresa_id: empresaId,
      colaboradores: {
        total: colabsCount,
        ativos,
        em_ferias: colabs.filter((c: any) => c.status === 'ferias').length,
        afastados: colabs.filter((c: any) => c.status === 'afastado').length,
        desligados: colabs.filter((c: any) => c.status === 'desligado').length,
        departamentos: deptos.length,
      },
      folha: folhaKpis ?? { source: 'table_fallback', competencia: null },
      esocial: {
        enviados: esocialEnviados,
        pendentes: esocialPendente,
        erros: esocialErros,
      },
      bridge: bridgeKpis,
      monitoring: {
        success_rate_pct: processingTotal > 0
          ? Number(((processingOk / processingTotal) * 100).toFixed(2))
          : null,
        recent_failures: processingErros,
        avg_latency_ms: processingLatency,
        period_1h: true,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        // Cache 60s: polling-friendly sem sobrecarregar DB
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
        'X-Trace-Id': traceId,
      },
    });

  } catch (error: unknown) {
    captureException(error, { fn: 'metricas', trace_id: traceId });
    return createErrorResponse('Erro interno ao obter métricas', 500, 'INTERNAL_SERVER_ERROR');
  }
});
