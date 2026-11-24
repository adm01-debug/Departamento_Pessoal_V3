import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

// Onda 22: hardening completo — auth JWT, CSRF, admin-only, tenant scope, audit,
// e execução server-side com service_role. Fail-closed em todos os pontos.

const BodySchema = z.object({
  action: z.enum(['run', 'status', 'list']),
  empresaId: z.string().uuid().optional(),
  tables: z.array(z.string().min(1).max(64)).max(50).optional(),
  destino: z.enum(['storage', 'inline']).optional().default('storage'),
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1) CSRF fail-closed em state-changing
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    // 2) Auth JWT obrigatória
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return createErrorResponse('Não autenticado', 401, 'UNAUTHORIZED');
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: claimsData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !claimsData?.user?.id) {
      return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    }
    const user = { id: claimsData.user.id };

    // 3) Validação
    const { body: _pb } = await parseJsonBody(req);
    const parsed = BodySchema.safeParse(_pb ?? {});
    if (!parsed.success) return createValidationErrorResponse(parsed.error);
    const { action, empresaId, tables, destino } = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4) Admin-only (backup é operação sensível — expõe dados em massa)
    const { data: isAdmin } = await admin.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) {
      return createErrorResponse('Somente administradores podem executar backups', 403, 'FORBIDDEN');
    }

    // 5) Tenant scope: se empresaId for informado, exige vínculo
    if (empresaId) {
      const { data: belongs } = await admin.rpc('user_belongs_to_empresa', {
        _user_id: user.id,
        _empresa_id: empresaId,
      });
      if (!belongs) {
        return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');
      }
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `backup:${user.id}`, limit: 3, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // 6) Whitelist de tabelas exportáveis (evita dump de auth/storage/vault)
    const ALLOWED_TABLES = new Set([
      'colaboradores', 'folhas_pagamento', 'holerites', 'ferias', 'afastamentos',
      'departamentos', 'cargos', 'admissoes', 'desligamentos', 'batidas_ponto',
      'beneficios', 'documentos', 'esocial_eventos', 'guias_fgts', 'guias_inss',
    ]);
    const targetTables = (tables ?? [...ALLOWED_TABLES]).filter((t) => ALLOWED_TABLES.has(t));
    if (targetTables.length === 0) {
      return createErrorResponse('Nenhuma tabela válida para backup', 422, 'VALIDATION_ERROR');
    }

    if (action === 'status') {
      const { data: last } = await admin
        .from('audit_log')
        .select('created_at, dados_novos')
        .eq('acao', 'BACKUP_RUN')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return new Response(JSON.stringify({ ok: true, last }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      let q = admin.from('audit_log').select('id, created_at, dados_novos')
        .eq('acao', 'BACKUP_RUN').order('created_at', { ascending: false }).limit(50);
      if (empresaId) q = q.eq('empresa_id', empresaId);
      const { data: list } = await q;
      return new Response(JSON.stringify({ ok: true, backups: list ?? [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // action === 'run' — executa backup escopado por empresa (obrigatório)
    if (!empresaId) {
      return createErrorResponse('empresaId é obrigatório para executar backup', 422, 'VALIDATION_ERROR');
    }

    const snapshot: Record<string, unknown> = {};
    const counts: Record<string, number> = {};
    for (const table of targetTables) {
      const { data, error, count } = await admin
        .from(table)
        .select('*', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .limit(10_000); // hard cap — proteção contra OOM
      if (error) {
        // pula tabelas que não têm empresa_id (ex.: catálogos), sem falhar tudo
        console.warn(`Backup: tabela ${table} pulada:`, error.message);
        continue;
      }
      snapshot[table] = data ?? [];
      counts[table] = count ?? (data?.length ?? 0);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `${empresaId}/backup-${timestamp}.json`;
    const payloadStr = JSON.stringify({
      empresa_id: empresaId,
      generated_at: new Date().toISOString(),
      generated_by: user.id,
      tables: targetTables,
      counts,
      data: snapshot,
    });

    // Hash SHA-256 de integridade (não-repúdio + verificação pós-upload)
    const payloadBytes = new TextEncoder().encode(payloadStr);
    const hashBuf = await crypto.subtle.digest('SHA-256', payloadBytes);
    const payloadHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
    const bytesSize = payloadBytes.byteLength;

    let signedUrl: string | null = null;
    let integrityVerified = false;
    if (destino === 'storage') {
      const { error: upErr } = await admin.storage
        .from('backups')
        .upload(path, new Blob([payloadStr], { type: 'application/json' }), {
          contentType: 'application/json',
          upsert: false,
        });
      if (upErr && !/already exists/i.test(upErr.message)) {
        await captureException(upErr, { function: 'backup-automatico', empresaId });
        return createErrorResponse('Falha ao gravar backup', 500, 'STORAGE_ERROR');
      }

      // Verificação de integridade: re-download e compara hash
      try {
        const { data: dl, error: dlErr } = await admin.storage.from('backups').download(path);
        if (dlErr || !dl) throw dlErr ?? new Error('download vazio');
        const dlBuf = new Uint8Array(await dl.arrayBuffer());
        const verifyBuf = await crypto.subtle.digest('SHA-256', dlBuf);
        const verifyHash = Array.from(new Uint8Array(verifyBuf))
          .map((b) => b.toString(16).padStart(2, '0')).join('');
        integrityVerified = verifyHash === payloadHash;
        if (!integrityVerified) {
          await captureException(new Error('Backup integrity mismatch'), { path, expected: payloadHash, got: verifyHash });
          return createErrorResponse('Falha de integridade no backup', 500, 'INTEGRITY_ERROR');
        }
      } catch (verifyErr) {
        await captureException(verifyErr, { function: 'backup-automatico:verify', path });
        return createErrorResponse('Falha ao verificar integridade do backup', 500, 'INTEGRITY_ERROR');
      }

      const { data: signed } = await admin.storage
        .from('backups')
        .createSignedUrl(path, 60 * 60 * 24); // 24h TTL
      signedUrl = signed?.signedUrl ?? null;
    }

    // 7) Audit log com hash de integridade
    const { error: auditErr } = await admin.from('audit_log').insert({
      user_id: user.id,
      empresa_id: empresaId,
      acao: 'BACKUP_RUN',
      entidade: 'backup',
      dados_novos: {
        path, counts, tables: targetTables, destino,
        sha256: payloadHash, bytes: bytesSize, integrity_verified: integrityVerified,
      },
    });
    if (auditErr) throw auditErr;

    return new Response(JSON.stringify({
      ok: true,
      empresa_id: empresaId,
      counts,
      path: destino === 'storage' ? path : null,
      signed_url: signedUrl,
      sha256: payloadHash,
      bytes: bytesSize,
      integrity_verified: integrityVerified,
      inline: destino === 'inline' ? snapshot : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
    });
  } catch (err) {
    await captureException(err, { function: 'backup-automatico' });
    return createErrorResponse('Erro interno no backup', 500, 'INTERNAL_SERVER_ERROR');
  }
});
