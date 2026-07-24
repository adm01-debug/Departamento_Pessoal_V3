import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, createErrorResponse, parseJsonBody, enforceOrigin, handlePreflight } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import {
  beginIdempotency,
  completeIdempotency,
  extractIdempotencyKey,
  failIdempotency,
} from '../_shared/idempotency.ts';


/**
 * distribuir-holerites
 * Distribui holerites de uma folha em massa por múltiplos canais (portal, email, whatsapp).
 * - Autenticação obrigatória.
 * - Autorização: usuário deve pertencer à empresa da folha (via user_empresas).
 * - Idempotente: reprocessa apenas canais/holerites ainda não distribuídos.
 */
serve(async (req: Request): Promise<Response> => {
  const __pf = handlePreflight(req); if (__pf) return __pf;
  const __og = enforceOrigin(req); if (__og) return __og;try {
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

  const rlClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
  const rl = await checkRateLimit(rlClient, { key: `distribuir-holerites:${userId}`, limit: 5, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { folha_id?: string; canais?: string[] };
  const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
  if (_pe) return _pe;
  body = _pb as typeof body;

  const folhaId = String(body.folha_id ?? '').trim();
  const canais = Array.isArray(body.canais) && body.canais.length
    ? body.canais.filter((c) => ['portal', 'email', 'whatsapp'].includes(c))
    : ['portal'];

  if (!folhaId) return createErrorResponse('folha_id obrigatório', 400, 'BAD_REQUEST');

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Autoriza acesso à folha pela empresa
  const { data: folha, error: folhaErr } = await admin
    .from('folhas_pagamento')
    .select('id, empresa_id, competencia, status')
    .eq('id', folhaId)
    .maybeSingle();
  if (folhaErr || !folha) {
    return createErrorResponse('Folha não encontrada', 404, 'NOT_FOUND');
  }

  const { data: vinc } = await admin
    .from('user_empresas')
    .select('empresa_id')
    .eq('user_id', userId)
    .eq('empresa_id', folha.empresa_id)
    .maybeSingle();
  if (!vinc) return createErrorResponse('Sem permissão nesta empresa', 403, 'FORBIDDEN');

  // Idempotência transacional — evita distribuições duplicadas em rajada
  const idemKey = extractIdempotencyKey(req, body);
  const idem = await beginIdempotency(admin, {
    endpoint: 'distribuir-holerites',
    key: idemKey,
    requestBody: { folha_id: folhaId, canais: [...canais].sort() },
    empresaId: folha.empresa_id,
    userId,
  });
  if (idem.replay) return idem.replay;
  if (idem.conflict) return idem.conflict;


  // Busca holerites da folha
  const { data: holerites, error: hErr } = await admin
    .from('holerites')
    .select('id, colaborador_id, colaborador_nome')
    .eq('folha_id', folhaId);
  if (hErr) return createErrorResponse(hErr.message, 500, 'DB_ERROR');
  if (!holerites?.length) {
    return createErrorResponse('Nenhum holerite encontrado', 404, 'NOT_FOUND');
  }

  // Já distribuídos (idempotência)
  const { data: jaDist } = await admin
    .from('holerite_distribuicoes')
    .select('holerite_id, canal, status')
    .eq('folha_id', folhaId)
    .in('canal', canais);

  const existentes = new Set(
    (jaDist ?? [])
      .filter((d) => d.status === 'enviado' || d.status === 'enfileirado')
      .map((d) => `${d.holerite_id}::${d.canal}`)
  );

  const inserts: Array<Record<string, unknown>> = [];
  const notifs: Array<Record<string, unknown>> = [];

  for (const h of holerites) {
    for (const canal of canais) {
      const key = `${h.id}::${canal}`;
      if (existentes.has(key)) continue;
      inserts.push({
        folha_id: folhaId,
        holerite_id: h.id,
        colaborador_id: h.colaborador_id,
        canal,
        status: 'enfileirado',
        distribuido_por: userId,
      });
      if (canal === 'portal') {
        notifs.push({
          empresa_id: folha.empresa_id,
          tipo: 'holerite_disponivel',
          titulo: `Holerite ${folha.competencia} disponível`,
          mensagem: `Olá ${h.colaborador_nome}, seu holerite da competência ${folha.competencia} está disponível.`,
          entidade_tipo: 'holerite',
          entidade_id: h.id,
          data_referencia: `${folha.competencia}-01`,
        });
      }
    }
  }

  if (inserts.length === 0) {
    const replayBody = { ok: true, novos: 0, ja_distribuidos: existentes.size, total: holerites.length };
    await completeIdempotency(admin, idem.id, 200, replayBody);
    return new Response(
      JSON.stringify(replayBody),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: distIns, error: distErr } = await admin
    .from('holerite_distribuicoes')
    .insert(inserts)
    .select('id, canal');
  if (distErr) {
    await failIdempotency(admin, idem.id);
    return createErrorResponse(distErr.message, 500, 'DB_ERROR');
  }

  // Marca portal como enviado imediatamente (canal síncrono)
  const idsPortal = (distIns ?? []).filter((d) => d.canal === 'portal').map((d) => d.id);
  if (idsPortal.length) {
    await admin
      .from('holerite_distribuicoes')
      .update({ status: 'enviado' })
      .in('id', idsPortal);
  }

  if (notifs.length) {
    await admin.from('notificacoes').insert(notifs);
  }

  const successBody = {
    ok: true,
    total: holerites.length,
    novos: inserts.length,
    ja_distribuidos: existentes.size,
    canais,
    folha_id: folhaId,
  };
  await completeIdempotency(admin, idem.id, 200, successBody);
  return new Response(
    JSON.stringify(successBody),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
  } catch (e) {
    captureException(e);
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});

