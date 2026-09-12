/**
 * P3-058: Prometheus metrics endpoint
 * GET /functions/v1/metrics
 *
 * Formato: Prometheus text exposition (RFC 7233)
 * Integrado com healthcheck existente (P3-056).
 * Scrape: a cada 30s via Prometheus.
 *
 * Alertas:
 *   - bridge_query_latency_p95 > 5s por 5min
 *   - bridge_error_rate > 1% por 1min
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { captureException } from '../_shared/sentry.ts';
import { getCorsHeaders, handlePreflight } from '../_shared/contract.ts';
import {
  calculateErrorRate,
  calculateMetricsHttpStatus,
  calculateOverallHealthStatus,
} from './metricsMath.ts';

const METRICS_PREFIX = 'departamento_pessoal_';
const METRICS_VERSION = '1.0.0';

interface HealthMetrics {
  database_status: number;
  database_latency_ms: number;
  telemetry_status: number;
  bridge_status: number;
  total_latency_ms: number;
  overall_status: number;
}

function gauge(name: string, value: number, help: string, labels: Record<string, string> = {}): string {
  const labelStr = Object.keys(labels).length
    ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
    : '';
  return `# HELP ${name} ${help}\n# TYPE ${name} gauge\n${name}${labelStr} ${value}\n`;
}

function counter(name: string, value: number, help: string, labels: Record<string, string> = {}): string {
  const labelStr = Object.keys(labels).length
    ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
    : '';
  return `# HELP ${name} ${help}\n# TYPE ${name} counter\n${name}${labelStr} ${value}\n`;
}

async function collectMetrics(): Promise<HealthMetrics> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const t0 = Date.now();

  const [dbCheck, telemetryCheck, bridgeCheck] = await Promise.allSettled([
    supabase.from('colaboradores').select('id', { count: 'exact', head: true }),
    supabase.from('query_telemetry').select('id', { count: 'exact', head: true }),
    supabase.from('health_checks').select('id', { count: 'exact', head: true }).maybeSingle(),
  ]);

  const totalLatency = Date.now() - t0;

  const dbOk = dbCheck.status === 'fulfilled' && !dbCheck.value.error;
  const telOk = telemetryCheck.status === 'fulfilled' && !telemetryCheck.value.error;
  const brOk = bridgeCheck.status === 'fulfilled' && !bridgeCheck.value.error;

  const dbLatency = dbCheck.status === 'fulfilled'
    // aproximação: se houve paginação, o tempo total inclui 2+ round-trips
    ? ((dbCheck.value as { config?: { nextPageUrl?: string } }).config?.nextPageUrl ? 0 : totalLatency)
    : 0;

  return {
    database_status: dbOk ? 1 : 0,
    database_latency_ms: dbLatency,
    telemetry_status: telOk ? 1 : 0,
    bridge_status: brOk ? 1 : 0,
    total_latency_ms: totalLatency,
    overall_status: calculateOverallHealthStatus(dbOk, telOk, brOk),
  };
}

interface BridgeMetrics {
  error_count_1h: number;
  slow_query_count_1h: number;
  total_query_count_1h: number;
  avg_p95_ms: number;
  collection_status: number;
}

async function collectBridgeMetrics(): Promise<BridgeMetrics> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const since = new Date(Date.now() - 3600_000).toISOString();
    const [errorResult, slowResult, totalResult, mvResult] = await Promise.all([
      supabase
        .from('query_telemetry')
        .select('id', { count: 'exact', head: true })
        .in('severity', ['error', 'fatal'])
        .gte('created_at', since),
      supabase
        .from('query_telemetry')
        .select('id', { count: 'exact', head: true })
        .gt('duration_ms', 5000)
        .gte('created_at', since),
      supabase
        .from('query_telemetry')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
      supabase
        .from('mv_telemetry_dashboard')
        .select('p95_ms')
        .gte('hour', since)
        .limit(10),
    ]);

    for (const result of [errorResult, slowResult, totalResult, mvResult]) {
      if (result.error) throw result.error;
    }

    let avgP95 = 0;
    if (mvResult.data && mvResult.data.length > 0) {
      const p95s = mvResult.data.map((d: { p95_ms: number }) => d.p95_ms || 0).filter(Boolean);
      if (p95s.length > 0) avgP95 = Math.round(p95s.reduce((a: number, b: number) => a + b, 0) / p95s.length);
    }

    return {
      error_count_1h: errorResult.count ?? 0,
      slow_query_count_1h: slowResult.count ?? 0,
      total_query_count_1h: totalResult.count ?? 0,
      avg_p95_ms: avgP95,
      collection_status: 1,
    };
  } catch (error) {
    captureException(error, { function: 'metrics' });
    return {
      error_count_1h: 0,
      slow_query_count_1h: 0,
      total_query_count_1h: 0,
      avg_p95_ms: 0,
      collection_status: 0,
    };
  }
}

function buildMetricsPage(metrics: HealthMetrics, bridgeMetrics: Awaited<ReturnType<typeof collectBridgeMetrics>>): string {
  const now = new Date().toISOString();
  let output = `# Prometheus metrics — Departamento Pessoal v2\n# Generated: ${now}\n# Version: ${METRICS_VERSION}\n\n`;

  // Health status gauges
  output += gauge(
    `${METRICS_PREFIX}health_database`, metrics.database_status,
    'Database health: 1=ok, 0=error'
  );
  output += gauge(
    `${METRICS_PREFIX}health_telemetry`, metrics.telemetry_status,
    'Telemetry health: 1=ok, 0=error'
  );
  output += gauge(
    `${METRICS_PREFIX}health_bridge`, metrics.bridge_status,
    'Bridge health: 1=ok, 0=unavailable'
  );
  output += gauge(
    `${METRICS_PREFIX}health_overall`, metrics.overall_status,
    'Overall system health: 1=healthy, 0=degraded'
  );

  // Latency gauges
  output += gauge(
    `${METRICS_PREFIX}health_total_latency_ms`, metrics.total_latency_ms,
    'Total healthcheck latency in milliseconds'
  );
  output += gauge(
    `${METRICS_PREFIX}health_database_latency_ms`, metrics.database_latency_ms,
    'Database query latency in milliseconds'
  );

  // Bridge operational counters
  output += counter(
    `${METRICS_PREFIX}bridge_errors_total`, bridgeMetrics.error_count_1h,
    'Total bridge errors in the last hour'
  );
  output += counter(
    `${METRICS_PREFIX}bridge_slow_queries_total`, bridgeMetrics.slow_query_count_1h,
    'Total bridge slow queries (>5s) in the last hour'
  );
  output += counter(
    `${METRICS_PREFIX}bridge_queries_total`, bridgeMetrics.total_query_count_1h,
    'Total bridge queries in the last hour'
  );
  output += gauge(
    `${METRICS_PREFIX}bridge_p95_latency_ms`, bridgeMetrics.avg_p95_ms,
    'Average P95 bridge latency in milliseconds (last hour)'
  );

  output += gauge(
    `${METRICS_PREFIX}bridge_metrics_collection_status`, bridgeMetrics.collection_status,
    'Bridge telemetry collection: 1=complete, 0=failed'
  );

  const errorRate = calculateErrorRate(
    bridgeMetrics.error_count_1h,
    bridgeMetrics.total_query_count_1h,
  );
  output += gauge(
    `${METRICS_PREFIX}bridge_error_rate`, errorRate,
    'Fraction of bridge queries with error or fatal severity in the last hour'
  );

  return output;
}

serve(async (req: Request): Promise<Response> => {
  // E-077: CORS via allowlist compartilhada (sem wildcard fixo)
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: getCorsHeaders(req) });
  }

  try {
    const [health, bridge] = await Promise.all([
      collectMetrics(),
      collectBridgeMetrics(),
    ]);

    const body = buildMetricsPage(health, bridge);

    const status = calculateMetricsHttpStatus(
      health.overall_status,
      bridge.collection_status,
    );
    return new Response(body, {
      status,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-store',
        ...getCorsHeaders(req),
      },
    });
  } catch (error: unknown) {
    captureException(error, { function: 'metrics' });
    // Um scrape incompleto não pode parecer saudável para o monitoramento.
    return new Response(
      `# ERROR: failed to collect metrics\n${METRICS_PREFIX}health_overall 0\n`,
      {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
          'Cache-Control': 'no-store',
          ...getCorsHeaders(req),
        },
      }
    );
  }
});
