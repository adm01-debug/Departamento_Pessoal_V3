// reabrir-folha — Onda 40: hardening completo
// - CSRF fail-closed + JWT via getUser()
// - Zod strict: motivo obrigatório (10..500), override_esocial opcional
// - Tenant scope obrigatório via user_belongs_to_empresa / is_admin
// - Optimistic locking via coluna `version`
// - Bloqueios de compliance:
//     * ESOCIAL_LOCK: folha com esocial_status='enviado' exige override_esocial + role admin
//     * AUDIT_WINDOW_LOCK: reabertura > 90 dias do fechamento exige role admin
// - Auditoria BLOQUEANTE não-repudiável com snapshot pré-reabertura + hash SHA-256
// - Cache-Control: no-store em todas as respostas

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, validateRequest, enforceOrigin, handlePreflight } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { verifyFolhaIntegrity } from '../_shared/folhaIntegrity.ts';
import { integrityHash } from '../_shared/integrityHash.ts';
import {
  beginIdempotency,
  completeIdempotency,
  extractIdempotencyKey,
  failIdempotency,
} from '../_shared/idempotency.ts';


const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const AUDIT_WINDOW_DAYS = 90;

const NO_STORE = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const jsonOk = (body: Record<string, unknown>, status = 200, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...NO_STORE, ...extra } });

const BodySchema = z.object({
  empresaId: z.string().uuid(),
  folhaId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  motivo: z.string().trim().min(10, 'Motivo deve ter ao menos 10 caracteres').max(500),
  override_esocial: z.boolean().optional().default(false),
}).strict();




