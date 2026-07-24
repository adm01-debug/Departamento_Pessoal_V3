// Remediação de auditoria (achado E7 / ALTO):
// • JWT + tenant scope obrigatórios (antes: sem autenticação alguma;
//   qualquer um lia headcount, total_bruto de folha e status eSocial de
//   QUALQUER empresa informando o empresaId de outro tenant — IDOR)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequest, corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { metricasSchema } from '../_shared/schemas/common.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    }
    const userId = userData.user.id;

    const { data, errorResponse } = await validateRequest(req, metricasSchema);
    if (errorResponse) return errorResponse;
    const { empresaId } = data!;
    if (!empresaId) return createErrorResponse('empresaId é obrigatório', 422, 'VALIDATION_ERROR');

    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: belongs }, { data: isAdm }] = await Promise.all([
      admin.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresaId }),
      admin.rpc('is_admin', { _user_id: userId }),
    ]);
    if (!belongs && !isAdm) return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [{ data: belongs }, { data: isAdm }] = await Promise.all([
      supabase.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresaId }),
      supabase.rpc('is_admin', { _user_id: userId }),
    ]);
    if (!belongs && !isAdm) {
      return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `metricas:${userId}`, limit: 60, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const [colabs, folha, ferias, afast, esocial, processing] = await Promise.all([
      supabase.from('colaboradores').select('status, departamento', { count: 'exact' }).eq('empresa_id', empresaId),
      supabase.from('folhas_pagamento').select('competencia, salario_bruto, salario_liquido').eq('empresa_id', empresaId).order('competencia', { ascending: false }).limit(500),
      supabase.from('ferias').select('status').eq('empresa_id', empresaId),
      supabase.from('afastamentos').select('tipo, status').eq('empresa_id', empresaId),
      supabase.from('esocial_eventos').select('status').eq('empresa_id', empresaId),
      supabase.from('metricas_processamento').select('*').eq('empresa_id', empresaId).order('timestamp', { ascending: false }).limit(100),
    ]);

    const ativos = (colabs.data || []).filter((c: any) => c.status === 'ativo').length;
    const deptos = [...new Set((colabs.data || []).map((c: any) => c.departamento).filter(Boolean))];
    const folhaData = folha.data || [];
    const ultimaComp = folhaData[0]?.competencia || null;
    const totalBruto = folhaData.filter((f: any) => f.competencia === ultimaComp).reduce((s: number, f: any) => s + (f.salario_bruto || 0), 0);

    const esocialData = esocial.data || [];
    const processingData = processing.data || [];

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      colaboradores: { total: colabs.count || 0, ativos, departamentos: deptos.length },
      folha: { ultima_competencia: ultimaComp, total_bruto: totalBruto },
      ferias: { total: ferias.data?.length || 0 },
      afastamentos: { total: afast.data?.length || 0 },
      esocial: {
        enviados: esocialData.filter((e: any) => e.status === 'enviado').length,
        pendentes: esocialData.filter((e: any) => e.status === 'pendente').length,
        erros: esocialData.filter((e: any) => e.status === 'erro').length,
      },
      monitoring: {
        avg_latency: processingData.reduce((acc: number, curr: any) => acc + (curr.tempo_execucao_ms || 0), 0) / (processingData.length || 1),
        success_rate: (processingData.filter((p: any) => p.status === 'success').length / (processingData.length || 1)) * 100,
        recent_failures: processingData.filter((p: any) => p.status !== 'success').length,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch (error) {
    try { captureException(error, { fn: 'metricas' }); } catch { /* noop */ }
    return createErrorResponse('Erro interno ao obter métricas', 500, 'INTERNAL_SERVER_ERROR');
  }
});
