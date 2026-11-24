import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { captureException } from '../_shared/sentry.ts';

const ipBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;

function checkInMemoryRate(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  bucket.count++;
  return bucket.count <= RATE_LIMIT;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkInMemoryRate(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // P3-056: checks internos paralelos. Latência reportada por check.
    const t0 = Date.now();

    const [dbCheck, telemetryCheck, bridgeCheck] = await Promise.allSettled([
      // 1) DB write/read (conta colaboradores — testa RLS + index scan)
      supabase.from('colaboradores').select('id', { count: 'exact', head: true }),
      // 2) Telemetria: verifica se tabela query_telemetry é acessível
      supabase.from('query_telemetry').select('id', { count: 'exact', head: true }),
      // 3) Bridge health: tabela de controle (se existir) — verifica cache de telemetria
      supabase.from('health_checks').select('id', { count: 'exact', head: true }).maybeSingle(),
    ]);

    const totalLatency = Date.now() - t0;
    const dbOk = dbCheck.status === 'fulfilled' && !dbCheck.value.error;
    const telOk = telemetryCheck.status === 'fulfilled' && !telemetryCheck.value.error;
    const brOk = bridgeCheck.status === 'fulfilled'; // tabela pode não existir
    const allOk = dbOk && telOk;

    const services: Record<string, { status: string; latency_ms?: number; error?: string }> = {
      database: {
        status: dbOk ? 'ok' : 'error',
        latency_ms: dbCheck.status === 'fulfilled' ? Date.now() - t0 : undefined,
        error: dbCheck.status === 'rejected' ? String(dbCheck.reason) : (dbCheck.value.error?.message),
      },
      telemetry: {
        status: telOk ? 'ok' : 'error',
        error: telemetryCheck.status === 'rejected' ? String(telemetryCheck.reason) : (telemetryCheck.value.error?.message),
      },
      bridge: {
        status: brOk ? 'ok' : 'unavailable',
        note: 'Tabela health_checks é opcional',
      },
    };

    return new Response(JSON.stringify({
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
      total_latency_ms: totalLatency,
    }), {
      status: allOk ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    captureException(error, { fn: 'healthcheck' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
