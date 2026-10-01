import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { captureException } from '../_shared/sentry.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Rate limit distribuído (tabela rate_limits via RPC atômico) — compartilhado
  // entre instâncias de edge function; fallback em memória se o RPC falhar.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await checkRateLimit(supabase, { key: `healthcheck:${ip}`, limit: 10, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl, req);

  try {

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

    const services: Record<string, { status: string; latency_ms?: number; error?: string; note?: string }> = {
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
    await captureException(error, { fn: 'healthcheck' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
