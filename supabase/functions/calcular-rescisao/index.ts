// Onda 26 — Hardening crítico do motor de rescisão:
// • JWT obrigatório + CSRF fail-closed (req.clone)
// • Validação Zod estrita de payload (datas, tipos, ranges)
// • Precisão financeira via round2 (Number.EPSILON) — elimina drift
// • Base de cálculo de aviso indenizado integra 13º/INSS conforme CLT/Súmula 305
// • Colaborador (opcional) valida tenant scope antes de qualquer cálculo
// • Erros genéricos — não vazam stack/PII; captureException server-side
// • Auditoria RESCISAO_CALC em audit_log
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody, enforceOrigin, handlePreflight } from '../_shared/contract.ts';

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

// Achado H(K)4 da auditoria: usava só a tabela + dedução legal sobre uma base
// combinada (saldo+13º); ignorava a dedução simplificada e dependentes.
// Replica src/calculators/impostos.ts::calcularIRRF (base mais benéfica ao
// contribuinte: legal com deduções vs. simplificada).
function calcIRRF(bruto: number, dependentes = 0): number {
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const inss = calcINSS(bruto);
  const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF;
  const baseSimplificada = bruto - DEDUCAO_SIMPLIFICADA_IRRF;
  const base = Math.max(0, Math.min(baseLegal, baseSimplificada));
  if (base <= 0) return 0;
  // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal
  for (const f of FAIXAS_IRRF) {
    if (base <= f.l) return Math.max(0, trunc2(base * f.a - f.d));
  }
  return 0;
}

// Avos proporcionais (CLT): fração >= 15 dias conta como mês integral.
// Portado de src/utils/rescisaoCalc.ts::calcularAvos (motor canônico, coberto
// por testes e já usado pelo cálculo client-side desta mesma página).
function calcularAvos(inicio: Date, fim: Date): number {
  if (fim < inicio) return 0;
  let meses = (fim.getFullYear() - inicio.getFullYear()) * 12;
  meses += fim.getMonth() - inicio.getMonth();
  const diaInicio = inicio.getDate();
  const diaFim = fim.getDate();
  if (diaFim < diaInicio - 1) {
    meses--;
  }
  const dataReferencia = new Date(inicio.getFullYear(), inicio.getMonth() + meses, inicio.getDate());
  const diffTime = fim.getTime() - dataReferencia.getTime();
  const diasRestantes = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diasRestantes >= 15 ? meses + 1 : meses;
}

