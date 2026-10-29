import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { safeFetch, safePost } from './safe-fetch.ts';
import { resendDeliveryId } from './resendDelivery.ts';

// Entrega outbound real — e-mail via Resend e WhatsApp via Evolution API.
// Cada helper devolve o desfecho verdadeiro: 'ok' só com recibo/confirmação
// do provedor; a persistência de status (enviado/falhou/cancelled) fica a
// cargo do caller — nunca marcar 'enviado' sem ter enviado.

/** DDI 55 implícito para números BR sem código de país (10-11 dígitos). */
export function normalizarTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, '');
  return digits.length <= 11 ? `55${digits}` : digits;
}

// Erros de fetch carregam a URL configurada (que pode conter credenciais em
// query params) — nunca persistimos/retornamos URLs em mensagens de erro.
export function sanitizarErro(msg: string, maxLen = 300): string {
  return msg.replace(/https?:\/\/\S+/g, '[url]').slice(0, maxLen);
}

export interface ResendResult {
  ok: boolean;
  /** false quando RESEND_API_KEY não existe — distinto de falha de envio. */
  configured: boolean;
  providerMessageId: string | null;
  error: string | null;
}

export async function sendEmailResend(opts: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  /** Chave de idempotência repassada à API Resend (dedup de retries). */
  idempotencyKey?: string;
}): Promise<ResendResult> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return { ok: false, configured: false, providerMessageId: null, error: 'resend_api_key_ausente' };
  }
  try {
    const res = await safeFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
        ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: opts.from ?? 'Sistema DP <onboarding@resend.dev>',
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        ...(opts.html ? { html: opts.html } : {}),
        ...(opts.text ? { text: opts.text } : {}),
      }),
      timeoutMs: 8_000,
      tag: 'webhook',
    });
    const receipt = await res.json().catch(() => null);
    const providerMessageId = res.ok ? resendDeliveryId(receipt) : null;
    if (providerMessageId) {
      return { ok: true, configured: true, providerMessageId, error: null };
    }
    return {
      ok: false,
      configured: true,
      providerMessageId: null,
      error: `Resend respondeu ${res.status} sem recibo de aceite`,
    };
  } catch (e) {
    return {
      ok: false,
      configured: true,
      providerMessageId: null,
      error: e instanceof Error ? sanitizarErro(e.message) : 'Falha de rede ao chamar Resend',
    };
  }
}

export interface EvolutionResult {
  /** false quando a empresa não tem whatsapp_config — distinto de falha de envio. */
  configured: boolean;
  status: 'sent' | 'failed';
  mensagemIdExterno: string | null;
  errorMessage: string | null;
}

export async function sendWhatsappEvolution(
  admin: SupabaseClient,
  opts: { empresaId: string; telefone: string; mensagem: string },
): Promise<EvolutionResult> {
  const { data: config, error: cfgErr } = await admin
    .from('whatsapp_config')
    .select('instancia_url, api_key, instancia_nome')
    .eq('empresa_id', opts.empresaId)
    .maybeSingle();
  if (cfgErr) throw cfgErr;

  if (!config?.instancia_url || !config.api_key || !config.instancia_nome) {
    return {
      configured: false,
      status: 'failed',
      mensagemIdExterno: null,
      errorMessage: 'WhatsApp não configurado para a empresa (instância Evolution API ausente)',
    };
  }

  const url = `${config.instancia_url.replace(/\/+$/, '')}/message/sendText/${encodeURIComponent(config.instancia_nome)}`;
  try {
    const res = await safePost(
      url,
      { number: normalizarTelefone(opts.telefone), text: opts.mensagem },
      { tag: 'whatsapp', headers: { apikey: config.api_key } },
    );
    if (res.ok) {
      const raw = await res.text().catch(() => '');
      let payload: { key?: { id?: string } } | null = null;
      try {
        payload = raw ? (JSON.parse(raw) as { key?: { id?: string } }) : null;
      } catch { /* resposta não-JSON com status 2xx — tratada como falha abaixo */ }
      if (payload?.key?.id) {
        return { configured: true, status: 'sent', mensagemIdExterno: payload.key.id, errorMessage: null };
      }
      // HTTP 2xx sem o envelope de sucesso documentado ({key:{id}}) — a
      // instância rejeitou ou respondeu algo inesperado; não é 'sent'.
      return {
        configured: true,
        status: 'failed',
        mensagemIdExterno: null,
        errorMessage: `Evolution API respondeu ${res.status} sem confirmação de envio${raw ? `: ${sanitizarErro(raw, 200)}` : ''}`,
      };
    }
    const detail = await res.text().catch(() => '');
    return {
      configured: true,
      status: 'failed',
      mensagemIdExterno: null,
      errorMessage: `Evolution API respondeu ${res.status}${detail ? `: ${sanitizarErro(detail, 200)}` : ''}`,
    };
  } catch (e) {
    return {
      configured: true,
      status: 'failed',
      mensagemIdExterno: null,
      errorMessage: e instanceof Error ? sanitizarErro(e.message) : 'Falha de rede ao chamar Evolution API',
    };
  }
}
