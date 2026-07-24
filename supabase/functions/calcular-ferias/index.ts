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
import { captureException } from '../_shared/sentry.ts';

const noStore = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const trunc2 = (n: number): number => Math.trunc(n * 100) / 100;
const TETO_INSS = 8157.41;
const DEDUCAO_SIMPLIFICADA_IRRF = 564.80; // Lei 14.663/2023
const DEDUCAO_DEPENDENTE_IRRF = 189.59;

const FAIXAS_INSS = [
  { l: 1518.00, a: 0.075 },
  { l: 2793.88, a: 0.09 },
  { l: 4190.83, a: 0.12 },
  { l: 8157.41, a: 0.14 },
];
const FAIXAS_IRRF = [
  { l: 2259.20, a: 0, d: 0 },
  { l: 2826.65, a: 0.075, d: 169.44 },
  { l: 3751.05, a: 0.15, d: 381.44 },
  { l: 4664.68, a: 0.225, d: 662.77 },
  { l: Infinity, a: 0.275, d: 896.00 },
];

function calcINSS(sal: number): number {
  if (!Number.isFinite(sal) || sal <= 0) return 0;
  const base = Math.min(sal, TETO_INSS);
  let desc = 0, rest = base;
  for (let i = 0; i < FAIXAS_INSS.length; i++) {
    const la = i === 0 ? 0 : FAIXAS_INSS[i - 1].l;
    const f = Math.min(rest, FAIXAS_INSS[i].l - la);
    if (f <= 0) break;
    desc += f * FAIXAS_INSS[i].a;
    rest -= f;
  }
  return trunc2(desc);
}

function calcIRRF(bruto: number, dependentes = 0): number {
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const inss = calcINSS(bruto);
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
  colaborador_id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
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

    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;

    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return createValidationErrorResponse(parsed.error);
    const { salario_base, dias_ferias, dias_abono, dependentes_irrf, colaborador_id, empresa_id } = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `calc-ferias:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

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
      const [{ data: belongs }, { data: isAdm }] = await Promise.all([
        admin.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresaIdFinal }),
        admin.rpc('is_admin', { _user_id: userId }),
      ]);
      if (!belongs && !isAdm) {
        return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');
      }
    }

    // ==== Cálculo ====
    const vd = salario_base / 30;
    const vf = round2(vd * dias_ferias);
    const tc = round2(vf / 3);
    const va = round2(vd * dias_abono);
    const ta = round2(va / 3);
    const bruto = round2(vf + tc + va + ta);

    // INSS/IRRF incidem sobre férias + 1/3, NÃO sobre abono pecuniário (art. 7º § único Lei 8.212)
    const baseTributavel = round2(vf + tc);
    const inss = calcINSS(baseTributavel);
    const irrf = calcIRRF(baseTributavel, dependentes_irrf);
    const liquido = round2(bruto - inss - irrf);

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
      }),
      { status: 200, headers: noStore },
    );
  } catch (err) {
    try { captureException(err, { fn: 'calcular-ferias' }); } catch { /* noop */ }
    return createErrorResponse('Erro interno no cálculo de férias', 500, 'INTERNAL_SERVER_ERROR');
  }
});
