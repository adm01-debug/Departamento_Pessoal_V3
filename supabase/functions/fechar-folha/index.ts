// fechar-folha — Onda 40: hardening completo
// - CSRF fail-closed + JWT via getUser()
// - Zod strict (rejeita campos extras / payload injection)
// - Tenant scope obrigatório via user_belongs_to_empresa / is_admin
// - Optimistic locking via coluna `version` (UPDATE ... WHERE version=X)
// - Verificação de integridade financeira: SUM(holerites) vs totais da folha
// - Auditoria BLOQUEANTE não-repudiável (audit_log + hash SHA-256 do snapshot)
// - Cache-Control: no-store em todas as respostas
// - Erros sem vazamento de PII (apenas ids e hashes)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, validateRequest, enforceOrigin, handlePreflight } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { verifyFolhaIntegrity } from '../_shared/folhaIntegrity.ts';
import { integrityHash } from '../_shared/integrityHash.ts';
import { beginIdempotency, completeIdempotency, failIdempotency, extractIdempotencyKey } from '../_shared/idempotency.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// Tolerância delegada a `_shared/folhaIntegrity.ts` (R$ 0,01)

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
  observacoes: z.string().max(500).optional(),
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
    const { empresaId, folhaId, version, observacoes } = body!;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit — fechamento de folha é ação crítica: 5 req / min / usuário
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `fechar-folha:${userId}`, limit: 5, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // 3.5) Idempotência — evita duplo-fechamento por double-click / retry de rede
    const idemKey = extractIdempotencyKey(req, body);
    const idem = await beginIdempotency(admin, {
      endpoint: 'fechar-folha',
      key: idemKey,
      requestBody: body,
      empresaId,
      userId,
    });
    if (idem.replay) return idem.replay;
    if (idem.conflict) return idem.conflict;




    // 4) Tenant scope
    const { data: belongs } = await admin.rpc('user_belongs_to_empresa', {
      _user_id: userId, _empresa_id: empresaId,
    });
    if (belongs !== true) {
      const { data: isAdmin } = await admin.rpc('is_admin', { _user_id: userId });
      if (isAdmin !== true) {
        return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');
      }
    }

    // 5) Carregar folha
    const { data: folha, error: folhaErr } = await admin
      .from('folhas_pagamento')
      .select('id, empresa_id, status, version, total_proventos, total_descontos, total_liquido, total_fgts, competencia')
      .eq('id', folhaId)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (folhaErr) return createErrorResponse('Erro ao carregar folha', 500, 'FOLHA_LOAD_ERROR');
    if (!folha) return createErrorResponse('Folha não encontrada', 404, 'FOLHA_NOT_FOUND');
    if (folha.status !== 'aberta') {
      return createErrorResponse(
        `Folha não está aberta (status atual: ${folha.status})`,
        409, 'FOLHA_NOT_OPEN',
      );
    }
    if (folha.version !== version) {
      return createErrorResponse(
        `Versão desatualizada. Recarregue a folha (esperado: ${folha.version}).`,
        409, 'VERSION_CONFLICT',
      );
    }

    // 6) Integridade financeira: holerites + folha_itens (cruzamento duplo)
    const integrity = await verifyFolhaIntegrity(admin, folhaId, folha);
    if (!integrity.ok) {
      const httpStatus = integrity.code === 'FOLHA_EMPTY' ? 422 : 422;
      console.warn('[fechar-folha] integrity failure', {
        folha_id: folhaId,
        code: integrity.code,
        details: integrity.details,
      });
      return createErrorResponse(
        'Integridade financeira violada',
        httpStatus,
        integrity.code,
      );
    }

    const { sum_proventos: sumProv, sum_descontos: sumDesc, sum_liquido: sumLiq, sum_fgts: sumFgts, holerites_count: count, itens_count: itensCount } = integrity;

    // 7) Optimistic lock update
    const closedAt = new Date().toISOString();
    const { data: updated, error: updErr } = await admin
      .from('folhas_pagamento')
      .update({
        status: 'fechada',
        data_fechamento: closedAt,
        fechada_por: userId,
        observacoes: observacoes ?? null,
        version: folha.version + 1,
        updated_at: closedAt,
      })
      .eq('id', folhaId)
      .eq('version', folha.version)
      .eq('status', 'aberta')
      .select('id, version')
      .maybeSingle();

    if (updErr) return createErrorResponse('Erro ao fechar folha', 500, 'FOLHA_UPDATE_ERROR');
    if (!updated) {
      // Corrida perdida — outro processo modificou a folha
      return createErrorResponse(
        'Folha foi alterada por outro processo. Recarregue e tente novamente.',
        409, 'VERSION_CONFLICT',
      );
    }

    // 8) Warning não bloqueante: provisões mensais
    let warnings: string[] = [];
    try {
      const { count: provCount } = await admin
        .from('provisoes_mensais')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('competencia', folha.competencia);
      if ((provCount ?? 0) === 0) {
        warnings.push('PROVISOES_AUSENTES');
      }
    } catch { /* warning apenas */ }

    // 9) Auditoria bloqueante não-repudiável
    const snapshot = {
      folhaId,
      empresaId,
      competencia: folha.competencia,
      status_anterior: 'aberta',
      status_novo: 'fechada',
      version_anterior: folha.version,
      version_nova: updated.version,
      total_proventos: sumProv,
      total_descontos: sumDesc,
      total_liquido: sumLiq,
      total_fgts: sumFgts,
      holerites_count: count,
      itens_count: itensCount,
      user_id: userId,
      closed_at: closedAt,
    };
    const auditHash = await integrityHash(snapshot);

    const { error: auditErr } = await admin.from('audit_log').insert({
      tabela: 'folhas_pagamento',
      registro_id: folhaId,
      acao: 'CLOSE',
      dados_anteriores: { status: 'aberta', version: folha.version },
      dados_novos: { ...snapshot, audit_hash: auditHash },
      user_id: userId,
      user_email: userEmail || null,
    });
    if (auditErr) {
      // Reverter fechamento para preservar consistência da trilha
      await admin.from('folhas_pagamento').update({
        status: 'aberta',
        data_fechamento: null,
        fechada_por: null,
        version: folha.version,
        updated_at: new Date().toISOString(),
      }).eq('id', folhaId).eq('version', updated.version);
      await failIdempotency(admin, idem.id);
      return createErrorResponse('Auditoria falhou — fechamento revertido', 500, 'AUDIT_FAILED');
    }

    const okBody = {
      ok: true,
      folha_id: folhaId,
      version: updated.version,
      audit_hash: auditHash,
      warnings,
    };
    await completeIdempotency(admin, idem.id, 200, okBody);
    return jsonOk(okBody, 200, { 'X-Audit-Hash': auditHash });
  } catch (e) {
    console.error('[fechar-folha] erro inesperado:', (e as Error)?.message);
    return createErrorResponse('Erro interno', 500, 'INTERNAL_ERROR');
  }
});

