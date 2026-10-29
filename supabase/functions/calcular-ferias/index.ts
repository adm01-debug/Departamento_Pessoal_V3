// Onda 32 — Hardening de cálculo de férias
// - JWT obrigatório + CSRF fail-closed
// - Zod strict: dias_ferias 1-30, dias_abono 0-10 (art. 143 CLT), salario > 0
// - Tenant scope quando colaborador_id informado
// - round2 com Number.EPSILON para eliminar drift
// - Auditoria não-bloqueante
// - Erros genéricos, sem vazar stack

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { requireRh } from '../_shared/authz.ts';
import { captureException } from '../_shared/sentry.ts';
import { calcularINSS } from '../_shared/inss.ts';

const noStore = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const trunc2 = (n: number): number => Math.trunc(n * 100) / 100;
const DEDUCAO_SIMPLIFICADA_IRRF = 564.80; // Lei 14.663/2023
const DEDUCAO_DEPENDENTE_IRRF = 189.59;

const FAIXAS_IRRF = [
  { l: 2259.20, a: 0, d: 0 },
  { l: 2826.65, a: 0.075, d: 169.44 },
  { l: 3751.05, a: 0.15, d: 381.44 },
  { l: 4664.68, a: 0.225, d: 662.77 },
  { l: Infinity, a: 0.275, d: 896.00 },
];

function calcIRRF(bruto: number, dependentes = 0, referencia: string): number {
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const inss = calcularINSS(bruto, referencia);
  const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF;
  const baseSimplificada = bruto - DEDUCAO_SIMPLIFICADA_IRRF;
  const base = Math.max(0, Math.min(baseLegal, baseSimplificada));
  if (base <= 0) return 0;
  for (const f of FAIXAS_IRRF) {
    if (base <= f.l) return Math.max(0, trunc2(base * f.a - f.d));
  }
  return 0;
}

