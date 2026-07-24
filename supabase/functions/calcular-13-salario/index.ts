// Onda 33 — Hardening de cálculo de 13º Salário:
// • JWT + CSRF fail-closed + tenant scope
// • Zod strict + cap salarial (R$ 1M)
// • BigInt centavos (zero drift)
// • Avos proporcionais (admissão + afastamentos > 15 dias)
// • Idempotency-Key (10min por competencia+colaborador+parcela)
// • Auditoria bloqueante com hash SHA-256
// • no-store em todas respostas
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

const MAX_SALARIO_CENTS = 100_000_000n; // R$ 1.000.000,00
const TETO_INSS_CENTS = 815_741n; // R$ 8.157,41

const BodySchema = z.object({
  colaborador_id: z.string().uuid(),
  empresa_id: z.string().uuid(),
  competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM'),
  parcela: z.enum(['1', '2', 'integral']),
  salario_base: z.number().positive().max(1_000_000),
  media_variaveis: z.number().min(0).max(1_000_000).optional().default(0),
  data_admissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dias_afastamento_ano: z.number().int().min(0).max(365).optional().default(0),
  dependentes_irrf: z.number().int().min(0).max(30).optional().default(0),
  pensao_alimenticia: z.number().min(0).max(1_000_000).optional().default(0),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---- Cálculos em BigInt centavos ----
function reaisToCents(v: number): bigint {
  return BigInt(Math.round(v * 100));
}
function centsToReais(c: bigint): number {
  return Number(c) / 100;
}

// INSS progressivo (retorna centavos)
function calcularINSSCents(baseCents: bigint): bigint {
  if (baseCents <= 0n) return 0n;
  const b = baseCents < TETO_INSS_CENTS ? baseCents : TETO_INSS_CENTS;
  // Faixas 2025 em centavos
  const F1 = 151_800n;    // 1.518,00 @ 7.5%
  const F2 = 279_388n;    // 2.793,88 @ 9%
  const F3 = 419_083n;    // 4.190,83 @ 12%
  let inss: bigint;
  if (b <= F1) inss = (b * 75n) / 1000n;
  else if (b <= F2) inss = 11_385n + ((b - F1) * 90n) / 1000n;
  // 22_867n = 11_385 + floor((279_388-151_800)*90/1000) — BigInt division truncates per IN RFB 2110/2022
  else if (b <= F3) inss = 22_867n + ((b - F2) * 120n) / 1000n;
  // 39_630n = 22_867 + floor((419_083-279_388)*120/1000)
  else inss = 39_630n + ((b - F3) * 140n) / 1000n;
  const TETO_DESC = 95_163n; // R$ 951,63
  return inss < TETO_DESC ? inss : TETO_DESC;
}

// IRRF progressivo (retorna centavos)
function calcularIRRFCents(baseCents: bigint, dependentes: number): bigint {
  const deducaoDep = BigInt(dependentes) * 18_959n; // R$ 189,59
  const bLegal = baseCents - deducaoDep;
  // Desconto simplificado R$564,80 = 56_480 centavos (Art. 1°, Lei 13.149/2015)
  const bSimplificado = baseCents - 56_480n;
  const b = bLegal < bSimplificado ? bLegal : bSimplificado;
  if (b <= 225_920n) return 0n;
  if (b <= 282_665n) { const v = (b * 75n) / 1000n - 16_944n; return v > 0n ? v : 0n; }
  if (b <= 375_105n) { const v = (b * 150n) / 1000n - 38_144n; return v > 0n ? v : 0n; }
  if (b <= 466_468n) { const v = (b * 225n) / 1000n - 66_277n; return v > 0n ? v : 0n; }
  const v = (b * 275n) / 1000n - 89_600n;
  return v > 0n ? v : 0n;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ success: false, error: 'Autenticação obrigatória', code: 'UNAUTHORIZED' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return json({ success: false, error: 'Sessão inválida', code: 'UNAUTHORIZED' }, 401);
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ success: false, error: 'Payload inválido', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, 422);
    }
    const d = parsed.data;

    // Tenant scope
    const [{ data: belongs }, { data: isAdm }] = await Promise.all([
      supabase.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: d.empresa_id }),
      supabase.rpc('is_admin', { _user_id: userId }),
    ]);
    if (!belongs && !isAdm) {
      return json({ success: false, error: 'Sem acesso a esta empresa', code: 'FORBIDDEN' }, 403);
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `calc-13:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Idempotência (janela 10min por competencia+colaborador+parcela)
    const idemKey = req.headers.get('idempotency-key') ?? '';
    const idemComposite = `13sal:${d.empresa_id}:${d.colaborador_id}:${d.competencia}:${d.parcela}:${idemKey}`;
    const idemHash = await sha256Hex(idemComposite);
    if (idemKey) {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: prev } = await supabase
        .from('audit_log')
        .select('dados_novos, created_at')
        .eq('tabela', 'calculo_13_salario')
        .eq('registro_id', idemHash)
        .gte('created_at', since)
        .limit(1)
        .maybeSingle();
      if (prev?.dados_novos) {
        return json({ success: true, replay: true, resultado: prev.dados_novos });
      }
    }

    // Avos proporcionais
    const [anoRef, mesRef] = d.competencia.split('-').map(Number);
    const adm = new Date(d.data_admissao + 'T00:00:00Z');
    const anoAdm = adm.getUTCFullYear();
    const mesAdm = adm.getUTCMonth() + 1;
    const diaAdm = adm.getUTCDate();

    let avos = 12;
    if (anoAdm > anoRef) {
      return json({ success: false, error: 'Admissão posterior ao ano de referência', code: 'INVALID_PERIOD' }, 422);
    }
    if (anoAdm === anoRef) {
      // Meses trabalhados a partir da admissão (mês conta se admitido até dia 15)
      const contaMesAdm = diaAdm <= 15 ? 1 : 0;
      avos = 12 - mesAdm + contaMesAdm;
    }
    // Descontar meses de afastamento sem remuneração (> 15 dias no mês perde avos)
    const mesesAfastamento = Math.floor(d.dias_afastamento_ano / 15);
    avos = Math.max(0, avos - mesesAfastamento);

    if (avos === 0) {
      return json({ success: true, resultado: { avos: 0, valor_bruto: 0, valor_parcela: 0, liquido: 0, motivo: 'sem_avos' } });
    }

    // Base bruta (13º proporcional integral)
    const salarioMedioCents = reaisToCents(d.salario_base) + reaisToCents(d.media_variaveis);
    if (salarioMedioCents > MAX_SALARIO_CENTS) {
      return json({ success: false, error: 'Salário excede limite operacional', code: 'PAYLOAD_TOO_LARGE' }, 413);
    }
    const brutoIntegralCents = (salarioMedioCents * BigInt(avos)) / 12n;

    // Parcelas
    let valorParcelaCents = 0n;
    let inssCents = 0n;
    let irrfCents = 0n;
    let adiantamento1Cents = 0n;
    let dataLimite: string;

    if (d.parcela === '1') {
      valorParcelaCents = brutoIntegralCents / 2n;
      dataLimite = `${anoRef}-11-30`;
    } else if (d.parcela === '2') {
      adiantamento1Cents = brutoIntegralCents / 2n;
      inssCents = calcularINSSCents(brutoIntegralCents);
      irrfCents = calcularIRRFCents(brutoIntegralCents - inssCents, d.dependentes_irrf);
      valorParcelaCents = brutoIntegralCents - adiantamento1Cents;
      dataLimite = `${anoRef}-12-20`;
    } else {
      // integral: única tributação (rescisão etc.)
      inssCents = calcularINSSCents(brutoIntegralCents);
      irrfCents = calcularIRRFCents(brutoIntegralCents - inssCents, d.dependentes_irrf);
      valorParcelaCents = brutoIntegralCents;
      dataLimite = `${anoRef}-12-20`;
    }

    const pensaoCents = reaisToCents(d.pensao_alimenticia);
    const totalDescontosCents = inssCents + irrfCents + pensaoCents;
    const liquidoCents = valorParcelaCents - totalDescontosCents;

    const resultado = {
      colaborador_id: d.colaborador_id,
      empresa_id: d.empresa_id,
      competencia: d.competencia,
      parcela: d.parcela,
      avos,
      proventos: {
        salario_base: d.salario_base,
        media_variaveis: d.media_variaveis,
        valor_bruto_integral: centsToReais(brutoIntegralCents),
        valor_parcela: centsToReais(valorParcelaCents),
      },
      descontos: {
        inss: centsToReais(inssCents),
        irrf: centsToReais(irrfCents),
        pensao_alimenticia: centsToReais(pensaoCents),
        adiantamento_1_parcela: centsToReais(adiantamento1Cents),
        total: centsToReais(totalDescontosCents),
      },
      liquido: centsToReais(liquidoCents),
      data_limite_pagamento: dataLimite,
      calculado_em: new Date().toISOString(),
    };

    const hash = await sha256Hex(JSON.stringify(resultado));

    // Auditoria bloqueante (não-repúdio)
    const { error: auditErr } = await supabase.from('audit_log').insert({
      tabela: 'calculo_13_salario',
      registro_id: idemKey ? idemHash : crypto.randomUUID(),
      acao: 'CALCULATE',
      user_id: userId,
      dados_novos: { ...resultado, hash_sha256: hash },
    });
    if (auditErr) throw auditErr;

    return json({ success: true, resultado, hash_sha256: hash });
  } catch (error: unknown) {
    try { captureException(error, { fn: 'calcular-13-salario' }); } catch { /* noop */ }
    return json({ success: false, error: 'Erro interno ao calcular 13º salário', code: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
