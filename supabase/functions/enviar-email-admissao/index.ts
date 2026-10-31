import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { validateRequest, getCorsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { uuidPg } from '../_shared/schemas/common.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { requireRh, type AdminClient } from '../_shared/authz.ts';
import { captureException } from '../_shared/sentry.ts';
import { sendEmailResend } from '../_shared/outboundDelivery.ts';
import { montarLinkAdmissao, normalizarEmail, validarToken } from './admissaoLink.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';

// Envio real do link de pré-admissão por e-mail via Resend
// (https://resend.com), pelo mesmo helper das outras edges
// (_shared/outboundDelivery.sendEmailResend): só RESEND_API_KEY é exigida;
// remetente = EMAIL_FROM se existir, senão o default compartilhado
// ('Sistema DP <onboarding@resend.dev>'). Sem RESEND_API_KEY a função devolve
// motivo 'email_provider_not_configured' para o front exibir o link copiável
// em vez de fingir envio. Cada tentativa é registrada em
// notificacoes_admissao (canal 'email') — append-only, com o desfecho final.

const bodySchema = z
  .object({
    empresa_id: uuidPg(),
    admissao_id: uuidPg(),
    // id do admissao_tokens recém-criado; o link é montado no servidor.
    token_id: uuidPg(),
    // Opcional: se vier, precisa bater com admissoes.email (o destinatário
    // é SEMPRE o e-mail cadastrado na admissão).
    email: z.string().email().max(320).optional(),
  })
  .strict();

function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });

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
  const rl = await checkRateLimit(admin, { key: `enviar-email-admissao:${userId}`, limit: 30, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl, req);

  const { data: body, errorResponse } = await validateRequest(req, bodySchema);
  if (errorResponse) return errorResponse;
  const { empresa_id, admissao_id, token_id, email: emailInformado } = body!;

  const authz = await requireRh(admin as unknown as AdminClient, userId, empresa_id, req);
  if (authz.denied) return authz.denied;

  // A admissão precisa existir na empresa do chamador — evita usar a função
  // como remetente arbitrário de e-mail com link controlado pelo cliente.
  const { data: admissao, error: admErr } = await admin
    .from('admissoes')
    .select('id, email, nome')
    .eq('id', admissao_id)
    .eq('empresa_id', empresa_id)
    .maybeSingle();
  if (admErr) return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  if (!admissao) return createErrorResponse('Admissão não encontrada', 404, 'NOT_FOUND');

  const email = normalizarEmail(admissao.email);
  if (!email) return createErrorResponse('Admissão sem e-mail cadastrado', 422, 'EMAIL_AUSENTE');
  if (emailInformado && normalizarEmail(emailInformado) !== email) {
    return createErrorResponse('E-mail não confere com o da admissão', 422, 'EMAIL_DIVERGENTE');
  }

  const { data: tok, error: tokErr } = await admin
    .from('admissao_tokens')
    .select('admissao_id, token, data_expiracao, email_candidato')
    .eq('id', token_id)
    .maybeSingle();
  if (tokErr) return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  const motivoToken = validarToken(tok, admissao_id, email);
  if (motivoToken || !tok) return createErrorResponse('Token de admissão inválido', 422, motivoToken ?? 'token_invalido');

  // Origem da allowlist de CORS (a do request se permitida, senão a canônica).
  const link = montarLinkAdmissao(getCorsHeaders(req)['Access-Control-Allow-Origin'], tok.token);
  const nome_candidato = admissao.nome || 'Candidato';

  const registrar = async (status: 'enviado' | 'falha', detalhe: string) => {
    const { error } = await admin.from('notificacoes_admissao').insert({
      admissao_id,
      tipo: 'email',
      canal: 'email',
      status,
      mensagem: detalhe.slice(0, 500),
    });
    if (error) captureException(error);
  };

  try {
    const nome = escapeHtml(nome_candidato);
    const linkSafe = escapeHtml(link);
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 24px;">
        <h2 style="color: #1a365d;">Boas-vindas, ${nome}!</h2>
        <p>Seu processo de admissão digital está pronto para começar.</p>
        <p>Acesse pelo link seguro abaixo para enviar seus dados e documentos:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${linkSafe}" style="background: #1a365d; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Iniciar minha admissão</a>
        </p>
        <p style="font-size: 12px; color: #718096;">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${linkSafe}</p>
        <p style="font-size: 12px; color: #a0aec0;">Este link é pessoal e expira em 7 dias.</p>
      </div>`;

    const envio = await sendEmailResend({
      from: Deno.env.get('EMAIL_FROM') || undefined,
      to: email,
      subject: 'Complete sua admissão digital',
      html,
      idempotencyKey: `admissao-email:${token_id}`,
    });
    if (!envio.configured) {
      await registrar('falha', 'Provedor de e-mail não configurado (RESEND_API_KEY ausente)');
      return new Response(
        JSON.stringify({ success: false, sent: false, motivo: 'email_provider_not_configured' }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }
    const sent = envio.ok;
    const errorMessage = envio.error;

    await registrar(
      sent ? 'enviado' : 'falha',
      sent ? 'Link de contratação enviado por e-mail' : `Falha no envio: ${errorMessage ?? 'desconhecida'}`,
    );

    await admin.from('audit_log').insert({
      tabela: 'admissoes',
      registro_id: admissao_id,
      acao: 'INSERT',
      user_id: userId,
      dados_novos: { evento: 'ADMISSAO_EMAIL_LINK', empresa_id, sent, motivo: errorMessage },
    });

    return new Response(
      JSON.stringify({ success: sent, sent, error: errorMessage }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    captureException(error);
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
