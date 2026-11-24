import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';
import { validateRequest, corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { webhookSchema } from '../_shared/schemas/common.ts';
import { withMonitoring } from '../_shared/monitor.ts';

async function verifySignature(payload: string, signature: string | null, secret: string | undefined): Promise<boolean> {
  if (!signature || !secret) return false;
  
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const sigHex = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(payload)
    );
  } catch (e) {
    console.error('Erro na verificação de assinatura:', e);
    return false;
  }
}

// Onda 29/35: hardening — payload cap, replay TTL via timestamp obrigatório em prod, redação.
const MAX_PAYLOAD_BYTES = 1_048_576; // 1 MiB
const REPLAY_TTL_SECONDS = 300; // 5 min

const ipBuckets = new Map<string, { count: number; resetAt: number }>();
const IP_RATE_LIMIT = 60;
const IP_RATE_WINDOW = 60_000;

function checkIpRate(ip: string): boolean {
  const now = Date.now();
  const b = ipBuckets.get(ip);
  if (!b || b.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + IP_RATE_WINDOW });
    return true;
  }
  b.count++;
  return b.count <= IP_RATE_LIMIT;
}
const REQUIRE_TIMESTAMP = (Deno.env.get('WEBHOOK_REQUIRE_TIMESTAMP') ?? 'true').toLowerCase() === 'true';
const SENSITIVE_HEADERS = new Set([
  'authorization', 'cookie', 'set-cookie', 'x-api-key', 'apikey',
  'x-hub-signature-256', 'x-hub-signature', 'x-webhook-signature',
]);

function redactHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of headers.entries()) {
    out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return out;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return withMonitoring(req, 'webhook', async (supabase) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkIpRate(ip)) {
      return createErrorResponse('Too many requests', 429, 'RATE_LIMITED');
    }

    const secret = Deno.env.get('WEBHOOK_SECRET');
    const signature = req.headers.get('x-hub-signature-256');
    const timestampHeader = req.headers.get('x-webhook-timestamp');
    const payloadText = await req.clone().text();

    // Payload cap — evita DoS por corpo gigante
    if (payloadText.length > MAX_PAYLOAD_BYTES) {
      return createErrorResponse('Payload muito grande', 413, 'PAYLOAD_TOO_LARGE');
    }

    // Fail-closed: sem secret configurado, recusa TODAS as requisições (503).
    if (!secret) {
      console.error('WEBHOOK_SECRET não configurado — recusando webhook (fail-closed)');
      return createErrorResponse(
        'Webhook não configurado no servidor',
        503,
        'WEBHOOK_NOT_CONFIGURED'
      );
    }

    // Replay TTL: timestamp obrigatório por default (fail-closed contra replay).
    if (!timestampHeader) {
      if (REQUIRE_TIMESTAMP) {
        return createErrorResponse('Timestamp obrigatório (x-webhook-timestamp)', 401, 'TIMESTAMP_REQUIRED');
      }
    } else {
      const ts = Number(timestampHeader);
      if (!Number.isFinite(ts)) {
        return createErrorResponse('Timestamp inválido', 401, 'INVALID_TIMESTAMP');
      }
      const skewSec = Math.abs(Date.now() / 1000 - ts);
      if (skewSec > REPLAY_TTL_SECONDS) {
        return createErrorResponse('Timestamp fora da janela', 401, 'TIMESTAMP_EXPIRED');
      }
    }

    // Assinatura ausente ou inválida => 401. (crypto.subtle.verify é timing-safe.)
    // Se timestamp presente, assina "<timestamp>.<body>" para bloquear replay com novo ts.
    const signedPayload = timestampHeader ? `${timestampHeader}.${payloadText}` : payloadText;
    if (!(await verifySignature(signedPayload, signature, secret))) {
      return createErrorResponse('Assinatura inválida', 401, 'INVALID_SIGNATURE');
    }


    const { data, errorResponse } = await validateRequest(req, webhookSchema);
    if (errorResponse) return errorResponse;

    const webhookData = data!;

    // Idempotência: se event_id já foi processado, retornamos 200 com replay=true
    // sem re-executar side-effects (garante at-least-once → exactly-once semântica).
    const { data: existing } = await supabase
      .from('webhook_logs')
      .select('id, status')
      .eq('event_id', webhookData.event_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, replay: true, event_id: webhookData.event_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, status: 200 }
      );
    }

    // Auditoria do recebimento (event_id UNIQUE serve como lock lógico contra corridas)
    // Auditoria do recebimento (event_id UNIQUE serve como lock lógico contra corridas).
    // Redigimos headers sensíveis para evitar vazar tokens em logs/DB.
    const { error: insertErr } = await supabase.from('webhook_logs').insert({
      event_id: webhookData.event_id,
      evento: webhookData.event,
      payload: webhookData,
      headers: redactHeaders(req.headers),
      status: 'received',
      version: webhookData.version,
      tentativa: 1,
    });



    // Se corrida entre 2 workers → conflito de UNIQUE → tratamos como replay
    if (insertErr && (insertErr.code === '23505' || /duplicate|unique/i.test(insertErr.message))) {
      return new Response(
        JSON.stringify({ success: true, replay: true, event_id: webhookData.event_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, status: 200 }
      );
    }
    if (insertErr) {
      console.error('Erro ao registrar webhook_log:', insertErr);
      return createErrorResponse('Erro ao registrar webhook', 500, 'LOG_ERROR');
    }

    // Lógica de versionamento
    let result;
    try {
      if (webhookData.version === 'v2') {
        result = await processWebhookV2(webhookData, supabase);
      } else {
        result = await processWebhookV1(webhookData, supabase);
      }
      await supabase.from('webhook_logs').update({ status: 'processed' }).eq('event_id', webhookData.event_id);
    } catch (procErr) {
      await supabase.from('webhook_logs').update({
        status: 'failed',
        erro: (procErr as Error).message
      }).eq('event_id', webhookData.event_id);
      throw procErr;
    }

    return new Response(
      JSON.stringify({ success: true, data: result, version: webhookData.version, event_id: webhookData.event_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  });
});



async function processWebhookV1(body: any, supabase: any) {
  console.log('Processando Webhook V1:', body.event);
  return { status: 'processed_v1', event: body.event };
}

async function processWebhookV2(body: any, supabase: any) {
  console.log('Processando Webhook V2:', body.event);
  // V2 pode ter campos extras ou lógica diferente
  return { status: 'processed_v2', event: body.event, metadata: { processed_at: new Date().toISOString() } };
}