const BodySchema = z.object({
  salario_base: z.number().positive().max(1_000_000),
  dias_ferias: z.number().int().min(1).max(30).default(30),
  dias_abono: z.number().int().min(0).max(10).default(0), // Art. 143 CLT
  dependentes_irrf: z.number().int().min(0).max(30).optional().default(0),
  // Competência 'YYYY-MM' das férias — seleciona a tabela INSS do ano.
  // Opcional: simulações sem competência usam o mês corrente.
  competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  colaborador_id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  // Quando informado, o resultado é persistido na solicitação de férias
  // (antes o cálculo ia só para audit_log e a tela guardava nada — §6.2).
  ferias_id: z.string().uuid().optional(),
}).refine((d) => d.dias_ferias + d.dias_abono <= 30, {
  message: 'Soma de férias + abono não pode exceder 30 dias',
  path: ['dias_abono'],
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claims?.user?.id) {
      return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    }
    const userId = claims.user.id;

    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    const raw = _pb;

    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return createValidationErrorResponse(parsed.error, req);
    const { salario_base, dias_abono, dependentes_irrf, colaborador_id, empresa_id, competencia, ferias_id } = parsed.data;
    let { dias_ferias } = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `calc-ferias:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl, req);

    // Tenant scope
    let empresaIdFinal = empresa_id;
    if (colaborador_id) {
      const { data: colab } = await admin
        .from('colaboradores')
        .select('empresa_id')
        .eq('id', colaborador_id)
        .maybeSingle();
      if (!colab) return createErrorResponse('Colaborador não encontrado', 404, 'NOT_FOUND');
      empresaIdFinal = colab.empresa_id;
    }
    if (empresaIdFinal) {
    // Papel, não apenas vínculo: o padrão anterior (`!belongs && !isAdmin`)
    // era um OU — pertencer à empresa já bastava, e o is_admin apenas somava
    // o admin global. Qualquer colaborador autenticado passava.
    {
      const authz = await requireRh(admin, userId, empresaIdFinal, req);
      if (authz.denied) return authz.denied;
    }
    }

    // ==== Art. 130 CLT + médias de variáveis (só com colaborador) ====
    // dias_direito do período aquisitivo vigente limita os dias de férias
    // (redução automática por faltas injustificadas). Médias: HE apuradas
    // no período aquisitivo (registros_ponto) valorizadas à hora do salário.
    let diasDireito: number | null = null;
    let faltasPeriodo = 0;
    let mediaVariaveis = 0;
    if (colaborador_id) {
      const { data: pa } = await admin
        .from('periodos_aquisitivos')
        .select('dias_direito, faltas_periodo, data_inicio, data_fim')
        .eq('colaborador_id', colaborador_id)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pa) {
        diasDireito = Number((pa as Record<string, unknown>).dias_direito) || null;
        faltasPeriodo = Number((pa as Record<string, unknown>).faltas_periodo) || 0;
        if (diasDireito !== null && diasDireito < dias_ferias) dias_ferias = Math.max(0, diasDireito);
        // Média de variáveis (HE 50/100 + noturno) do período aquisitivo.
        const { data: regs } = await admin
          .from('registros_ponto')
          .select('horas_extras_50, horas_extras_100, horas_noturnas')
          .eq('colaborador_id', colaborador_id)
          .gte('data', (pa as Record<string, unknown>).data_inicio as string)
          .lte('data', (pa as Record<string, unknown>).data_fim as string);
        const rows = (regs ?? []) as { horas_extras_50: number | null; horas_extras_100: number | null; horas_noturnas: number | null }[];
        if (rows.length > 0) {
          const valorHora = salario_base / 220; // divisor mensal CLT
          const meses = Math.max(1, Math.ceil(rows.length / 30));
          const soma = rows.reduce(
            (acc, r) =>
              acc +
              (Number(r.horas_extras_50) || 0) * 1.5 +
              (Number(r.horas_extras_100) || 0) * 2 +
              (Number(r.horas_noturnas) || 0) * 0.2,
            0,
          );
          mediaVariaveis = round2((soma * valorHora) / meses);
        }
      }
    }

    // ==== Cálculo ====
    const baseRemuneracao = salario_base + mediaVariaveis;
    const vd = baseRemuneracao / 30;
    const vf = round2(vd * dias_ferias);
    const tc = round2(vf / 3);
    const va = round2(vd * dias_abono);
    const ta = round2(va / 3);
    const bruto = round2(vf + tc + va + ta);

    // INSS/IRRF incidem sobre férias + 1/3, NÃO sobre abono pecuniário (art. 7º § único Lei 8.212)
    const baseTributavel = round2(vf + tc);
    // Competência das férias define a tabela INSS; sem ela, usa o mês corrente
    // (o cálculo é sempre para um gozo próximo, nunca histórico).
    const inssRef = competencia ?? new Date().toISOString().slice(0, 7);
    const inss = calcularINSS(baseTributavel, inssRef);
    const irrf = calcIRRF(baseTributavel, dependentes_irrf, inssRef);
    const liquido = round2(bruto - inss - irrf);

    // Persistência: quando ferias_id vem, o cálculo fica gravado na
    // solicitação (escopo empresa+colaborador já validados acima).
    if (ferias_id && colaborador_id && empresaIdFinal) {
      const { error: upErr } = await admin
        .from('ferias')
        .update({
          valor_ferias: vf,
          valor_terco: tc,
          valor_abono: va,
          valor_terco_abono: ta,
          valor_total: bruto,
          descontos_inss: inss,
          descontos_irrf: irrf,
          valor_liquido: liquido,
        })
        .eq('id', ferias_id)
        .eq('colaborador_id', colaborador_id)
        .eq('empresa_id', empresaIdFinal);
      if (upErr) throw upErr;
    }

    // Auditoria (não-bloqueante)
    admin.from('audit_log').insert({
      tabela: 'ferias',
      registro_id: colaborador_id ?? crypto.randomUUID(),
      acao: 'FERIAS_CALC',
      user_id: userId,
      dados_novos: {
        empresa_id: empresaIdFinal ?? null,
        dias_ferias, dias_abono, dependentes_irrf,
        bruto, inss, irrf, liquido,
      },
    }).then(() => {}, () => {});

    return new Response(
      JSON.stringify({
        success: true,
        colaborador_id: colaborador_id ?? null,
        dias_ferias, dias_abono,
        valor_ferias: vf,
        terco_constitucional: tc,
        valor_abono: va,
        terco_abono: ta,
        bruto,
        base_tributavel: baseTributavel,
        inss, irrf, liquido,
        media_variaveis: mediaVariaveis,
        dias_direito: diasDireito,
        faltas_periodo: faltasPeriodo,
        persistido: Boolean(ferias_id),
      }),
      { status: 200, headers: noStore },
    );
  } catch (err) {
    try { captureException(err, { fn: 'calcular-ferias' }); } catch { /* noop */ }
    return createErrorResponse('Erro interno no cálculo de férias', 500, 'INTERNAL_SERVER_ERROR');
  }
});
