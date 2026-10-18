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
  folga?: boolean; // grade marca o dia como não trabalhado → tudo é HE 100%
}

interface BatidaDia {
  data: string;
  hora: string;
  tipo?: string | null;
  ordem?: number | null;
}

// Resolve a jornada do colaborador para o dia (em ordem de precedência — os
// horários próprios do colaborador vencem qualquer grade da empresa):
// 1) campos próprios do colaborador (horario_entrada/saida/intervalo)
// 2) jornada_semanal do colaborador (assume 6 dias úteis CLT)
// 3) jornadas_horarios do dia da semana — inclusive dia_util=false = folga
//    configurada (trabalhar na folga → tudo vira HE 100%)
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
  // Grade do dia em jornadas_horarios — colunas reais: entrada, saida,
  // intervalo_inicio, intervalo_fim (o intervalo é um período, não minutos).
  // Consultada ANTES do fallback semanal para o sábado: é a única fonte
  // explícita de "sábado é folga" (dia_util=false). Inferir 5x2 de
  // jornada_semanal<=40 errava em escala 6x1 com <=40h (ex.: 36h em 6×6h).
  const { data: jh } = await supabase
    .from('jornadas_horarios')
    .select('entrada, saida, intervalo_inicio, intervalo_fim, dia_util, jornadas!inner(empresa_id, ativa)')
    .eq('dia_semana', diaSemana)
    .eq('jornadas.empresa_id', empresaId)
    .eq('jornadas.ativa', true)
    .limit(1)
    .maybeSingle();
  if (jh && jh.dia_util === false) {
    return { minutos: 0, entradaEsperada: null, intervaloMin: 0, toleranciaMin: tolerancia, folga: true };
  }
  if (jh?.entrada && jh?.saida && entradaColab === null) {
    let span = timeToMin(jh.saida) - timeToMin(jh.entrada);
    if (span <= 0) span += 1440;
    const int = jh.intervalo_inicio && jh.intervalo_fim
      ? Math.max(0, timeToMin(jh.intervalo_fim) - timeToMin(jh.intervalo_inicio))
      : 0;
    return {
      minutos: Math.max(0, span - int) || 480,
      entradaEsperada: timeToMin(jh.entrada),
      intervaloMin: int,
      toleranciaMin: tolerancia,
    };
  }
  const semanal = Number(colab?.jornada_semanal);
  if (Number.isFinite(semanal) && semanal > 0) {
    // Escala padrão CLT: 6 dias úteis (seg–sáb); domingo/feriado é DSR.
    // Sábado de folga só quando configurado explicitamente (dia_util=false
    // acima) ou quando nem a grade nem horário do colaborador existem para
    // o sábado e a escala é tipicamente 5x2 (semanal múltiplo de 8h até 40h).
    if (diaSemana === 6 && semanal <= 40 && semanal % 8 === 0 && !jh && entradaColab === null) {
      return { minutos: 0, entradaEsperada: null, intervaloMin: 0, toleranciaMin: tolerancia, folga: true };
    }
    return { minutos: Math.round(semanal * 60 / 6), entradaEsperada: entradaColab, intervaloMin: intervaloColab, toleranciaMin: tolerancia };
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
  incompleto: boolean;
  // Slots do espelho em ordem cronológica: cada turno é {entrada, saida} — a
  // saída pode pertencer ao dia seguinte (virada) e uma entrada pendente
  // aparece com saida=null (nunca ocupa o slot de saída de outro turno).
  slots: Array<{ entrada: BatidaDia; saida: BatidaDia | null }>;
}

