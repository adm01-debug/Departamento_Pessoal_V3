// Onda 25 — Hardening crítico do motor de folha:
// • JWT obrigatório + CSRF fail-closed
// • Tenant scope estrito (user_belongs_to_empresa + is_admin fallback)
// • Bloqueio de recálculo de folha FECHADA
// • Chunking (batches de 500 colaboradores) para evitar OOM
// • Precisão financeira via helper round2 + banker-safe
// • Auditoria PAYROLL_CALC em audit_log
// • Sem vazamento de PII em erros; captureException em falhas
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateRequest, corsHeaders, createErrorResponse } from '../_shared/contract.ts';
import { calcularFolhaSchema } from '../_shared/schemas/common.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { requireRh, type AdminClient } from '../_shared/authz.ts';
import { captureException } from '../_shared/sentry.ts';
import { beginIdempotency, completeIdempotency, failIdempotency, extractIdempotencyKey } from '../_shared/idempotency.ts';
import { integrityHash as computeIntegrityHash } from '../_shared/integrityHash.ts';
import { calcularINSS } from '../_shared/inss.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';


const FAIXAS_IRRF = [
  { limite: 2259.20, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
];

const DEDUCAO_SIMPLIFICADA_IRRF = 564.80; // Lei 14.663/2023
const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const CHUNK_SIZE = 500;
const MAX_COLABORADORES = 50_000;
const PAYROLL_TYPE = 'mensal';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
// IN RFB 2110/2022: contribuições previdenciárias e IR truncam centavos
const trunc2 = (n: number): number => Math.trunc(n * 100) / 100;

// Interval do Postgres ("HH:MM:SS" ou {hours,minutes,seconds}) → horas decimais.
// Mesmo parser do front (pontoIntegracaoUtils.intervalToDecimal).
const intervalParaHoras = (v: unknown): number => {
  if (!v) return 0;
  if (typeof v === 'string') {
    const parts = v.split(':');
    if (parts.length >= 2) {
      return (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60 + (parseInt(parts[2], 10) || 0) / 3600;
    }
  }
  if (typeof v === 'object') {
    const o = v as { hours?: number; minutes?: number; seconds?: number };
    return (o.hours || 0) + (o.minutes || 0) / 60 + (o.seconds || 0) / 3600;
  }
  return 0;
};



function calcIRRF(bruto: number, dependentes = 0, competencia: string): number {
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const inss = calcularINSS(bruto, competencia);
  const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF;
  const baseSimplificada = bruto - DEDUCAO_SIMPLIFICADA_IRRF;
  const base = Math.max(0, Math.min(baseLegal, baseSimplificada));
  if (base <= 0) return 0;
  for (const f of FAIXAS_IRRF) {
    if (base <= f.limite) return Math.max(0, trunc2(base * f.aliquota - f.deducao));
  }
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let idempotencyId: string | undefined;
  let admin: ReturnType<typeof createClient<Database>> | undefined;

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient<any>(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    const userId = userData.user.id;

    const { data, errorResponse } = await validateRequest(req, calcularFolhaSchema);
    if (errorResponse) return errorResponse;
    const { empresa_id, competencia } = data!;
    // Intervalo de datas da competência (AAAA-MM) para a apuração de ponto.
    const [anoComp, mesComp] = competencia.split('-').map(Number);
    const dataInicio = `${competencia}-01`;
    const dataFim = new Date(Date.UTC(anoComp, mesComp, 0)).toISOString().slice(0, 10);
    const diasNoMes = Number(dataFim.slice(8, 10));
    // Extrai a chave de idempotência DEPOIS de parsear o body — permite fallback via body
    // (alguns navegadores/proxies removem headers custom em preflights antigos).
    const idempotencyKey = extractIdempotencyKey(req, data);

    admin = createClient<Database>(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit — cálculo de folha é pesado: 20 req / min / usuário
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `calc-folha:${userId}`, limit: 20, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl, req);

    // Tenant scope (antes de qualquer efeito colateral / idempotência)
    // Papel, não apenas vínculo: o padrão anterior (`!belongs && !isAdmin`)
    // era um OU — pertencer à empresa já bastava, e o is_admin apenas somava
    // o admin global. Qualquer colaborador autenticado passava.
    {
      // AdminClient is deliberately untyped over Database (see authz.ts);
      // this narrows the strictly-typed client for that shared boundary.
      const authz = await requireRh(admin as unknown as AdminClient, userId, empresa_id, req);
      if (authz.denied) return authz.denied;
    }
    // Idempotência — Onda 41
    // Payload canonicalizado (empresa_id + competencia + userId) evita replay cruzado entre usuários.
    const idem = await beginIdempotency(admin, {
      endpoint: 'calcular-folha',
      key: idempotencyKey,
      requestBody: { empresa_id, competencia, user_id: userId },
      empresaId: empresa_id,
      userId,
      request: req,
    });

    // Auditoria detalhada de conflito/replay/duplicidade de Idempotency-Key.
    // Best-effort — falha no audit_log NUNCA bloqueia a resposta ao cliente.
    if (idem.reason && idem.reason !== 'NEW') {
      try {
        await admin.from('audit_log').insert({
          tabela: 'idempotency_keys',
          registro_id: idem.existingId ?? idem.id ?? crypto.randomUUID(),
          acao: idem.reason === 'REPLAY' ? 'IDEMPOTENCY_REPLAY' : 'IDEMPOTENCY_CONFLICT',
          user_id: userId,
          dados_novos: {
            endpoint: 'calcular-folha',
            empresa_id,
            competencia,
            key_hash: idem.keyHash ?? null,
            request_hash: idem.requestHash ?? null,
            existing_id: idem.existingId ?? null,
            outcome: idem.replay ? 'replay_served' : idem.conflict ? 'conflict_rejected' : 'retry_allowed',
            timestamp: new Date().toISOString(),
          },
        });
      } catch { /* noop */ }
    }

    if (idem.replay) return idem.replay;
    if (idem.conflict) return idem.conflict;
    idempotencyId = idem.id;


    // Bloqueia recálculo de folha em estados terminais (fechada / aprovada / transmitida ao eSocial).
    // Estes estados representam consolidação contábil ou envio externo — qualquer recálculo
    // exigiria reabrir a folha via fluxo auditado (`reabrir-folha`).
    const BLOCKED_STATUSES = new Set(['fechada', 'aprovada', 'transmitida', 'homologada']);
    const { data: folhaExistente } = await admin
      .from('folhas_pagamento')
      .select('id, status, version, esocial_status')
      .eq('empresa_id', empresa_id)
      .eq('competencia', competencia)
      .eq('tipo', PAYROLL_TYPE)
      .maybeSingle();

    if (folhaExistente && BLOCKED_STATUSES.has(String(folhaExistente.status))) {
      // Auditoria bloqueante (best-effort) — registra tentativa negada de recálculo.
      try {
        await admin.from('audit_log').insert({
          tabela: 'folhas_pagamento',
          registro_id: folhaExistente.id,
          acao: 'PAYROLL_CALC_BLOCKED',
          user_id: userId,
          dados_novos: {
            empresa_id,
            competencia,
            status_atual: folhaExistente.status,
            esocial_status: folhaExistente.esocial_status ?? null,
            version: folhaExistente.version ?? null,
            idempotency_id: idempotencyId ?? null,
            reason: 'PAYROLL_LOCKED',
          },
        });
      } catch { /* auditoria não-bloqueante para o retorno de erro */ }

      await failIdempotency(admin, idempotencyId);
      return new Response(
        JSON.stringify({
          error: `Folha em estado '${folhaExistente.status}' — recálculo bloqueado. Reabra a folha antes de recalcular.`,
          code: 'PAYROLL_LOCKED',
          folha_id: folhaExistente.id,
          status_atual: folhaExistente.status,
          competencia,
          reabrir_endpoint: 'reabrir-folha',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }


    // Contagem prévia p/ hard-cap
    const { count: totalColabs } = await admin
      .from('colaboradores')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresa_id)
      .eq('status', 'ativo');

    if (!totalColabs) {
      await failIdempotency(admin, idempotencyId);
      return createErrorResponse('Nenhum colaborador ativo', 404, 'NOT_FOUND');
    }
    if (totalColabs > MAX_COLABORADORES) {
      await failIdempotency(admin, idempotencyId);
      return createErrorResponse(`Limite excedido (${MAX_COLABORADORES})`, 413, 'PAYLOAD_TOO_LARGE');
    }

    // DSR real da competência: domingos + feriados (empresa ou nacionais) —
    // mesmo cômputo do cálculo em lote do front (calculoLoteService).
    const { data: feriadosMes, error: feriadosErr } = await admin
      .from('feriados')
      .select('data, empresa_id')
      .gte('data', dataInicio)
      .lte('data', dataFim);
    if (feriadosErr) throw feriadosErr;
    // Set único de datas DSR — feriado em domingo conta uma vez só.
    const dsrDatas = new Set<string>(
      (feriadosMes ?? [])
        .filter((f) => f.empresa_id === null || f.empresa_id === empresa_id)
        .map((f) => f.data),
    );
    for (let d = 1; d <= diasNoMes; d++) {
      if (new Date(Date.UTC(anoComp, mesComp - 1, d)).getUTCDay() === 0) {
        dsrDatas.add(`${competencia}-${String(d).padStart(2, '0')}`);
      }
    }
    const domingosFeriados = dsrDatas.size;
    const diasUteis = Math.max(0, diasNoMes - domingosFeriados);

    // Chunked fetch
    interface FolhaItemCalculado {
      colaborador_id: string;
      nome: string;
      cargo: string;
      salario_bruto: number;
      inss: number;
      irrf: number;
      fgts: number;
      total_descontos: number;
      salario_liquido: number;
    }
    const itens: FolhaItemCalculado[] = [];
    const eventosPorColaborador = new Map<string, Array<{ codigo: string; descricao: string; tipo: 'provento' | 'desconto'; valor: number }>>();
    const salarioBasePorColaborador = new Map<string, number>();
    const totais = { bruto: 0, descontos: 0, liquido: 0, fgts: 0, inss: 0, irrf: 0 };

    for (let offset = 0; offset < totalColabs; offset += CHUNK_SIZE) {
      const { data: colabs, error: e } = await admin
        .from('colaboradores')
        .select('id, nome_completo, salario_base, cargo, departamento, jornada_horas_mensais')
        .eq('empresa_id', empresa_id)
        .eq('status', 'ativo')
        .range(offset, offset + CHUNK_SIZE - 1);
      if (e) throw e;
      if (!colabs?.length) break;

      // Dependentes para fins de IRRF (public.dependentes.para_irrf) — uma
      // única query em lote por chunk, evita N+1 por colaborador.
      //
      // `para_irrf` replaced the long-retired `ir_dependente` column (see
      // 20251216164756_...sql / 20260724001000_fix_dependentes_missing_para_columns.sql).
      // This call was never updated: under the previous `createClient<any>`
      // typing PostgREST's "column ir_dependente does not exist" error was
      // silently discarded (`const { data: depsRows }` never read `error`),
      // so every payroll run counted zero IRRF dependents for every
      // employee, overwithholding IRRF for anyone with real dependents.
      // Now that `admin` is typed against the generated schema, this was
      // a compile error instead of a silent runtime one; also stopped
      // discarding the query's error going forward.
      const colabIds = colabs.map((c) => c.id);
      const { data: depsRows, error: depsErr } = await admin
        .from('dependentes')
        .select('colaborador_id')
        .in('colaborador_id', colabIds)
        .eq('para_irrf', true);
      if (depsErr) throw depsErr;
      const dependentesPorColaborador = new Map<string, number>();
      for (const d of depsRows ?? []) {
        const key = d.colaborador_id as string;
        dependentesPorColaborador.set(key, (dependentesPorColaborador.get(key) ?? 0) + 1);
      }

      // Apuração de ponto aprovada da competência (HE 50%/100%, adicional
      // noturno) — uma query em lote por chunk. Fonte: registros_ponto
      // aprovado (mesmo critério do cálculo em lote do front);
      // solicitacoes_hora_extra é só a pré-aprovação, não entra aqui para
      // não duplicar horas já apuradas.
      const { data: pontoRows, error: pontoErr } = await admin
        .from('registros_ponto')
        .select('colaborador_id, horas_extras, horas_extras_50, horas_extras_100, horas_noturnas, he_banco_horas')
        .eq('empresa_id', empresa_id)
        .eq('aprovado', true)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .in('colaborador_id', colabIds);
      if (pontoErr) throw pontoErr;
      const variaveisPorColaborador = new Map<string, { he50: number; he100: number; noturno: number }>();
      for (const r of pontoRows ?? []) {
        const acc = variaveisPorColaborador.get(r.colaborador_id) ?? { he50: 0, he100: 0, noturno: 0 };
        // Legado = colunas da onda 5 NULL (registro anterior a elas): o total
        // de horas_extras vira HE 50%, como o front faz. '00:00' gravado é
        // zero explícito, não legado — senão horas já enviadas ao banco de
        // horas seriam pagas de novo.
        const legado = r.horas_extras_50 === null && r.horas_extras_100 === null && r.he_banco_horas === null;
        if (legado) {
          acc.he50 += intervalParaHoras(r.horas_extras);
        } else {
          acc.he50 += intervalParaHoras(r.horas_extras_50);
          acc.he100 += intervalParaHoras(r.horas_extras_100);
        }
        acc.noturno += intervalParaHoras(r.horas_noturnas);
        variaveisPorColaborador.set(r.colaborador_id, acc);
      }

      for (const c of colabs) {
        const salarioBase = Number(c.salario_base) || 0;
        const jornadaInformada = Number(c.jornada_horas_mensais);
        const jornada = Number.isFinite(jornadaInformada) && jornadaInformada > 0 ? jornadaInformada : 220;
        const variaveis = variaveisPorColaborador.get(c.id) ?? { he50: 0, he100: 0, noturno: 0 };

        // Mesmas fórmulas do motor do front (trabalhista-base.ts +
        // folhaCalc.processar): HE a 50%/100% sobre a hora contratual,
        // adicional noturno 20% com hora reduzida (52min30s) e DSR só
        // sobre as HE. Tudo integra a base tributável (INSS/IRRF/FGTS).
        const valorHora = jornada > 0 ? salarioBase / jornada : 0;
        const he50Valor = trunc2(valorHora * 1.5 * variaveis.he50);
        const he100Valor = trunc2(valorHora * 2 * variaveis.he100);
        const noturnoValor = round2(valorHora * variaveis.noturno * (60 / 52.5) * 0.2);
        const dsrValor = diasUteis > 0 && domingosFeriados > 0
          ? trunc2(((he50Valor + he100Valor) / diasUteis) * domingosFeriados)
          : 0;

        const eventos: Array<{ codigo: string; descricao: string; tipo: 'provento' | 'desconto'; valor: number }> = [
          { codigo: '1000', descricao: 'Salário Base', tipo: 'provento', valor: salarioBase },
        ];
        if (he50Valor > 0) eventos.push({ codigo: '1001', descricao: 'Horas Extras 50%', tipo: 'provento', valor: he50Valor });
        if (he100Valor > 0) eventos.push({ codigo: '1002', descricao: 'Horas Extras 100%', tipo: 'provento', valor: he100Valor });
        if (noturnoValor > 0) eventos.push({ codigo: '1004', descricao: 'Adicional Noturno 20%', tipo: 'provento', valor: noturnoValor });
        if (dsrValor > 0) eventos.push({ codigo: '1003', descricao: 'DSR sobre Horas Extras', tipo: 'provento', valor: dsrValor });

        const bruto = round2(salarioBase + he50Valor + he100Valor + noturnoValor + dsrValor);
        const inss = calcularINSS(bruto, competencia);
        const dependentes = dependentesPorColaborador.get(c.id as string) ?? 0;
        const irrf = calcIRRF(bruto, dependentes, competencia);
        const fgts = trunc2(bruto * 0.08);
        const descontos = round2(inss + irrf);
        const liquido = round2(bruto - descontos);
        eventos.push({ codigo: '5000', descricao: 'Desconto INSS', tipo: 'desconto', valor: inss });
        if (irrf > 0) eventos.push({ codigo: '5001', descricao: 'Desconto IRRF', tipo: 'desconto', valor: irrf });
        eventosPorColaborador.set(c.id, eventos);
        salarioBasePorColaborador.set(c.id, salarioBase);

        itens.push({
          colaborador_id: c.id,
          nome: c.nome_completo,
          cargo: c.cargo,
          salario_bruto: bruto,
          inss, irrf, fgts,
          total_descontos: descontos,
          salario_liquido: liquido,
        });

        totais.bruto = round2(totais.bruto + bruto);
        totais.descontos = round2(totais.descontos + descontos);
        totais.liquido = round2(totais.liquido + liquido);
        totais.fgts = round2(totais.fgts + fgts);
        totais.inss = round2(totais.inss + inss);
        totais.irrf = round2(totais.irrf + irrf);
      }
    }

    const { data: upserted, error: upErr } = await admin
      .from('folhas_pagamento')
      .upsert({
        empresa_id, competencia, tipo: PAYROLL_TYPE, status: 'calculada',
        total_proventos: totais.bruto,
        total_descontos: totais.descontos,
        total_liquido: totais.liquido,
        total_fgts: totais.fgts,
        total_colaboradores: totalColabs,
        data_calculo: new Date().toISOString(),
      }, { onConflict: 'empresa_id,competencia,tipo' })
      .select('id')
      .single();
    if (upErr) throw upErr;

    // Persist the same canonical item-level result returned to the caller.
    // The compound unique constraint and conflict target make retries and
    // recalculations idempotent instead of creating duplicate payroll rows.
    const itemRows = itens.map((item) => ({
      folha_id: upserted.id,
      colaborador_id: item.colaborador_id,
      salario_base: salarioBasePorColaborador.get(item.colaborador_id) ?? item.salario_bruto,
      total_proventos: item.salario_bruto,
      total_descontos: item.total_descontos,
      total_liquido: item.salario_liquido,
      inss_mes: item.inss,
      irrf_mes: item.irrf,
      fgts_mes: item.fgts,
      detalhes: {
        inss: item.inss,
        irrf: item.irrf,
        fgts: item.fgts,
        detalheEventos: eventosPorColaborador.get(item.colaborador_id) ?? [],
      },
    }));
    const { error: itemUpsertError } = await admin
      .from('folha_itens')
      .upsert(itemRows, { onConflict: 'folha_id,colaborador_id' });
    if (itemUpsertError) throw itemUpsertError;

    // Snapshot canônico dos totais + contagem de itens → SHA-256 (integridade financeira não-repudiável).
    // Permite verificação posterior: qualquer alteração no cálculo produz hash diferente.
    const integritySnapshot = {
      empresa_id,
      competencia,
      tipo: PAYROLL_TYPE,
      total_colaboradores: totalColabs,
      itens_count: itens.length,
      totais,
    };
    const integrityHash = await computeIntegrityHash(integritySnapshot);

    // Auditoria detalhada (financeira + idempotência + integridade)
    await admin.from('audit_log').insert({
      tabela: 'folhas_pagamento',
      registro_id: upserted?.id ?? crypto.randomUUID(),
      acao: 'PAYROLL_CALC',
      user_id: userId,
      dados_novos: {
        empresa_id,
        competencia,
        total_colaboradores: totalColabs,
        itens_count: itens.length,
        idempotency_id: idempotencyId ?? null,
        integrity_hash: integrityHash,
        integrity_alg: 'sha256-canonical',
        calculated_at: new Date().toISOString(),
        ...Object.fromEntries(Object.entries(totais).map(([k, v]) => [`total_${k}`, v])),
      },
    });


    const responseBody = {
      success: true,
      folha_id: upserted?.id,
      competencia,
      total_colaboradores: totalColabs,
      integrity_hash: integrityHash,
      integrity_alg: 'sha256-canonical',
      ...Object.fromEntries(Object.entries(totais).map(([k, v]) => [`total_${k}`, v])),
      itens,
    };


    await completeIdempotency(admin, idempotencyId, 200, responseBody);

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    try { captureException(error, { fn: 'calcular-folha' }); } catch { /* noop */ }
    if (admin && idempotencyId) {
      try { await failIdempotency(admin, idempotencyId); } catch { /* noop */ }
    }
    return createErrorResponse('Erro interno no cálculo de folha', 500, 'INTERNAL_SERVER_ERROR');
  }
});
