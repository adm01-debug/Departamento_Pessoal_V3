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

const MINUTO = 1;
const NOITE_INI = 22 * 60; // 22:00
const NOITE_FIM = 5 * 60; // 05:00 (dia seguinte)

const timeToMin = (t: string): number => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};

const fmt = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Minutos trabalhados dentro do período noturno legal (22h–05h) de um
// intervalo [ini, fim) em minutos absolutos (fim pode passar de 1440).
const minutosNoturnos = (ini: number, fim: number): number => {
  let total = 0;
  for (let s = ini; s < fim; s++) {
    const h = ((s % 1440) + 1440) % 1440;
    if (h >= NOITE_INI || h < NOITE_FIM) total += MINUTO;
  }
  return total;
};

interface JornadaDia {
  minutos: number;
  entradaEsperada: number | null; // minutos
  intervaloMin: number;
  toleranciaMin: number;
}

// Resolve a jornada do colaborador para o dia:
// 1) campos próprios do colaborador (horario_entrada/saida/intervalo)
// 2) jornada_semanal do colaborador (assume 6 dias úteis CLT)
// 3) jornadas_horarios do dia da semana (jornada ativa da empresa)
// 4) primeira jornada ativa da empresa
// 5) fallback legal 8h + tolerância 10min
const resolverJornada = async (
  supabase: any,
  empresaId: string,
  colab: any,
  diaSemana: number,
): Promise<JornadaDia> => {
  const tolerancia = 10;
  const entradaColab = colab?.horario_entrada ? timeToMin(colab.horario_entrada) : null;
  const saidaColab = colab?.horario_saida ? timeToMin(colab.horario_saida) : null;
  const intervaloColab = Number(colab?.intervalo_minutos) || 0;
  if (entradaColab !== null && saidaColab !== null) {
    let span = saidaColab - entradaColab;
    if (span <= 0) span += 1440; // turno cruza meia-noite
    const minutos = Math.max(0, span - intervaloColab);
    if (minutos > 0) {
      return { minutos, entradaEsperada: entradaColab, intervaloMin: intervaloColab, toleranciaMin: tolerancia };
    }
  }
  const semanal = Number(colab?.jornada_semanal);
  if (Number.isFinite(semanal) && semanal > 0) {
    // Escala padrão CLT: 6 dias úteis (seg–sáb); domingo/feriado é DSR.
    return { minutos: Math.round(semanal * 60 / 6), entradaEsperada: entradaColab, intervaloMin: intervaloColab, toleranciaMin: tolerancia };
  }
  const { data: jh } = await supabase
    .from('jornadas_horarios')
    .select('horario_entrada, horario_saida, intervalo_minutos, jornadas!inner(empresa_id, ativa)')
    .eq('dia_semana', diaSemana)
    .eq('jornadas.empresa_id', empresaId)
    .eq('jornadas.ativa', true)
    .limit(1)
    .maybeSingle();
  if (jh?.horario_entrada && jh?.horario_saida) {
    let span = timeToMin(jh.horario_saida) - timeToMin(jh.horario_entrada);
    if (span <= 0) span += 1440;
    const int = Number(jh.intervalo_minutos) || 0;
    return {
      minutos: Math.max(0, span - int) || 480,
      entradaEsperada: timeToMin(jh.horario_entrada),
      intervaloMin: int,
      toleranciaMin: tolerancia,
    };
  }
  const { data: j } = await supabase
    .from('jornadas')
    .select('horario_entrada, horario_saida, intervalo_minutos, carga_horaria_semanal')
    .eq('empresa_id', empresaId)
    .eq('ativa', true)
    .limit(1)
    .maybeSingle();
  if (j) {
    if (j.horario_entrada && j.horario_saida) {
      let span = timeToMin(j.horario_saida) - timeToMin(j.horario_entrada);
      if (span <= 0) span += 1440;
      const int = Number(j.intervalo_minutos) || 0;
      return {
        minutos: Math.max(0, span - int) || 480,
        entradaEsperada: timeToMin(j.horario_entrada),
        intervaloMin: int,
        toleranciaMin: tolerancia,
      };
    }
    const sem = Number(j.carga_horaria_semanal);
    if (Number.isFinite(sem) && sem > 0) {
      return { minutos: Math.round(sem * 60 / 6), entradaEsperada: null, intervaloMin: 0, toleranciaMin: tolerancia };
    }
  }
  return { minutos: 480, entradaEsperada: 480, intervaloMin: 60, toleranciaMin: tolerancia };
};

interface ResultadoDia {
  totalMin: number;
  extra50Min: number;
  extra100Min: number;
  noturnoMin: number;
  faltaMin: number;
  atrasoMin: number;
}