serve(async (req: Request): Promise<Response> => {
  const __pf = handlePreflight(req); if (__pf) return __pf;
  const __og = enforceOrigin(req); if (__og) return __og;if (req.method !== 'POST') {
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
    const userEmail = (claimsData.user.email ?? '');

    // 3) Validação Zod strict
    const { data: body, errorResponse } = await validateRequest(req, BodySchema);
    if (errorResponse) return errorResponse;
    const { empresaId, folhaId, version, motivo, override_esocial } = body!;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4) Tenant scope + role admin (para overrides)
    const [{ data: belongs }, { data: isAdmin }] = await Promise.all([
      admin.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresaId }),
      admin.rpc('is_admin', { _user_id: userId }),
    ]);
    if (belongs !== true && isAdmin !== true) {
      return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `reabrir-folha:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // 4.5) Idempotência transacional — evita reaberturas duplicadas
    const idemKey = extractIdempotencyKey(req, body);
    const idem = await beginIdempotency(admin, {
      endpoint: 'reabrir-folha',
      key: idemKey,
      requestBody: { empresaId, folhaId, version, motivo, override_esocial },
      empresaId,
      userId,
    });
    if (idem.replay) return idem.replay;
    if (idem.conflict) return idem.conflict;


    // 5) Carregar folha
    const { data: folha, error: folhaErr } = await admin
      .from('folhas_pagamento')
      .select('id, empresa_id, status, version, competencia, data_fechamento, esocial_status, total_proventos, total_descontos, total_liquido')
      .eq('id', folhaId)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (folhaErr) return createErrorResponse('Erro ao carregar folha', 500, 'FOLHA_LOAD_ERROR');
    if (!folha) return createErrorResponse('Folha não encontrada', 404, 'FOLHA_NOT_FOUND');
    if (folha.status !== 'fechada') {
      return createErrorResponse(
        `Folha não está fechada (status atual: ${folha.status})`,
        409, 'FOLHA_NOT_CLOSED',
      );
    }
    if (folha.version !== version) {
      return createErrorResponse(
        `Versão desatualizada (esperado: ${folha.version})`,
        409, 'VERSION_CONFLICT',
      );
    }

    // 6) Compliance: eSocial já transmitido
    if (folha.esocial_status === 'enviado') {
      if (!override_esocial) {
        return createErrorResponse(
          'Folha já transmitida ao eSocial — reabertura requer override explícito',
          403, 'ESOCIAL_LOCK',
        );
      }
      if (isAdmin !== true) {
        return createErrorResponse(
          'Override do eSocial requer role admin',
          403, 'ESOCIAL_OVERRIDE_DENIED',
        );
      }
    }

    // 7) Compliance: janela de auditoria contábil (90 dias)
    if (folha.data_fechamento) {
      const closedAtMs = new Date(folha.data_fechamento).getTime();
      const ageDays = (Date.now() - closedAtMs) / 86_400_000;
      if (ageDays > AUDIT_WINDOW_DAYS && isAdmin !== true) {
        return createErrorResponse(
          `Folha fechada há mais de ${AUDIT_WINDOW_DAYS} dias — reabertura requer role admin`,
          403, 'AUDIT_WINDOW_LOCK',
        );
      }
    }

    // 7.5) Pré-check de integridade financeira (não bloqueante: reabrir pode
    // ser justamente para corrigir divergências). Registrado no snapshot para
    // rastreabilidade e para permitir comparação pós-recálculo.
    const integrity = await verifyFolhaIntegrity(admin, folhaId, folha);
    const integritySnapshot = integrity.ok
      ? {
          ok: true as const,
          holerites_count: integrity.holerites_count,
          itens_count: integrity.itens_count,
          sum_proventos: integrity.sum_proventos,
          sum_descontos: integrity.sum_descontos,
          sum_liquido: integrity.sum_liquido,
          sum_fgts: integrity.sum_fgts,
        }
      : { ok: false as const, code: integrity.code, details: integrity.details };
    const integrityWarnings = integrity.ok ? [] : [`INTEGRITY_${integrity.code}`];

    // 8) Optimistic lock update
    const reopenedAt = new Date().toISOString();
    const { data: updated, error: updErr } = await admin
      .from('folhas_pagamento')
      .update({
        status: 'aberta',
        reaberta_em: reopenedAt,
        reaberta_por: userId,
        motivo_reabertura: motivo,
        version: folha.version + 1,
        updated_at: reopenedAt,
      })
      .eq('id', folhaId)
      .eq('version', folha.version)
      .eq('status', 'fechada')
      .select('id, version')
      .maybeSingle();

    if (updErr) return createErrorResponse('Erro ao reabrir folha', 500, 'FOLHA_UPDATE_ERROR');
    if (!updated) {
      return createErrorResponse(
        'Folha foi alterada por outro processo. Recarregue e tente novamente.',
        409, 'VERSION_CONFLICT',
      );
    }

    // 9) Auditoria bloqueante não-repudiável (snapshot pré-reabertura)
    const snapshot = {
      folhaId,
      empresaId,
      competencia: folha.competencia,
      status_anterior: 'fechada',
      status_novo: 'aberta',
      version_anterior: folha.version,
      version_nova: updated.version,
      total_proventos: Number(folha.total_proventos ?? 0),
      total_descontos: Number(folha.total_descontos ?? 0),
      total_liquido: Number(folha.total_liquido ?? 0),
      esocial_status: folha.esocial_status,
      override_esocial: Boolean(override_esocial),
      motivo,
      data_fechamento_anterior: folha.data_fechamento,
      integrity_precheck: integritySnapshot,
      user_id: userId,
      reopened_at: reopenedAt,
    };
    const auditHash = await integrityHash(snapshot);

    const { error: auditErr } = await admin.from('audit_log').insert({
      tabela: 'folhas_pagamento',
      registro_id: folhaId,
      acao: 'REOPEN',
      dados_anteriores: {
        status: 'fechada',
        version: folha.version,
        data_fechamento: folha.data_fechamento,
        esocial_status: folha.esocial_status,
      },
      dados_novos: { ...snapshot, audit_hash: auditHash },
      user_id: userId,
      user_email: userEmail || null,
    });
    if (auditErr) {
      // Reverter para preservar trilha
      await admin.from('folhas_pagamento').update({
        status: 'fechada',
        reaberta_em: null,
        reaberta_por: null,
        motivo_reabertura: null,
        version: folha.version,
        updated_at: new Date().toISOString(),
      }).eq('id', folhaId).eq('version', updated.version);
      await failIdempotency(admin, idem.id);
      return createErrorResponse('Auditoria falhou — reabertura revertida', 500, 'AUDIT_FAILED');
    }

    const successBody = {
      ok: true,
      folha_id: folhaId,
      version: updated.version,
      audit_hash: auditHash,
      warnings: integrityWarnings,
      integrity_precheck: integritySnapshot,
    };
    await completeIdempotency(admin, idem.id, 200, successBody);
    return jsonOk(successBody, 200, { 'X-Audit-Hash': auditHash });

  } catch (e) {
    console.error('[reabrir-folha] erro inesperado:', (e as Error)?.message);
    return createErrorResponse('Erro interno', 500, 'INTERNAL_ERROR');
  }
});
