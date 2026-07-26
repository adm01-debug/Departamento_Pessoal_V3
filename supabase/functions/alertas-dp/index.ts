/**
 * alertas-dp — Alertas automáticos do Departamento Pessoal v2
 *
 * Função acionada pelo usuário logado (JWT obrigatório) para obter alertas
 * de RH e segurança. Os alertas são escopados por empresa (tenant isolation).
 *
 * Tipos de alertas:
 *   - ASOs vencendo / vencidos
 *   - Férias próximas (período aquisitivo completando)
 *   - Contratos de experiência a vencer
 *   - Anomalias de login (brute-force, IPs bloqueados) via v_login_anomalies
 *
 * Autenticação: JWT Bearer (obrigatório).
 * Rate limit: 5 req/min por usuário.
 * Tenant scope: empresaId obrigatório + user_belongs_to_empresa ou is_admin.
 *
 * Dependências:
 *   - RESEND_API_KEY (env): e-mail via Resend API
 *   - Tabelas:asos,colaboradores,v_login_anomalies,notificacoes,user_roles
 *
 * P3-057: Integração com v_login_anomalies para alertas de segurança.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';
import { safeFetch } from '../_shared/safe-fetch.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, {
      key: `alertas-dp:${userData.user.id}`,
      limit: 5,
      windowSec: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { body } = await parseJsonBody(req);
    const bodyObj = (body ?? {}) as Record<string, unknown>;
    const empresaId = bodyObj?.empresaId;

    if (!empresaId || typeof empresaId !== 'string') {
      return new Response(JSON.stringify({ error: 'empresaId é obrigatório' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Tenant + admin check
    const [{ data: belongs }, { data: isAdm }] = await Promise.all([
      supabase.rpc('user_belongs_to_empresa', {
        _user_id: userData.user.id,
        _empresa_id: empresaId,
      }),
      supabase.rpc('is_admin', { _user_id: userData.user.id }),
    ]);
    if (!belongs && !isAdm) {
      return new Response(JSON.stringify({ error: 'Sem acesso a esta empresa' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hoje = new Date();
    const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const em90dias = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const em83dias = new Date(hoje.getTime() - 83 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const hojeStr = hoje.toISOString().split('T')[0];

    const alertas: {
      tipo: string;
      mensagem: string;
      urgencia: 'critica' | 'alta' | 'media' | 'baixa';
      detalhes: Record<string, string>[];
    }[] = [];

    // ── 1. ASOs vencendo em 7 dias ───────────────────────────────────────
    const { data:asosVencendo } = await supabase
      .from('asos')
      .select('*, colaborador:colaboradores(nome_completo, email)')
      .eq('empresa_id', empresaId)
      .lte('data_validade', em7dias)
      .gte('data_validade', hojeStr);

    if (asosVencendo?.length) {
      alertas.push({
        tipo: 'ASOs Vencendo',
        mensagem: `${asosVencendo.length} ASO(s) vencem nos próximos 7 dias`,
        urgencia: 'alta',
        detalhes: asosVencendo.slice(0, 10).map((a: Record<string, unknown>) => ({
          colaborador: String((a.colaborador as Record<string, unknown>)?.nome_completo ?? '—'),
          tipo: String(a.tipo ?? '—'),
          validade: String(a.data_validade ?? '—'),
        })),
      });
    }

    // ── 2. ASOs já vencidos ─────────────────────────────────────────────
    const { data:asosVencidos } = await supabase
      .from('asos')
      .select('*, colaborador:colaboradores(nome_completo)')
      .eq('empresa_id', empresaId)
      .lt('data_validade', hojeStr);

    if (asosVencidos?.length) {
      alertas.push({
        tipo: 'ASOs Vencidos',
        mensagem: `${asosVencidos.length} ASO(s) estão vencidos!`,
        urgencia: 'critica',
        detalhes: asosVencidos.slice(0, 10).map((a: Record<string, unknown>) => ({
          colaborador: String((a.colaborador as Record<string, unknown>)?.nome_completo ?? '—'),
          tipo: String(a.tipo ?? '—'),
          vencido_desde: String(a.data_validade ?? '—'),
        })),
      });
    }

    // ── 3. Férias próximas (período aquisitivo completando 11-12 meses) ─
    const { data:colabAtivos } = await supabase
      .from('colaboradores')
      .select('id, nome_completo, data_admissao')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo');

    const MES_MS = 1000 * 60 * 60 * 24 * 30;
    const feriasVencendo = ((colabAtivos) ?? []).filter((c: Record<string, unknown>) => {
      if (!c.data_admissao) return false;
      const admissao = new Date(String(c.data_admissao));
      const mesesTrabalhados = (hoje.getTime() - admissao.getTime()) / MES_MS;
      return mesesTrabalhados >= 11 && mesesTrabalhados <= 12;
    });

    if (feriasVencendo.length) {
      alertas.push({
        tipo: 'Férias Próximas',
        mensagem: `${feriasVencendo.length} colaborador(es) completam período aquisitivo em breve`,
        urgencia: 'media',
        detalhes: feriasVencendo.slice(0, 10).map((c: Record<string, unknown>) => ({
          colaborador: String(c.nome_completo ?? '—'),
          admissao: String(c.data_admissao ?? '—'),
        })),
      });
    }

    // ── 4. Contratos de experiência a vencer ─────────────────────────────
    const contratosVencendo = ((colabAtivos) ?? []).filter((c: Record<string, unknown>) => {
      if (!c.data_admissao) return false;
      const admDate = new Date(String(c.data_admissao));
      return admDate >= new Date(em90dias) && admDate <= new Date(em83dias);
    });

    if (contratosVencendo.length) {
      alertas.push({
        tipo: 'Contratos de Experiência',
        mensagem: `${contratosVencendo.length} contrato(s) de experiência vencem em breve`,
        urgencia: 'alta',
        detalhes: contratosVencendo.slice(0, 10).map((c: Record<string, unknown>) => ({
          colaborador: String(c.nome_completo ?? '—'),
          admissao: String(c.data_admissao ?? '—'),
        })),
      });
    }

    // ── 5. Anomalias de login (P3-057) ───────────────────────────────────
    const { data:anomaliasIP } = await supabase
      .from('v_login_anomalies')
      .select('*')
      .eq('empresa_id', empresaId)
      .limit(20);

    if (anomaliasIP?.length) {
      alertas.push({
        tipo: 'Anomalias de Login',
        mensagem: `${anomaliasIP.length} tentativa(s) anômala(s) de login detectada(s)`,
        urgencia: 'critica',
        detalhes: anomaliasIP.slice(0, 10).map((a: Record<string, unknown>) => ({
          ip: String(a.ip_address ?? '—'),
          falhas: String(a.failure_count ?? 0),
          tipo: String(a.anomaly_type ?? 'brute_force'),
          ultima_tentativa: String(a.last_attempt ?? '—'),
        })),
      });
    }

    // ── Se nenhum alerta ─────────────────────────────────────────────────
    if (alertas.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum alerta pendente', alertas: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Resolver destinatários: admins da empresa ────────────────────────
    const { data:admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(50);

    let recipientEmails: string[] = [];
    if (admins?.length) {
      const { data:profiles } = await supabase
        .from('profiles')
        .select('email')
        .in('user_id', admins.map((a) => a.user_id))
        .not('email', 'is', null);
      recipientEmails = ((profiles) ?? [])
        .map((p: Record<string, unknown>) => String(p.email ?? ''))
        .filter(Boolean)
        .slice(0, 50);
    }

    // ── Construir HTML do e-mail ──────────────────────────────────────────
    const URGENCY_COLOR: Record<string, { border: string; bg: string }> = {
      critica: { border: '#ef4444', bg: '#fef2f2' },
      alta:     { border: '#f59e0b', bg: '#fffbeb' },
      media:    { border: '#3b82f6', bg: '#eff6ff' },
      baixa:    { border: '#6b7280', bg: '#f9fafb' },
    };

    const alertasHTML = alertas.map((a) => {
      const c = URGENCY_COLOR[a.urgencia] ?? URGENCY_COLOR.baixa;
      return `
      <div style="margin-bottom:20px;padding:16px;border-radius:12px;
                  border:1px solid ${c.border};background:${c.bg}">
        <h3 style="margin:0 0 8px;font-size:16px;color:#1f2937">${a.tipo}</h3>
        <p style="margin:0 0 12px;color:#6b7280;font-size:14px">${a.mensagem}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb">
              ${Object.keys(a.detalhes[0] ?? {}).map((k) =>
                `<th style="padding:6px 8px;text-align:left;color:#374151">${k.replace(/_/g, ' ')}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>
            ${a.detalhes.map((d) => `
              <tr style="border-bottom:1px solid #e5e7eb">
                ${Object.values(d).map((v) =>
                  `<td style="padding:6px 8px;color:#374151">${v}</td>`
                ).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
        ${a.detalhes.length > 10
          ? `<p style="color:#9ca3af;font-size:12px;margin-top:8px">+${a.detalhes.length - 10} mais</p>`
          : ''}
      </div>`;
    }).join('');

    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif">
        <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;
                    border-radius:16px 16px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">Alertas do Departamento Pessoal</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px">
            ${hoje.toLocaleDateString('pt-BR')} — ${alertas.length} alerta(s) ativo(s)
          </p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;
                    border-radius:0 0 16px 16px">
          ${alertasHTML}
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="color:#9ca3af;font-size:12px">Sistema de Departamento Pessoal — Alertas automáticos</p>
          </div>
        </div>
      </div>`;

    // ── Enviar e-mail via Resend ─────────────────────────────────────────
    let emailResult: unknown = null;
    if (recipientEmails.length && RESEND_API_KEY) {
      try {
        const emailRes = await safeFetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'DP Alertas <onboarding@resend.dev>',
            to: recipientEmails,
            subject: `${alertas.length} Alerta(s) DP — ${hoje.toLocaleDateString('pt-BR')}`,
            html,
          }),
          timeoutMs: 8_000,
          tag: 'webhook',
        });
        emailResult = await emailRes.json();
      } catch (emailErr) {
        captureException(emailErr, { fn: 'alertas-dp:email', empresaId });
      }
    }

    // ── Gravar notificações na tabela ────────────────────────────────────
    const TIPO_MAP: Record<string, string> = {
      critica: 'erro',
      alta: 'aviso',
      media: 'info',
      baixa: 'info',
    };
    for (const alerta of alertas) {
      supabase.from('notificacoes').insert({
        empresa_id: empresaId,
        user_id: userData.user.id,
        titulo: alerta.tipo,
        mensagem: alerta.mensagem,
        tipo: TIPO_MAP[alerta.urgencia] ?? 'info',
      }).then(() => {}, () => {});
    }

    return new Response(JSON.stringify({
      success: true,
      alertas_enviados: alertas.length,
      destinatarios: recipientEmails.length,
      email_result: emailResult,
      alertas,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    try { captureException(error, { fn: 'alertas-dp' }); } catch { /* noop */ }
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
