import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders } from '../_shared/contract.ts';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Auth: either a valid cron secret OR an admin JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const cronHeader = req.headers.get('X-Cron-Secret') ?? '';

    let authorized = false;
    let triggeredBy = 'cron';

    // Path 1: Cron secret (for pg_cron / external scheduler)
    // Constant-time comparison: HMAC both values with a fixed key, compare HMACs
    if (cronSecret && cronHeader) {
      const enc = new TextEncoder();
      const fixedKey = await crypto.subtle.importKey(
        'raw', enc.encode('dp-cron-comparison-key'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sigHeader = new Uint8Array(await crypto.subtle.sign('HMAC', fixedKey, enc.encode(cronHeader)));
      const sigSecret = new Uint8Array(await crypto.subtle.sign('HMAC', fixedKey, enc.encode(cronSecret)));
      // XOR accumulation — always runs all 32 iterations regardless of content
      let diff = 0;
      for (let i = 0; i < sigHeader.length; i++) diff |= sigHeader[i] ^ sigSecret[i];
      if (diff === 0) { authorized = true; triggeredBy = 'cron'; }
    }

    // Path 2: Admin JWT (for manual trigger via UI) — CSRF required
    if (!authorized && authHeader.startsWith('Bearer ')) {
      const csrf = await verifyCsrf(req.clone());
      if (!csrf.ok) return csrf.response!;

      const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (!userErr && userData?.user) {
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
        const rl = await checkRateLimit(admin, { key: `agendamentos:${userData.user.id}`, limit: 5, windowSec: 60 });
        if (!rl.allowed) return rateLimitResponse(rl);

        const { data: isAdmin } = await admin.rpc('is_admin', { _user_id: userData.user.id });
        if (isAdmin) {
          authorized = true;
          triggeredBy = userData.user.id;
        }
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const agora = new Date();

    const { data: agendamentos, error } = await supabase
      .from('relatorios_agendados')
      .select('*')
      .eq('ativo', true)
      .or(`proximo_envio.is.null,proximo_envio.lte.${agora.toISOString()}`);

    if (error) throw error;

    const CONCURRENCY = 5;
    const lista = agendamentos ?? [];
    const resultados: unknown[] = [];

    const processarUm = async (agendamento: Record<string, unknown>) => {
      try {
        const deveExecutar = verificarExecucao(agendamento, agora);
        if (!deveExecutar) {
          return { id: agendamento.id, status: 'skipped' };
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/enviar-relatorio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            agendamentoId: agendamento.id,
            tipoRelatorio: agendamento.tipo_relatorio,
            formato: agendamento.formato,
            emailDestinatario: agendamento.email_destinatario,
            parametros: agendamento.parametros,
          }),
        });

        if (!response.ok) {
          throw new Error(`Falha ao enviar relatório (${response.status})`);
        }
        const resultado = await response.json();
        const proximoEnvio = calcularProximoEnvio(agendamento);

        await supabase
          .from('relatorios_agendados')
          .update({ proximo_envio: proximoEnvio.toISOString() })
          .eq('id', agendamento.id);

        return {
          id: agendamento.id,
          nome: agendamento.nome,
          status: 'processado',
          resultado,
          proximo_envio: proximoEnvio,
        };
      } catch (agendamentoError) {
        const msg = agendamentoError instanceof Error ? agendamentoError.message : 'Erro desconhecido';
        console.error(`Erro no agendamento ${agendamento.id}:`, msg);
        await supabase.from('log_envio_relatorios').insert({
          agendamento_id: agendamento.id,
          status: 'erro',
          mensagem: msg,
        });
        return { id: agendamento.id, nome: agendamento.nome, status: 'erro', erro: msg };
      }
    };

    for (let i = 0; i < lista.length; i += CONCURRENCY) {
      const batch = lista.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(processarUm));
      resultados.push(...results);
    }

    return new Response(JSON.stringify({
      success: true,
      processados: resultados.length,
      resultados,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    try { captureException(error, { fn: 'processar-agendamentos' }); } catch { /* noop */ }
    return new Response(JSON.stringify({ success: false, error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function verificarExecucao(agendamento: Record<string, unknown>, agora: Date): boolean {
  const horaEnvio = agendamento.hora_envio as string;
  if (!horaEnvio) return false;
  const [hora, minuto] = horaEnvio.split(':').map(Number);

  const horaAtual = agora.getHours();
  const minutoAtual = agora.getMinutes();

  if (Math.abs(horaAtual - hora) > 0 || Math.abs(minutoAtual - minuto) > 30) {
    return false;
  }

  const frequencia = agendamento.frequencia as string;
  const diaSemana = agora.getDay();
  const diaMes = agora.getDate();

  switch (frequencia) {
    case 'diario':
      return true;
    case 'semanal':
      return diaSemana === (agendamento.dia_semana as number);
    case 'mensal':
      return diaMes === (agendamento.dia_mes as number);
    default:
      return false;
  }
}

function calcularProximoEnvio(agendamento: Record<string, unknown>): Date {
  const agora = new Date();
  const horaEnvio = agendamento.hora_envio as string;
  const [hora, minuto] = horaEnvio.split(':').map(Number);

  const proximo = new Date(agora);
  proximo.setHours(hora, minuto, 0, 0);

  const frequencia = agendamento.frequencia as string;

  switch (frequencia) {
    case 'diario':
      proximo.setDate(proximo.getDate() + 1);
      break;
    case 'semanal': {
      const diaSemanaAlvo = agendamento.dia_semana as number;
      const diasAteProximo = (diaSemanaAlvo - agora.getDay() + 7) % 7 || 7;
      proximo.setDate(proximo.getDate() + diasAteProximo);
      break;
    }
    case 'mensal': {
      const diaMesAlvo = agendamento.dia_mes as number;
      proximo.setMonth(proximo.getMonth() + 1);
      proximo.setDate(diaMesAlvo);
      break;
    }
  }

  return proximo;
}