// Apura um dia: pares entrada/saída com suporte a virada de dia,
// tolerância "tudo ou nada" (art. 58 §1º — variação ≤ tolerância é
// desconsiderada por inteiro; acima dela conta-se tudo), HE 100% em
// domingo/feriado e minutos noturnos (22h–05h).
const apurarDia = (
  batidas: Array<{ hora: string }>,
  jornada: JornadaDia,
  ehDsr: boolean,
): ResultadoDia => {
  const pares: Array<[number, number]> = [];
  for (let i = 0; i < batidas.length - 1; i += 2) {
    const entrada = timeToMin(batidas[i].hora);
    let saida = timeToMin(batidas[i + 1].hora);
    if (saida <= entrada) saida += 1440; // saída no dia seguinte (turno noturno)
    pares.push([entrada, saida]);
  }

  const totalMin = pares.reduce((acc, [e, s]) => acc + (s - e), 0);
  const noturnoMin = pares.reduce((acc, [e, s]) => acc + minutosNoturnos(e, s), 0);

  let atrasoMin = 0;
  if (jornada.entradaEsperada !== null && pares.length > 0) {
    const delta = pares[0][0] - jornada.entradaEsperada;
    if (delta > jornada.toleranciaMin) atrasoMin = delta; // tudo ou nada
  }

  if (ehDsr) {
    // Domingo/feriado trabalhado: tudo é HE 100% (DSR); sem falta/atraso.
    return { totalMin, extra50Min: 0, extra100Min: totalMin, noturnoMin, faltaMin: 0, atrasoMin };
  }

  const brutoExtra = Math.max(0, totalMin - jornada.minutos);
  const extra50Min = brutoExtra > jornada.toleranciaMin ? brutoExtra : 0; // tudo ou nada
  const faltaMin = Math.max(0, jornada.minutos - totalMin);
  return { totalMin, extra50Min, extra100Min: 0, noturnoMin, faltaMin, atrasoMin };
};

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

    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    const body = _pb as any;

    // Dois modos: unitário {colaboradorId, empresaId, data} ou lote
    // {empresaId, dataInicio, dataFim} (botão "Processar Servidor").
    const { colaboradorId, empresaId, data: dataRegistro, dataInicio, dataFim } = body ?? {};
    const lote = !colaboradorId && dataInicio && dataFim;
    if (!empresaId || (!colaboradorId && !lote)) {
      return new Response(JSON.stringify({ error: 'empresaId + (colaboradorId e data) ou (dataInicio e dataFim) obrigatórios' }), {
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
    if (!rl.allowed) return rateLimitResponse(rl, req);

    // Idempotência transacional
    const idemKey = extractIdempotencyKey(req, body);
    const idem = await beginIdempotency(supabase, {
      endpoint: 'processar-ponto',
      key: idemKey,
      requestBody: { colaboradorId, empresaId, data: dataRegistro, dataInicio, dataFim },
      empresaId,
      userId,
      request: req,
    });
    if (idem.replay) return idem.replay;
    if (idem.conflict) return idem.conflict;

    // Banco de horas ativo? (config por empresa — acordo individual/coletivo)
    const { data: bhCfg } = await supabase
      .from('banco_horas_config')
      .select('acordo_tipo, compensacao_automatica, prazo_meses')
      .eq('empresa_id', empresaId)
      .limit(1)
      .maybeSingle();
    const bancoAtivo = !!(bhCfg && bhCfg.acordo_tipo && bhCfg.compensacao_automatica !== false);

    // Feriados da empresa (ou globais) dentro do período processado.
    const { data: feriadosRows } = await supabase
      .from('feriados')
      .select('data')
      .or(`empresa_id.eq.${empresaId},empresa_id.is.null`);
    const feriados = new Set((feriadosRows ?? []).map((f: any) => f.data));

    const processarColaboradorDia = async (colabId: string, dataRef: string) => {
      const { data: batidas, error: bErr } = await supabase
        .from('batidas_ponto')
        .select('*')
        .eq('colaborador_id', colabId)
        .eq('data', dataRef)
        .order('ordem', { ascending: true });
      if (bErr) throw bErr;

      if (!batidas || batidas.length === 0) {
        return {
          colaborador_id: colabId,
          data: dataRef,
          status: 'sem_registro',
          horas_trabalhadas: '00:00',
          horas_extras: '00:00',
        };
      }

      const { data: colab } = await supabase
        .from('colaboradores')
        .select('horario_entrada, horario_saida, intervalo_minutos, jornada_semanal')
        .eq('id', colabId)
        .maybeSingle();

      const diaSemana = new Date(`${dataRef}T12:00:00`).getDay();
      const ehDsr = diaSemana === 0 || feriados.has(dataRef);
      const jornada = await resolverJornada(supabase, empresaId, colab, diaSemana);
      const r = apurarDia(batidas, jornada, ehDsr);

      const extraTotalMin = r.extra50Min + r.extra100Min;
      let heBancoMin = 0;
      // Compensação: extras vão ao banco quando a empresa tem acordo ativo —
      // nesse caso não são pagas na folha (fim da dupla contagem).
      if (bancoAtivo) {
        heBancoMin = extraTotalMin;
      }
      const pago50 = bancoAtivo ? 0 : r.extra50Min;
      const pago100 = bancoAtivo ? 0 : r.extra100Min;

      const registro = {
        colaborador_id: colabId,
        empresa_id: empresaId,
        data: dataRef,
        entrada_1: batidas[0]?.hora || null,
        saida_1: batidas[1]?.hora || null,
        entrada_2: batidas[2]?.hora || null,
        saida_2: batidas[3]?.hora || null,
        entrada_3: batidas[4]?.hora || null,
        saida_3: batidas[5]?.hora || null,
        horas_trabalhadas: fmt(r.totalMin),
        horas_extras: fmt(extraTotalMin),
        horas_extras_50: fmt(pago50),
        horas_extras_100: fmt(pago100),
        horas_noturnas: fmt(r.noturnoMin),
        he_banco_horas: fmt(heBancoMin),
        horas_falta: fmt(r.faltaMin),
        atraso_minutos: r.atrasoMin,
        status: batidas.length >= 4 ? 'completo' : 'incompleto',
      };

      const { data: regRow, error: uErr } = await supabase
        .from('registros_ponto')
        .upsert(registro, { onConflict: 'colaborador_id,data' })
        .select('id')
        .maybeSingle();
      if (uErr) throw uErr;

      // Crédito no banco de horas idempotente: um único crédito automático
      // por (colaborador, data) — reprocesso atualiza o valor em vez de
      // duplicar lançamentos.
      const MOTIVO_AUTO = 'Horas extras processadas automaticamente';
      const { data: existente } = await supabase
        .from('banco_horas')
        .select('id')
        .eq('colaborador_id', colabId)
        .eq('data', dataRef)
        .eq('tipo', 'credito')
        .eq('motivo', MOTIVO_AUTO)
        .limit(1)
        .maybeSingle();
      if (heBancoMin > 0) {
        if (existente) {
          await supabase.from('banco_horas').update({ horas: fmt(heBancoMin) }).eq('id', existente.id);
        } else {
          await supabase.from('banco_horas').insert({
            colaborador_id: colabId,
            empresa_id: empresaId,
            data: dataRef,
            tipo: 'credito',
            horas: fmt(heBancoMin),
            motivo: MOTIVO_AUTO,
            registro_ponto_id: regRow?.id ?? null,
          });
        }
      } else if (existente) {
        // Reprocesso que zerou o extra remove o crédito automático anterior.
        await supabase.from('banco_horas').delete().eq('id', existente.id);
      }

      return {
        colaborador_id: colabId,
        data: dataRef,
        batidas: batidas.length,
        horas_trabalhadas: registro.horas_trabalhadas,
        horas_extras: registro.horas_extras,
        horas_extras_50: registro.horas_extras_50,
        horas_extras_100: registro.horas_extras_100,
        horas_noturnas: registro.horas_noturnas,
        he_banco_horas: registro.he_banco_horas,
        horas_falta: registro.horas_falta,
        atraso_minutos: r.atrasoMin,
        status: registro.status,
      };
    };

    try {
      let responseBody: Record<string, unknown>;

      if (lote) {
        // Modo lote: todos os colaboradores ativos da empresa, cada dia do
        // período com batidas. Limite defensivo de 31 dias por chamada.
        const ini = new Date(`${dataInicio}T00:00:00`);
        const fim = new Date(`${dataFim}T00:00:00`);
        const dias = Math.round((fim.getTime() - ini.getTime()) / 86400000) + 1;
        if (!Number.isFinite(dias) || dias < 1 || dias > 31) {
          const bad = { error: 'Período inválido (máx. 31 dias)', code: 'BAD_REQUEST' };
          await failIdempotency(supabase, idem.id);
          return new Response(JSON.stringify(bad), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: colabs, error: cErr } = await supabase
          .from('colaboradores')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('status', 'ativo');
        if (cErr) throw cErr;

        const diasProcessados: Array<Record<string, unknown>> = [];
        for (let d = 0; d < dias; d++) {
          const dt = new Date(ini.getTime() + d * 86400000);
          const dataRef = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          for (const c of colabs ?? []) {
            const r = await processarColaboradorDia(c.id, dataRef);
            if (r.status !== 'sem_registro') diasProcessados.push(r);
          }
        }

        responseBody = {
          success: true,
          mode: 'lote',
          data_inicio: dataInicio,
          data_fim: dataFim,
          colaboradores: colabs?.length ?? 0,
          dias_processados: diasProcessados.length,
          integrity_hash: await integrityHash({ empresaId, dataInicio, dataFim, dias: diasProcessados.length }),
        };
      } else {
        const dataRef = dataRegistro || new Date().toISOString().split('T')[0];
        const r = await processarColaboradorDia(colaboradorId, dataRef);
        responseBody = {
          success: true,
          ...r,
          integrity_hash: await integrityHash({ colaboradorId, dataRef, ...r }),
        };
      }

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
