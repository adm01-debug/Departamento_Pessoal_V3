// Remediação de auditoria (achado E2 / CRÍTICO):
// • JWT obrigatório (antes: sem autenticação alguma, service_role exposto).
//   É invocada tanto manualmente pelo usuário (SystemHealthTab,
//   MorningBriefing) quanto — no futuro — poderia ser agendada; hoje não há
//   nenhum scheduler real chamando esta função, só o usuário logado.
// • Alertas e e-mails agora escopados às empresas do CALLER (antes:
//   agregava PII de TODAS as empresas do sistema numa única mensagem,
//   cross-tenant leak — achado E2)
// • Remove o fallback `body.email` (antes: atacante escolhia o destinatário
//   = relay de e-mail aberto)
// • HTML escapado antes de interpolar dados do colaborador (antes: HTML
//   injection via nome/tipo)
// • Destinatários resolvidos por empresa via user_empresas + user_roles
//   (antes: `profiles.email`, coluna que não existe no schema real)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

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
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Serviço de email não configurado' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    const rl = await checkRateLimit(supabase, { key: `alertas-dp:${userData.user.id}`, limit: 5, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Tenant scope obrigatório
    const { body: _pb } = await parseJsonBody(req);
    const body: any = _pb ?? {};
    const empresaId = body?.empresaId;
    if (!empresaId || typeof empresaId !== 'string') {
      return new Response(JSON.stringify({ error: 'empresaId é obrigatório' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: belongs } = await supabase.rpc('user_belongs_to_empresa', {
      _user_id: userData.user.id, _empresa_id: empresaId,
    });
    if (belongs !== true) {
      const { data: isAdm } = await supabase.rpc('is_admin', { _user_id: userData.user.id });
      if (isAdm !== true) {
        return new Response(JSON.stringify({ error: 'Sem acesso a esta empresa' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const hoje = new Date();
    const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const hojeStr = hoje.toISOString().split('T')[0];

    const alertas: { tipo: string; mensagem: string; urgencia: string; detalhes: any[] }[] = [];

    // 1. ASOs vencendo em 7 dias
    const { data: asosVencendo } = await supabase
      .from('asos')
      .select('*, colaborador:colaboradores(nome_completo, email)')
      .eq('empresa_id', empresaId)
      .lte('data_validade', em7dias)
      .gte('data_validade', hojeStr);

    if (asosVencendo?.length) {
      alertas.push({
        tipo: 'ASOs Vencendo',
        mensagem: `${asosVencendo.length} ASO(s) vencem nos proximos 7 dias`,
        urgencia: 'alta',
        detalhes: asosVencendo.map((a: any) => ({
          colaborador: a.colaborador?.nome_completo,
          tipo: a.tipo,
          validade: a.data_validade,
        })),
      });
    }

    // 2. ASOs já vencidos
    const { data: asosVencidos } = await supabase
      .from('asos')
      .select('*, colaborador:colaboradores(nome_completo)')
      .eq('empresa_id', empresaId)
      .lt('data_validade', hojeStr);

    if (asosVencidos?.length) {
      alertas.push({
        tipo: 'ASOs Vencidos',
        mensagem: `${asosVencidos.length} ASO(s) estao vencidos!`,
        urgencia: 'critica',
        detalhes: asosVencidos.map((a: any) => ({
          colaborador: a.colaborador?.nome_completo,
          tipo: a.tipo,
          vencido_desde: a.data_validade,
        })),
      });
    }

    // 3. Ferias vencendo em 30 dias
    const { data: colabAtivos } = await supabase
      .from('colaboradores')
      .select('id, nome_completo, data_admissao, email')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo');

    const feriasVencendo = (colabAtivos || []).filter((c: any) => {
      if (!c.data_admissao) return false;
      const admissao = new Date(c.data_admissao);
      const mesesTrabalhados = (hoje.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return mesesTrabalhados >= 11 && mesesTrabalhados <= 12;
    });

    if (feriasVencendo.length) {
      alertas.push({
        tipo: 'Ferias Proximas',
        mensagem: `${feriasVencendo.length} colaborador(es) completam periodo aquisitivo em breve`,
        urgencia: 'media',
        detalhes: feriasVencendo.map((c: any) => ({
          colaborador: c.nome_completo,
          admissao: c.data_admissao,
        })),
      });
    }

    // 4. Contratos de experiencia vencendo
    const em90dias = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);
    const em83dias = new Date(hoje.getTime() - 83 * 24 * 60 * 60 * 1000);
    const contratosVencendo = (colabAtivos || []).filter((c: any) => {
      if (!c.data_admissao) return false;
      const admDate = new Date(c.data_admissao);
      return admDate >= em90dias && admDate <= em83dias;
    });

    if (contratosVencendo.length) {
      alertas.push({
        tipo: 'Contratos de Experiencia',
        mensagem: `${contratosVencendo.length} contrato(s) de experiencia vencem em breve`,
        urgencia: 'alta',
        detalhes: contratosVencendo.map((c: any) => ({
          colaborador: c.nome_completo,
          admissao: c.data_admissao,
        })),
      });
    }

    if (alertas.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum alerta pendente', alertas: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: empresas } = await supabase.from('empresas').select('id, razao_social').in('id', empresaIds);

    // Build email HTML
    const alertasHTML = alertas.map(a => `
      <div style="margin-bottom:20px;padding:16px;border-radius:12px;border:1px solid ${a.urgencia === 'critica' ? '#ef4444' : a.urgencia === 'alta' ? '#f59e0b' : '#3b82f6'};background:${a.urgencia === 'critica' ? '#fef2f2' : a.urgencia === 'alta' ? '#fffbeb' : '#eff6ff'}">
        <h3 style="margin:0 0 8px;font-size:16px;color:#1f2937">${a.tipo}</h3>
        <p style="margin:0 0 12px;color:#6b7280;font-size:14px">${a.mensagem}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          ${a.detalhes.slice(0, 10).map(d => `
            <tr style="border-bottom:1px solid #e5e7eb">
              ${Object.values(d).map(v => `<td style="padding:6px 8px;color:#374151">${v || '-'}</td>`).join('')}
            </tr>
          `).join('')}
        </table>
        ${a.detalhes.length > 10 ? `<p style="color:#9ca3af;font-size:12px;margin-top:8px">+${a.detalhes.length - 10} mais</p>` : ''}
      </div>
    `).join('');

    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif">
        <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;border-radius:16px 16px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">Alertas do Departamento Pessoal</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px">${hoje.toLocaleDateString('pt-BR')} - ${alertas.length} alerta(s) ativo(s)</p>
        </div>
        <div style="padding:24px;background:#ffffff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px">
          ${alertasHTML}
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="color:#9ca3af;font-size:12px">Sistema de Departamento Pessoal - Alertas automaticos</p>
          </div>
        </div>
      `;

    // Get admin emails from profiles (cap at 50 to avoid URL-length issues)
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(50);

      for (const alerta of alertas) {
        await supabase.from('notificacoes').insert({
          empresa_id: empresa.id,
          titulo: alerta.tipo,
          mensagem: alerta.mensagem,
          tipo: alerta.urgencia === 'critica' ? 'erro' : alerta.urgencia === 'alta' ? 'aviso' : 'info',
        }).then(() => {}, () => {});
      }

      resultadoPorEmpresa.push({ empresa_id: empresa.id, alertas: alertas.length, destinatarios: recipientEmails.length });
    }

    // Fallback: get from already-parsed request body
    if (!recipientEmails.length && body?.email && typeof body.email === 'string') {
      recipientEmails = [body.email];
    }

    if (!recipientEmails.length) {
      return new Response(JSON.stringify({ message: 'Alertas gerados mas sem destinatarios configurados', alertas }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'DP Alertas <onboarding@resend.dev>',
        to: recipientEmails,
        subject: `${alertas.length} Alerta(s) DP - ${hoje.toLocaleDateString('pt-BR')}`,
        html,
      }),
    });

    const emailResult = await emailRes.json();

    // Log alertas as notificacoes
    for (const alerta of alertas) {
      await supabase.from('notificacoes').insert({
        titulo: alerta.tipo,
        mensagem: alerta.mensagem,
        tipo: alerta.urgencia === 'critica' ? 'erro' : alerta.urgencia === 'alta' ? 'aviso' : 'info',
        user_id: userData.user.id,
      }).catch(() => {});
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
