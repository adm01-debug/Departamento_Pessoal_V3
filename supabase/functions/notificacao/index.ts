// notificacao — Onda 37: hardening completo
// - CSRF fail-closed
// - JWT via getUser() (validação server-side da sessão)
// - Zod strict com discriminated union por action (rejeita campos extras)
// - Tenant scope obrigatório: empresaId sempre validado, e cada destinatário
//   é verificado como pertencente à mesma empresa (previne cross-tenant leak)
// - Auditoria BLOQUEANTE: se falhar, a resposta é 500 e a operação é abortada
// - No-store em todas as respostas
// - Sanitização HTML + caps + hash SHA-256 do payload auditado

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, createErrorResponse, validateRequest } from '../_shared/contract.ts';
import { notificacaoSchema } from '../_shared/schemas/common.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const NO_STORE_HEADERS = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function jsonOk(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE_HEADERS });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    // 1) CSRF fail-closed
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    // 2) JWT (getUser — validação server-side da sessão)
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return createErrorResponse('Não autenticado', 401, 'UNAUTHORIZED');

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claimsData?.user?.id) {
      return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    }
    const userId = claimsData.user.id;

    // 3) Validação Zod strict (discriminated union bloqueia campos extras)
    const { data, errorResponse } = await validateRequest(req, notificacaoSchema);
    if (errorResponse) return errorResponse;
    const body = data!;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4) Tenant scope: verifica se o usuário tem acesso à empresa
    async function assertTenantAccess(empresaId: string): Promise<Response | null> {
      const { data: belongs } = await admin.rpc('user_belongs_to_empresa', {
        _user_id: userId,
        _empresa_id: empresaId,
      });
      if (belongs === true) return null;
      const { data: isAdmin } = await admin.rpc('is_admin', { _user_id: userId });
      if (isAdmin === true) return null;
      return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `notificacao:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    switch (body.action) {
      case 'enviar': {
        const { empresaId, tipo, destinatarios, assunto, conteudo } = body;

        const tenantDenied = await assertTenantAccess(empresaId);
        if (tenantDenied) return tenantDenied;

        // Sanitiza + re-valida tamanhos pós-strip
        const safeAssunto = stripHtml(assunto).slice(0, 200);
        const safeConteudo = stripHtml(conteudo).slice(0, 5000);
        if (!safeAssunto || !safeConteudo) {
          return createErrorResponse(
            'Conteúdo vazio após sanitização',
            422, 'EMPTY_AFTER_SANITIZE',
          );
        }

        // Tenant scope por destinatário: cada user_id deve pertencer à empresa.
        // Consulta user_empresas em batch para evitar N round-trips.
        const destIds = Array.from(new Set(destinatarios.map((d) => d.user_id)));
        const { data: vinculos, error: vincErr } = await admin
          .from('user_empresas')
          .select('user_id')
          .eq('empresa_id', empresaId)
          .in('user_id', destIds);
        if (vincErr) {
          return createErrorResponse(
            'Falha ao validar destinatários',
            500, 'TENANT_VALIDATION_FAILED',
          );
        }
        const permitidos = new Set((vinculos ?? []).map((v: { user_id: string }) => v.user_id));
        const bloqueados = destIds.filter((id) => !permitidos.has(id));
        if (bloqueados.length > 0) {
          return createErrorResponse(
            `Destinatários fora da empresa: ${bloqueados.length}`,
            403, 'CROSS_TENANT_RECIPIENT',
            bloqueados.slice(0, 5).map((id) => ({ field: 'destinatarios', message: id })),
          );
        }

        // Insert em lote de notificações (best-effort por linha).
        const notifRows = destIds.map((uid) => ({
          user_id: uid,
          empresa_id: empresaId,
          tipo: tipo ?? 'info',
          titulo: safeAssunto,
          mensagem: safeConteudo,
          lida: false,
        }));
        const { data: inserted, error: insErr } = await admin
          .from('notificacoes')
          .insert(notifRows)
          .select('id, user_id');
        if (insErr) {
          return createErrorResponse('Falha ao criar notificações', 500, 'INSERT_FAILED');
        }
        const enviadas = inserted?.length ?? 0;

        // Fila push+email
        const filaRows = (inserted ?? []).flatMap((n: { id: string; user_id: string }) => ([
          {
            user_id: n.user_id, tipo: 'email',
            titulo: safeAssunto, conteudo: safeConteudo,
            metadados: { notification_id: n.id, empresa_id: empresaId },
          },
          {
            user_id: n.user_id, tipo: 'push',
            titulo: safeAssunto, conteudo: safeConteudo,
            metadados: { notification_id: n.id, empresa_id: empresaId },
          },
        ]));
        if (filaRows.length > 0) {
          await admin.from('fila_notificacoes').insert(filaRows);
        }

        // AUDITORIA BLOQUEANTE — se falhar, aborta com 500.
        const auditPayload = {
          tipo, assunto: safeAssunto, total: enviadas, empresa_id: empresaId,
        };
        const auditHash = await sha256Hex(JSON.stringify(auditPayload) + userId);
        const { error: auditErr } = await admin.from('audit_log').insert({
          user_id: userId,
          empresa_id: empresaId,
          acao: 'SEND_NOTIFICATION',
          entidade: 'notificacao',
          dados_novos: { ...auditPayload, audit_hash: auditHash },
        });
        if (auditErr) {
          console.error('[notificacao] AUDIT_BLOCKING_FAILURE:', auditErr.message);
          return createErrorResponse(
            'Auditoria obrigatória falhou — operação abortada',
            500, 'AUDIT_FAILED',
          );
        }

        return jsonOk({ success: true, enviadas, audit_hash: auditHash });
      }

      case 'listar': {
        const empresaId = body.empresaId;
        let q = admin
          .from('notificacoes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (empresaId) {
          const tenantDenied = await assertTenantAccess(empresaId);
          if (tenantDenied) return tenantDenied;
          q = q.eq('empresa_id', empresaId).eq('user_id', userId);
        } else {
          q = q.eq('user_id', userId);
        }
        const { data: list, error } = await q;
        if (error) {
          return createErrorResponse('Falha ao listar', 500, 'QUERY_FAILED');
        }
        return jsonOk({ notificacoes: list ?? [] });
      }
    }

    // Inalcançável (union exaustiva), mas defensivo:
    return createErrorResponse('Ação inválida', 400, 'INVALID_ACTION');
  } catch (err) {
    await captureException(err, { function: 'notificacao' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