const BodySchema = z.object({
  salario_base: z.number().positive().max(1_000_000),
  data_admissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_desligamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // 'com_justa_causa' aceito por compat retroativa e normalizado para
  // 'justa_causa' — a string que a UI (CalculadoraRescisaoPage.tsx) e o
  // motor canônico (src/utils/rescisaoCalc.ts) realmente usam.
  tipo_rescisao: z.enum(['sem_justa_causa', 'com_justa_causa', 'justa_causa', 'culpa_reciproca', 'pedido_demissao', 'acordo_mutuo', 'termino_contrato']).default('sem_justa_causa'),
  aviso_previo: z.enum(['trabalhado', 'indenizado']).default('indenizado'),
  saldo_fgts: z.number().nonnegative().max(10_000_000).default(0),
  // A UI envia 0/1 (não um boolean literal) — z.coerce tolera ambos.
  ferias_vencidas: z.coerce.boolean().default(false),
  dependentes_irrf: z.number().int().nonnegative().max(20).default(0),
  colaborador_id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  const __pf = handlePreflight(req); if (__pf) return __pf;
  const __og = enforceOrigin(req); if (__og) return __og;try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Autenticação obrigatória', code: 'UNAUTHORIZED' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Sessão inválida', code: 'UNAUTHORIZED' }, 401);
    const userId = userData.user.id;

    let raw: unknown;
    const { body: parsedBody, errorResponse: payloadErr } = await parseJsonBody(req);
    if (payloadErr) return payloadErr;
    raw = parsedBody;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: 'Payload inválido', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, 422);
    }
    const {
      salario_base, data_admissao, data_desligamento, tipo_rescisao, aviso_previo,
      saldo_fgts, ferias_vencidas, dependentes_irrf, colaborador_id, empresa_id,
    } = parsed.data;

    // Sanity de datas — força interpretação local (sem timezone) para evitar
    // off-by-one em ambientes UTC (e.g. 2024-03-01 → 2024-02-29 em UTC-3).
    const adm = new Date(data_admissao + 'T00:00:00');
    const desl = new Date(data_desligamento + 'T00:00:00');
    if (isNaN(adm.getTime()) || isNaN(desl.getTime())) {
      return json({ error: 'Datas inválidas', code: 'VALIDATION_ERROR' }, 422);
    }
    if (desl <= adm) {
      return json({ error: 'Desligamento deve ser posterior à admissão', code: 'VALIDATION_ERROR' }, 422);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `calc-rescisao:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Tenant scope opcional (apenas se veio empresa_id/colaborador_id)
    let empresaIdFinal = empresa_id;
    if (colaborador_id) {
      const { data: colab } = await admin
        .from('colaboradores')
        .select('empresa_id')
        .eq('id', colaborador_id)
        .maybeSingle();
      if (!colab) return json({ error: 'Colaborador não encontrado', code: 'NOT_FOUND' }, 404);
      empresaIdFinal = colab.empresa_id;
    }
    if (empresaIdFinal) {
      const [{ data: belongs }, { data: isAdm }] = await Promise.all([
        admin.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresaIdFinal }),
        admin.rpc('is_admin', { _user_id: userId }),
      ]);
      if (!belongs && !isAdm) return json({ error: 'Sem acesso a esta empresa', code: 'FORBIDDEN' }, 403);
    }

    // ==== Cálculo ====
    // Portado de src/utils/rescisaoCalc.ts — motor canônico, testado e já
    // usado pelo botão "Calcular Local" desta mesma página. Corrige os
    // achados K2 (13º usava o número do mês como avos), K3 (pedido_demissao
    // zerava 13º/férias indevidamente) e K4 (tempo de serviço em blocos fixos
    // de 30 dias em vez de meses de calendário via regra dos 15 dias).
    // 'com_justa_causa' (aceito por compat) é normalizado para 'justa_causa'.
    const tipo = tipo_rescisao === 'com_justa_causa' ? 'justa_causa' : tipo_rescisao;

    // 1. Saldo de salário (Art. 4º CLT) — dias reais do mês do desligamento,
    //    não um bloco fixo de 30 dias.
    const diasNoMes = new Date(desl.getFullYear(), desl.getMonth() + 1, 0).getDate();
    const diasTrabalhados = desl.getDate();
    const saldoSalario = round2((salario_base / diasNoMes) * diasTrabalhados);

    // 2. Aviso prévio (Lei 12.506/2011) + projeção da data de fim (Súmula 305
    //    TST) para os avos de férias/13º abaixo.
    const diffAnos = Math.floor((desl.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    const diasAviso = Math.min(90, 30 + Math.max(0, diffAnos) * 3);

    const dataFimProjetada = new Date(desl);
    if (tipo === 'sem_justa_causa' || tipo === 'acordo_mutuo') {
      dataFimProjetada.setDate(dataFimProjetada.getDate() + diasAviso);
    }

    let avisoIndenizado = 0;
    if (tipo === 'sem_justa_causa' && aviso_previo !== 'trabalhado') {
      avisoIndenizado = round2((salario_base / 30) * diasAviso);
    } else if (tipo === 'acordo_mutuo' && aviso_previo !== 'trabalhado') {
      avisoIndenizado = round2((salario_base / 30) * (diasAviso / 2));
    }

    // 3. Férias proporcionais (Art. 146 CLT) — avos do período aquisitivo
    //    corrente, com a regra dos 15 dias e projeção do aviso.
    const mesesFerias = calcularAvos(adm, dataFimProjetada);
    let feriasProporcional = 0;
    if (tipo !== 'justa_causa') {
      feriasProporcional = round2((salario_base / 12) * (mesesFerias % 12 || (mesesFerias > 0 ? 12 : 0)));
    }
    const feriasVencidasValor = ferias_vencidas && tipo !== 'justa_causa' ? salario_base : 0;
    const tercoFerias = round2((feriasProporcional + feriasVencidasValor) / 3);

    // 4. 13º proporcional (Lei 4.090/62) — avos a partir do início do
    //    ano-calendário do desligamento (ou da admissão, se posterior),
    //    com projeção do aviso. `pedido_demissao`/`termino_contrato` têm
    //    direito pleno — só `justa_causa` zera, `culpa_reciproca` paga 50%.
    const inicioAno = new Date(desl.getFullYear(), 0, 1);
    const dataBase13 = adm > inicioAno ? adm : inicioAno;
    const meses13 = calcularAvos(dataBase13, dataFimProjetada);
    let decimoTerceiro = 0;
    if (tipo !== 'justa_causa' && tipo !== 'culpa_reciproca') {
      decimoTerceiro = round2((salario_base / 12) * meses13);
    } else if (tipo === 'culpa_reciproca') {
      decimoTerceiro = round2(((salario_base / 12) * meses13) / 2);
    }

    // 5. FGTS sobre a rescisão + multa (Art. 18 Lei 8.036/90)
    const fgtsRescisao = round2((saldoSalario + avisoIndenizado + decimoTerceiro) * 0.08);
    let multaFGTS = 0;
    if (tipo === 'sem_justa_causa') {
      multaFGTS = round2((saldo_fgts + fgtsRescisao) * 0.40);
    } else if (tipo === 'acordo_mutuo') {
      multaFGTS = round2((saldo_fgts + fgtsRescisao) * 0.20);
    }

    // 6. Totais e descontos — INSS/IRRF incidem separadamente sobre saldo de
    //    salário e 13º (bases distintas, cada um com sua própria dedução
    //    simplificada); férias/aviso indenizados são isentos.
    const totalProventos = round2(saldoSalario + avisoIndenizado + feriasVencidasValor + feriasProporcional + tercoFerias + decimoTerceiro);
    // IN RFB 2110/2022: truncar na 2ª casa por base. Soma em inteiros de centavos
    // para evitar underflow IEEE754 (ex: 0.1+0.7=0.7999... → trunc2 droparia 1 centavo).
    const inssA = calcINSS(saldoSalario);
    const inssB = calcINSS(decimoTerceiro);
    const inss = (Math.round(inssA * 100) + Math.round(inssB * 100)) / 100;
    const irrfA = calcIRRF(saldoSalario, dependentes_irrf);
    const irrfB = calcIRRF(decimoTerceiro, 0);
    const irrf = (Math.round(irrfA * 100) + Math.round(irrfB * 100)) / 100;
    const totalDescontos = round2(inss + irrf);
    const totalLiquido = round2(totalProventos - totalDescontos + multaFGTS);

    const avosServico = calcularAvos(adm, desl);

    const resultado = {
      saldoSalario,
      avisoIndenizado,
      feriasVencidas: feriasVencidasValor,
      feriasProporcionais: feriasProporcional,
      tercoFerias,
      decimoTerceiro,
      multaFGTS,
      fgtsRescisao,
      totalProventos,
      inss,
      irrf,
      totalDescontos,
      totalLiquido,
      diasTrabalhados,
      mesesFerias,
      meses13,
      diasAviso,
      timestamp: new Date().toISOString(),
    };

    // Auditoria (não bloqueante)
    admin.from('audit_log').insert({
      tabela: 'rescisoes',
      registro_id: colaborador_id ?? crypto.randomUUID(),
      acao: 'RESCISAO_CALC',
      user_id: userId,
      dados_novos: {
        empresa_id: empresaIdFinal ?? null,
        tipo_rescisao: tipo, total_bruto: totalProventos, total_liquido: totalLiquido,
        tempo_servico_meses: avosServico,
      },
    }).then(() => {}, () => {});

    return json({
      success: true,
      tipo_rescisao,
      tempo_servico_meses: avosServico,
      tempo_servico_anos: Math.floor(avosServico / 12),
      resultado,
    });
  } catch (error) {
    try { captureException(error, { fn: 'calcular-rescisao' }); } catch { /* noop */ }
    return json({ error: 'Erro interno no cálculo de rescisão', code: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
