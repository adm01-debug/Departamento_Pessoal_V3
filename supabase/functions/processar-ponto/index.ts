import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  beginIdempotency,
  completeIdempotency,
  extractIdempotencyKey,
  failIdempotency,
} from '../_shared/idempotency.ts';
import { integrityHash } from '../_shared/integrityHash.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    });
  }

  try {
    // CSRF fail-closed
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    // JWT auth obrigatória
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Autenticação obrigatória', code: 'UNAUTHORIZED' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
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
      return new Response(JSON.stringify({ error: 'Sessão inválida', code: 'UNAUTHORIZED' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let body: any;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    body = _pb;

    const { colaboradorId, empresaId, data: dataRegistro } = body ?? {};
    if (!colaboradorId || !empresaId) {
      return new Response(JSON.stringify({ error: 'colaboradorId e empresaId obrigatórios' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Tenant scope: user must belong to empresa
    const [{ data: belongs }, { data: isAdm }] = await Promise.all([
      supabase.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresaId }),
      supabase.rpc('is_admin', { _user_id: userId }),
    ]);
    if (!belongs && !isAdm) {
      return new Response(JSON.stringify({ error: 'Sem acesso a esta empresa', code: 'FORBIDDEN' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `proc-ponto:${userId}`, limit: 120, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const dataRef = dataRegistro || new Date().toISOString().split('T')[0];

    // Idempotência transacional
    const idemKey = extractIdempotencyKey(req, body);
    const idem = await beginIdempotency(supabase, {
      endpoint: 'processar-ponto',
      key: idemKey,
      requestBody: { colaboradorId, empresaId, data: dataRef },
      empresaId,
      userId,
    });
    if (idem.replay) return idem.replay;
    if (idem.conflict) return idem.conflict;

    try {
      const { data: batidas, error: bErr } = await supabase
        .from('batidas_ponto')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .eq('data', dataRef)
        .order('ordem', { ascending: true });

      if (bErr) throw bErr;

      if (!batidas || batidas.length === 0) {
        const empty = {
          success: true,
          data: dataRef,
          status: 'sem_registro',
          horas_trabalhadas: '00:00',
          horas_extras: '00:00',
          atraso: 0,
          integrity_hash: await integrityHash({ colaboradorId, dataRef, batidas: 0 }),
        };
        await completeIdempotency(supabase, idem.id, 200, empty);
        return new Response(JSON.stringify(empty), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: config } = await supabase
        .from('jornadas')
        .select('*')
        .eq('empresa_id', empresaId)
        .limit(1)
        .maybeSingle();

      const jornadaMinutos = config?.carga_horaria_diaria ? parseFloat(config.carga_horaria_diaria) * 60 : 480;
      const tolerancia = config?.tolerancia_minutos || 10;

      const timeToMin = (t: string): number => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + (m || 0);
      };

      let totalMinutos = 0;
      for (let i = 0; i < batidas.length - 1; i += 2) {
        const entrada = timeToMin(batidas[i].hora);
        const saida = batidas[i + 1] ? timeToMin(batidas[i + 1].hora) : 0;
        if (saida > entrada) totalMinutos += saida - entrada;
      }

      const primeiraEntrada = batidas[0]?.hora ? timeToMin(batidas[0].hora) : 0;
      const horaInicioJornada = config?.hora_inicio ? timeToMin(config.hora_inicio) : 480;
      const atrasoMin = Math.max(0, primeiraEntrada - horaInicioJornada - tolerancia);
      const extrasMin = Math.max(0, totalMinutos - jornadaMinutos - tolerancia);
      const faltaMin = Math.max(0, jornadaMinutos - totalMinutos);

      const fmt = (m: number) =>
        `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const hTrab = fmt(totalMinutos);
      const hExtras = fmt(extrasMin);
      const hFalta = fmt(faltaMin);

      const registro = {
        colaborador_id: colaboradorId,
        empresa_id: empresaId,
        data: dataRef,
        entrada_1: batidas[0]?.hora || null,
        saida_1: batidas[1]?.hora || null,
        entrada_2: batidas[2]?.hora || null,
        saida_2: batidas[3]?.hora || null,
        horas_trabalhadas: hTrab,
        horas_extras: hExtras,
        horas_falta: hFalta,
        atraso_minutos: atrasoMin,
        status: batidas.length >= 4 ? 'completo' : 'incompleto',
      };

      const { error: uErr } = await supabase
        .from('registros_ponto')
        .upsert(registro, { onConflict: 'colaborador_id,data' });
      if (uErr) throw uErr;

      if (extrasMin > 0) {
        await supabase.from('banco_horas').insert({
          colaborador_id: colaboradorId,
          empresa_id: empresaId,
          data: dataRef,
          tipo: 'credito',
          horas: hExtras,
          motivo: 'Horas extras processadas automaticamente',
        });
      }

      const auditHash = await integrityHash({
        colaborador_id: colaboradorId,
        empresa_id: empresaId,
        data: dataRef,
        batidas: batidas.length,
        horas_trabalhadas_min: totalMinutos,
        horas_extras_min: extrasMin,
        horas_falta_min: faltaMin,
        atraso_min: atrasoMin,
        status: registro.status,
      });

      const responseBody = {
        success: true,
        data: dataRef,
        batidas: batidas.length,
        horas_trabalhadas: hTrab,
        horas_extras: hExtras,
        horas_falta: hFalta,
        atraso_minutos: atrasoMin,
        status: registro.status,
        integrity_hash: auditHash,
      };

      await completeIdempotency(supabase, idem.id, 200, responseBody);
      return new Response(JSON.stringify(responseBody), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      await failIdempotency(supabase, idem.id);
      throw error;
    }
  } catch (error) {
    try { captureException(error, { fn: 'processar-ponto' }); } catch { /* noop */ }
    return new Response(JSON.stringify({ error: 'Erro interno no processamento de ponto', code: 'INTERNAL_SERVER_ERROR' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
