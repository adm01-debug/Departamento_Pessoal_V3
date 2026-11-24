import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders } from '../_shared/contract.ts';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Autenticação obrigatória' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(adminClient, { key: `limpeza:${userData.user.id}`, limit: 3, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { data: roles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .limit(1);

    if (!roles?.length) {
      return new Response(JSON.stringify({ error: 'Permissão negada: requer role admin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Record<string, number> = {};

    // Cleanup expired blocked IPs
    const { data: ips } = await adminClient
      .from('blocked_ips')
      .delete()
      .eq('permanent', false)
      .lt('expires_at', new Date().toISOString())
      .select('id');
    results.blocked_ips_cleaned = ips?.length || 0;

    // Cleanup old rate limit logs (>7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: rateLogs } = await adminClient
      .from('rate_limit_logs')
      .delete()
      .lt('created_at', weekAgo.toISOString())
      .select('id');
    results.rate_limit_logs_cleaned = rateLogs?.length || 0;

    // Cleanup old login attempts (>30 days)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const { data: loginAttempts } = await adminClient
      .from('login_attempts')
      .delete()
      .lt('created_at', monthAgo.toISOString())
      .select('id');
    results.login_attempts_cleaned = loginAttempts?.length || 0;

    // Cleanup expired verification tokens
    const { data: tokens } = await adminClient
      .from('verification_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');
    results.expired_tokens_cleaned = tokens?.length || 0;

    // Cleanup expired sessions
    const { data: sessions } = await adminClient
      .from('user_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');
    results.expired_sessions_cleaned = sessions?.length || 0;

    // Achado N22 da auditoria: lgpd_fila_limpeza nunca era drenada — itens
    // se acumulavam para sempre com executado=false. drenar_fila_limpeza_lgpd
    // (SECURITY DEFINER, service_role) processa os itens vencidos e chama
    // anonimizar_dados_pessoais para cada um.
    const { data: lgpdResults, error: lgpdError } = await adminClient.rpc('drenar_fila_limpeza_lgpd');
    if (lgpdError) {
      // Falha aqui = direito ao apagamento parado. Nunca em silêncio.
      results.lgpd_fila_limpeza_erro = 1;
      console.error('[limpeza] drenar_fila_limpeza_lgpd falhou:', lgpdError.message);
      captureException(lgpdError, { fn: 'limpeza:drenar_fila_limpeza_lgpd' });
    } else {
      const processados = (lgpdResults ?? []) as Array<{ sucesso: boolean }>;
      results.lgpd_fila_limpeza_processados = processados.filter((r) => r.sucesso).length;
      results.lgpd_fila_limpeza_falhas = processados.filter((r) => !r.sucesso).length;
    }

    // ── P3-065: Purge LGPD via run_lgpd_purge ────────────────────────────
    // Limpa tabelas de log/telemetria conforme public.lgpd_retencao_logs
    // (30d login_attempts, 90d query_telemetry, 730d auditoria, …), editável
    // por admin. Deleta em lotes de 5000 para não segurar lock longo.
    const { data: purgeResults, error: purgeError } = await adminClient
      .rpc('run_lgpd_purge', { p_dry_run: false });

    if (purgeError) {
      results.lgpd_purge_erro = 1;
      captureException(purgeError, { fn: 'limpeza:run_lgpd_purge' });
    } else {
      const purgeArr = (purgeResults ?? []) as Array<{
        tabela: string;
        deleted: number;
        batches: number;
      }>;
      results.lgpd_purge_executado = purgeArr.length;
      results.lgpd_purge_total_deletado = purgeArr.reduce(
        (acc, r) => acc + (Number(r.deleted) || 0), 0
      );
      // Log individual de cada tabela
      for (const r of purgeArr) {
        if (r.deleted && Number(r.deleted) > 0) {
          results[`lgpd_purge_${r.tabela}`] = Number(r.deleted) || 0;
        }
      }
    }

    const totalCleaned = Object.values(results).reduce((a, b) => a + b, 0);

    await adminClient.from('auditoria').insert({
      acao: 'EXECUCAO_LIMPEZA_SISTEMA',
      entidade: 'sistema',
      user_id: userData.user.id,
      descricao: `Limpeza executada por admin. Total de registros removidos: ${totalCleaned}`,
      dados_novos: results,
    });

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      total_cleaned: totalCleaned,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    captureException(error, { fn: 'limpeza' });
    return new Response(JSON.stringify({ success: false, error: 'Erro interno na limpeza' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
