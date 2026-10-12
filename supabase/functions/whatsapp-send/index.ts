import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { validateRequest, corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { uuidPg } from '../_shared/schemas/common.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { requireRh, type AdminClient } from '../_shared/authz.ts';
import { captureException } from '../_shared/sentry.ts';
import { safePost } from '../_shared/safe-fetch.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';

// Envio real de WhatsApp via Evolution API (instancia_url/api_key/instancia_nome
// em whatsapp_config). A chave nunca sai do servidor: o browser só invoca esta
// função e recebe o desfecho — status 'sent'/'failed' gravado no log append-only
// (whatsapp_mensagens_logs não aceita UPDATE, então o insert já carrega o
// status final; nunca existe uma linha 'pending' transitória).

const bodySchema = z.object({
  empresa_id: uuidPg(),
  telefone: z.string().min(8).max(20),
  mensagem: z.string().min(1).max(4096).optional(),
  colaborador_id: uuidPg().optional(),
  template_id: uuidPg().optional(),
}).strict().refine(
  (v) => v.mensagem !== undefined || v.template_id !== undefined,
  { message: 'mensagem ou template_id obrigatório' },
);

function normalizarTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, '');
  // DDI 55 implícito para números BR sem código de país (10-11 dígitos).
  return digits.length <= 11 ? `55${digits}` : digits;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const csrf = await verifyCsrf(req.clone());
  if (!csrf.ok) return csrf.response!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
  }
  const userId = userData.user.id;

  const admin = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
  const rl = await checkRateLimit(admin, { key: `whatsapp-send:${userId}`, limit: 30, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl, req);

  const { data: body, errorResponse } = await validateRequest(req, bodySchema);
  if (errorResponse) return errorResponse;
  const { empresa_id, telefone, colaborador_id, template_id } = body!;

  const authz = await requireRh(admin as unknown as AdminClient, userId, empresa_id, req);
  if (authz.denied) return authz.denied;

  const registrarLog = async (log: {
    status: 'sent' | 'failed';
    mensagem_id_externo?: string | null;
    error_message?: string | null;
  }) => {
    const { data: row, error } = await admin
      .from('whatsapp_mensagens_logs')
      .insert({
        empresa_id,
        colaborador_id: colaborador_id ?? null,
        telefone,
        template_id: template_id ?? null,
        status: log.status,
        mensagem_id_externo: log.mensagem_id_externo ?? null,
        error_message: log.error_message ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return row.id as string;
  };

  try {
    const { data: config, error: cfgErr } = await admin
      .from('whatsapp_config')
      .select('instancia_url, api_key, instancia_nome')
      .eq('empresa_id', empresa_id)
      .maybeSingle();
    if (cfgErr) throw cfgErr;

    let mensagem = body!.mensagem;
    if (template_id) {
      const { data: tpl, error: tplErr } = await admin
        .from('whatsapp_templates')
        .select('conteudo')
        .eq('id', template_id)
        .eq('empresa_id', empresa_id)
        .maybeSingle();
      if (tplErr) throw tplErr;
      if (!tpl) return createErrorResponse('Template não encontrado', 404, 'TEMPLATE_NOT_FOUND');
      // Template é a fonte da mensagem quando informado — conteúdo salvo pelo RH.
      mensagem = tpl.conteudo;
    }

    if (!config?.instancia_url || !config.api_key || !config.instancia_nome) {
      const logId = await registrarLog({
        status: 'failed',
        error_message: 'WhatsApp não configurado para a empresa (instância Evolution API ausente)',
      });
      return new Response(
        JSON.stringify({ success: false, status: 'failed', log_id: logId, motivo: 'not_configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const url = `${config.instancia_url.replace(/\/+$/, '')}/message/sendText/${encodeURIComponent(config.instancia_nome)}`;
    let status: 'sent' | 'failed' = 'sent';
    let mensagemIdExterno: string | null = null;
    let errorMessage: string | null = null;

    try {
      const res = await safePost(
        url,
        { number: normalizarTelefone(telefone), text: mensagem },
        {
          tag: 'whatsapp',
          headers: { apikey: config.api_key },
        },
      );
      if (res.ok) {
        const payload = await res.json().catch(() => null) as { key?: { id?: string } } | null;
        mensagemIdExterno = payload?.key?.id ?? null;
      } else {
        status = 'failed';
        const detail = await res.text().catch(() => '');
        errorMessage = `Evolution API respondeu ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`;
      }
    } catch (e) {
      status = 'failed';
      errorMessage = e instanceof Error ? e.message.slice(0, 300) : 'Falha de rede ao chamar Evolution API';
    }

    const logId = await registrarLog({ status, mensagem_id_externo: mensagemIdExterno, error_message: errorMessage });

    return new Response(
      JSON.stringify({ success: status === 'sent', status, log_id: logId, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    captureException(error);
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