// Apura um dia: pares entrada/saída com suporte a virada de dia,
// tolerância "tudo ou nada" (art. 58 §1º — variação ≤ tolerância é
// desconsiderada por inteiro; acima dela conta-se tudo), HE 100% em
// domingo/feriado e minutos noturnos (22h–05h).
// `batidas` já vem ordenada (data, ordem) e pode conter o primeiro batida do
// dia seguinte — só fechamos pares cuja ENTRADA pertence a `dataRef`; um par
// que atravessa meia-noite pertence inteiro ao dia da entrada.
const apurarDia = (
  batidas: BatidaDia[],
  dataRef: string,
  jornada: JornadaDia,
  ehDsr: boolean,
  diaEmAndamento: boolean,
): ResultadoDia => {
  const pares: Array<[number, number]> = [];
  const slots: Array<{ entrada: BatidaDia; saida: BatidaDia | null }> = [];
  let incompleto = false;
  for (let i = 0; i < batidas.length;) {
    const entrada = batidas[i];
    if (entrada.data !== dataRef) break; // batida seguinte abre jornada do próximo dia
    // Uma 'saida' na cabeça da fila nunca abre par — saída órfã/rejeitada
    // é quarentena, não entrada (senão 2 saídas viravam turno pagável).
    if (entrada.tipo === 'saida') {
      incompleto = true;
      i += 1;
      continue;
    }
    const saida = batidas[i + 1];
    // Uma batida marcada 'entrada' nunca fecha o turno anterior — sem isso a
    // entrada do turno seguinte vira saída fake de uma jornada aberta (turno
    // fictício de 10h+). O turno fica aberto e a batida abre par próprio.
    if (!saida || saida.tipo === 'entrada') {
      incompleto = true;
      slots.push({ entrada, saida: null });
      if (!saida || saida.data !== dataRef) break;
      i += 1;
      continue;
    }
    const e = timeToMin(entrada.hora);
    let s = timeToMin(saida.hora);
    if (saida.data !== entrada.data) {
      // Saída em dia seguinte soma a diferença real de dias — s>e sem o
      // +1440 apagava 24h de turnos longos (08:00→10:00 do dia seguinte
      // contava 2h). Turno > 24h segue flaggeado como inconsistente.
      const dias = Math.round((Date.parse(saida.data) - Date.parse(entrada.data)) / 86400000);
      s += Math.max(1, dias) * 1440;
      if (s - e > 1440) incompleto = true;
    } else if (s <= e) {
      // Saída no MESMO dia com hora <= entrada = dado inconsistente
      // (batida fora de ordem/ajuste). Não inventa turno de 20h+: a
      // entrada fica pendente para revisão E a saída rejeitada é
      // consumida — deixá-la na cabeça da fila a transformava em entrada
      // do próximo par (turno falso pagável).
      incompleto = true;
      slots.push({ entrada, saida: null });
      i += 2;
      continue;
    }
    pares.push([e, s]);
    slots.push({ entrada, saida });
    i += 2;
  }

  const totalMin = pares.reduce((acc, [e, s]) => acc + (s - e), 0);
  const noturnoMin = pares.reduce((acc, [e, s]) => acc + minutosNoturnos(e, s), 0);

  let atrasoMin = 0;
  if (jornada.entradaEsperada !== null && pares.length > 0) {
    const delta = pares[0][0] - jornada.entradaEsperada;
    if (delta > jornada.toleranciaMin) atrasoMin = delta; // tudo ou nada
  }

  if (ehDsr) {
    // Domingo/feriado/folga trabalhado: tudo é HE 100% (DSR); sem falta/atraso.
    return { totalMin, extra50Min: 0, extra100Min: totalMin, noturnoMin, faltaMin: 0, atrasoMin: 0, incompleto, slots };
  }

  const brutoExtra = Math.max(0, totalMin - jornada.minutos);
  const extra50Min = brutoExtra > jornada.toleranciaMin ? brutoExtra : 0; // tudo ou nada
  // Jornada aberta no dia corrente ainda não configura falta — a saída pode
  // estar pendente. Dias passados com batida ímpar seguem com falta medida.
  const faltaMin = incompleto && diaEmAndamento ? 0 : Math.max(0, jornada.minutos - totalMin);
  return { totalMin, extra50Min, extra100Min: 0, noturnoMin, faltaMin, atrasoMin, incompleto, slots };
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
    const { requireRh, requireSelfOrRh } = await import('../_shared/authz.ts');
    if (lote) {
      // Lote altera o ponto de TODOS os colaboradores — só RH/admin.
      const authz = await requireRh(supabase, userId, empresaId, req);
      if (authz.denied) return authz.denied;
    } else {
      // Unitário: o próprio titular ou RH. Pertencer à empresa não basta —
      // sem isso um colega reprocessaria o ponto de outro.
      const { data: dono } = await supabase
        .from('colaboradores')
        .select('user_id')
        .eq('id', colaboradorId)
        .eq('empresa_id', empresaId)
        .maybeSingle();
      // Colaborador de OUTRA empresa (ou inexistente) não pode ser processado
      // pelo RH da empresa informada — sem isso o escopo de tenant era burlado.
      if (!dono) {
        return new Response(JSON.stringify({ error: 'Colaborador não encontrado nesta empresa', code: 'NOT_FOUND' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
        });
      }
      const authz = await requireSelfOrRh(supabase, userId, dono.user_id, empresaId, req);
      if (authz.denied) return authz.denied;
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

    // 'Hoje' no calendário das batidas (America/Sao_Paulo) — entre 21h e
    // meia-noite em BRT o dia UTC já virou e uma jornada aberta receberia
    // falta indevida se comparássemos com a data UTC.
    const hojeISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const addDia = (iso: string, dias: number) => {
      const d = new Date(`${iso}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + dias);
      return d.toISOString().split('T')[0];
    };

    const processarColaboradorDia = async (colabId: string, dataRef: string) => {
      // Virada de dia: a jornada pertence ao dia da ENTRADA. Se o dia anterior
      // fechou com batida ímpar, a primeira batida de hoje é a saída daquele
      // par — não abre par novo aqui. E a saída de um par aberto hoje pode
      // estar no dia seguinte.
      const dataAnt = addDia(dataRef, -1);
      const dataSeg = addDia(dataRef, 1);
      const [{ data: prevDia }, { data: batidasRaw, error: bErr }] = await Promise.all([
        // Ordem cronológica REAL = hora da batida (ajustes retroativos 671
        // recebem `ordem` sequencial de inserção, não a posição no dia).
        supabase.from('batidas_ponto').select('data,hora,tipo,ordem')
          .eq('colaborador_id', colabId).eq('data', dataAnt)
          .order('hora', { ascending: true })
          .order('ordem', { ascending: true }),
        supabase.from('batidas_ponto').select('*')
          .eq('colaborador_id', colabId)
          .in('data', [dataRef, dataSeg])
          .order('data', { ascending: true })
          .order('hora', { ascending: true })
          .order('ordem', { ascending: true }),
      ]);
      if (bErr) throw bErr;

      // Replay do pareamento de ontem com a MESMA regra de apurarDia (par
      // adjacente; entrada seguinte a entrada deixa a anterior pendente):
      // o que decide é se a ÚLTIMA batida de ontem ficou como entrada aberta —
      // contar entrada/saída separadamente não reproduz a regra.
      let abertaOntem = false;
      for (let i = 0; i < (prevDia ?? []).length;) {
        const nx = prevDia![i + 1];
        if (!nx || nx.tipo === 'entrada') { abertaOntem = true; i += 1; continue; }
        abertaOntem = false; i += 2;
      }

      let batidas = batidasRaw ?? [];
      const batidasDoDia = batidas.filter((b: any) => b.data === dataRef);
      if (batidasDoDia.length === 0) {
        return {
          colaborador_id: colabId,
          data: dataRef,
          status: 'sem_registro',
          horas_trabalhadas: '00:00',
          horas_extras: '00:00',
        };
      }
      // Descarta a primeira batida do dia quando ela fecha o turno aberto de
      // ontem (mesma decisão que a apuração de ontem toma). Batida marcada
      // 'entrada' nunca é saída de ontem — abre par novo aqui.
      if (
        abertaOntem &&
        batidas[0]?.data === dataRef &&
        batidas[0]?.tipo !== 'entrada'
      ) {
        batidas = batidas.slice(1);
        // Re-ancora: a lista ainda pode abrir par novo a partir do restante.
      }

      const { data: colab } = await supabase
        .from('colaboradores')
        .select('horario_entrada, horario_saida, intervalo_minutos, jornada_semanal')
        .eq('id', colabId)
        .maybeSingle();

      const diaSemana = new Date(`${dataRef}T12:00:00`).getDay();
      const jornada = await resolverJornada(supabase, empresaId, colab, diaSemana);
      // DSR = domingo, feriado ou folga marcada na grade (dia_util=false).
      const ehDsr = diaSemana === 0 || feriados.has(dataRef) || jornada.folga === true;
      const r = apurarDia(batidas, dataRef, jornada, ehDsr, dataRef === hojeISO);

      const extraTotalMin = r.extra50Min + r.extra100Min;
      let heBancoMin = 0;
      // Compensação: extras vão ao banco quando a empresa tem acordo ativo —
      // nesse caso não são pagas na folha (fim da dupla contagem).
      if (bancoAtivo) {
        heBancoMin = extraTotalMin;
      }
      const pago50 = bancoAtivo ? 0 : r.extra50Min;
      const pago100 = bancoAtivo ? 0 : r.extra100Min;

      // Espelho: cada slot é um turno {entrada, saida|null} em ORDEM
      // CRONOLÓGICA — a saída de um turno que cruza meia-noite aparece no dia
      // da entrada, e entrada pendente mostra saida=null (os painéis de
      // inconsistência detectam turno aberto exatamente por esse null; não
      // reordenar). O registro só tem 3 pares de colunas: no overflow raro,
      // os turnos mais antigos ficam visíveis primeiro.
      const s = r.slots.slice(0, 3);
      const registro = {
        colaborador_id: colabId,
        empresa_id: empresaId,
        data: dataRef,
        entrada_1: s[0]?.entrada?.hora || null,
        saida_1: s[0]?.saida?.hora || null,
        entrada_2: s[1]?.entrada?.hora || null,
        saida_2: s[1]?.saida?.hora || null,
        entrada_3: s[2]?.entrada?.hora || null,
        saida_3: s[2]?.saida?.hora || null,
        horas_trabalhadas: fmt(r.totalMin),
        horas_extras: fmt(extraTotalMin),
        horas_extras_50: fmt(pago50),
        horas_extras_100: fmt(pago100),
        horas_noturnas: fmt(r.noturnoMin),
        he_banco_horas: fmt(heBancoMin),
        horas_falta: fmt(r.faltaMin),
        atraso_minutos: r.atrasoMin,
        // Sem nenhum turno do dia (ex.: a única batida fechou o turno de
        // ontem) o registro não é 'completo' — é ausência de jornada própria.
        // Overflow de turnos (>3 slots) também marca 'incompleto': as colunas
        // não representam todas as batidas — sinaliza revisão manual em vez de
        // omitir silenciosamente um turno fechado (horas seguem contadas).
        status: s.length === 0
          ? 'sem_registro'
          : (r.incompleto || r.slots.length > 3 ? 'incompleto' : 'completo'),
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
        const dataRef = dataRegistro || hojeISO;
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
