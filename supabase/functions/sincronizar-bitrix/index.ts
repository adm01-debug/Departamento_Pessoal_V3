// Onda 15 — Endurecimento: Zod + Auth + Tenant scope + CORS uniformes
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

const BodySchema = z.object({
  action: z.enum(['sync_departamentos', 'sync_colaboradores', 'sync_cargos', 'sync_all', 'status']),
  empresaId: z.string().uuid().optional(),
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405);

  const csrf = await verifyCsrf(req);
  if (!csrf.ok) return csrf.response!;

  try {
    // 1) Auth obrigatório
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ success: false, error: 'Autenticação obrigatória' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse({ success: false, error: 'Sessão inválida' }, 401);
    const userId = userData.user.id;

    // 2) Somente admins podem disparar sync (integração cross-tenant)
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdm } = await admin.rpc('is_admin', { _user_id: userId });
    if (!isAdm) return jsonResponse({ success: false, error: 'Apenas admins podem sincronizar Bitrix24' }, 403);

    // 3) Validação Zod
    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse({ success: false, error: 'Payload inválido', details: parsed.error.flatten() }, 400);
    }
    const { action, empresaId } = parsed.data;

    // 4) Tenant scope opcional
    if (empresaId) {
      const { data: belongs } = await admin.rpc('user_belongs_to_empresa', {
        _user_id: userId, _empresa_id: empresaId,
      });
      if (!belongs) return jsonResponse({ success: false, error: 'Sem acesso a esta empresa' }, 403);
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `bitrix:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // 5) Buscar config Bitrix
    let cfgQuery = admin.from('bitrix24_config').select('*').limit(1);
    if (empresaId) cfgQuery = cfgQuery.eq('empresa_id', empresaId);
    const { data: config, error: cfgErr } = await cfgQuery.maybeSingle();

    if (cfgErr) throw cfgErr;
    if (!config || !config.habilitado) {
      return jsonResponse({ success: false, error: 'Integração Bitrix24 não está habilitada' }, 400);
    }
    if (!config.webhook_url) {
      return jsonResponse({ success: false, error: 'URL do webhook Bitrix24 não configurada' }, 400);
    }

    if (action === 'status') {
      return jsonResponse({
        success: true,
        data: {
          habilitado: config.habilitado,
          webhook_configurado: !!config.webhook_url,
          sync_departamentos: config.sync_departamentos,
          sync_colaboradores: config.sync_colaboradores,
          sync_cargos: config.sync_cargos,
          ultima_execucao: config.ultima_execucao,
          proxima_execucao: config.proxima_execucao,
        },
      });
    }

    const results: Record<string, unknown> = { timestamp: new Date().toISOString() };
    let totalProcessed = 0, totalErrors = 0, totalSuccess = 0;

    if ((action === 'sync_departamentos' || action === 'sync_all') && config.sync_departamentos) {
      try {
        const resp = await fetch(`${config.webhook_url}/department.get`);
        if (!resp.ok) throw new Error(`Bitrix API error: ${resp.status}`);
        const bitrixData = await resp.json();
        const departments = bitrixData.result || [];
        for (const dept of departments) {
          const { error } = await admin.from('departamentos').upsert({
            nome: dept.NAME, ativo: dept.ACTIVE === 'Y',
          }, { onConflict: 'nome' });
          if (error) totalErrors++; else totalSuccess++;
          totalProcessed++;
        }
        results.departamentos = { processed: departments.length };
      } catch (e: unknown) {
        results.departamentos = { error: e instanceof Error ? e.message : 'unknown' };
        totalErrors++;
      }
    }

    if ((action === 'sync_colaboradores' || action === 'sync_all') && config.sync_colaboradores) {
      try {
        const resp = await fetch(`${config.webhook_url}/user.get?ACTIVE=true`);
        if (!resp.ok) throw new Error(`Bitrix API error: ${resp.status}`);
        const bitrixData = await resp.json();
        const users = bitrixData.result || [];
        for (const user of users) {
          const { error } = await admin.from('colaboradores').upsert({
            nome_completo: `${user.NAME} ${user.LAST_NAME}`.trim(),
            email: user.EMAIL,
            empresa_id: config.empresa_id,
            status: 'Ativo',
            matricula: `BX-${user.ID}`,
            departamento: user.UF_DEPARTMENT ? 'Bitrix Sync' : 'Geral',
          }, { onConflict: 'email' });
          if (error) totalErrors++; else totalSuccess++;
          totalProcessed++;
        }
        results.colaboradores = { processed: users.length };
      } catch (e: unknown) {
        results.colaboradores = { error: e instanceof Error ? e.message : 'unknown' };
        totalErrors++;
      }
    }

    if ((action === 'sync_cargos' || action === 'sync_all') && config.sync_cargos) {
      results.cargos = { note: 'Cargos sync requires custom Bitrix24 field mapping' };
    }

    // Log + audit
    await admin.from('bitrix24_sync_logs').insert({
      tipo: action,
      direcao: 'bitrix_to_local',
      registros_processados: totalProcessed,
      registros_sucesso: totalSuccess,
      registros_erro: totalErrors,
      detalhes: results,
    });

    await admin.from('audit_log').insert({
      tabela: 'bitrix24_sync_logs', registro_id: 'sync', acao: 'SYNC',
      user_id: userId,
      dados_novos: { action, totals: { totalProcessed, totalSuccess, totalErrors }, empresa_id: empresaId ?? null },
    });

    await admin.from('bitrix24_config').update({
      ultima_execucao: new Date().toISOString(),
    }).eq('id', config.id);

    return jsonResponse({
      success: true,
      data: { ...results, totals: { processed: totalProcessed, success: totalSuccess, errors: totalErrors } },
    });
  } catch (error: unknown) {
    captureException(error, { fn: 'sincronizar-bitrix' });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ success: false, error: message }, 500);
  }
});
