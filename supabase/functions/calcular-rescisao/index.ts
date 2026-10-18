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
import { requireRh } from '../_shared/authz.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody, enforceOrigin, handlePreflight } from '../_shared/contract.ts';
import { calcularRescisaoMotor, calcularAvos, normalizarTipoRescisao } from './motor.ts';

const BodySchema = z.object({
  salario_base: z.number().positive().max(1_000_000),
  data_admissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_desligamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // 'com_justa_causa' aceito por compat retroativa e normalizado para
  // 'justa_causa'; 'acordo'/'fim_contrato' são os valores do enum
  // tipo_desligamento do banco, normalizados pelo motor (motor.ts).
  tipo_rescisao: z.enum(['sem_justa_causa', 'com_justa_causa', 'justa_causa', 'culpa_reciproca', 'pedido_demissao', 'acordo_mutuo', 'acordo', 'termino_contrato', 'fim_contrato', 'falecimento']).default('sem_justa_causa'),
  aviso_previo: z.enum(['trabalhado', 'indenizado']).default('indenizado'),
  saldo_fgts: z.number().nonnegative().max(10_000_000).default(0),
  // A UI envia 0/1 (não um boolean literal) — z.coerce tolera ambos.
  ferias_vencidas: z.coerce.boolean().default(false),
  dependentes_irrf: z.number().int().nonnegative().max(20).default(0),
  // Pedido de demissão: dias de aviso não cumpridos (art. 487 §2º CLT).
  dias_aviso_nao_cumpridos: z.number().int().min(0).max(30).optional(),
  // Contrato a prazo/experiência: data prevista de fim e iniciativa da
  // antecipação (arts. 479/480 CLT).
  data_fim_contrato: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  termino_iniciativa: z.enum(['empregador', 'empregado', 'natural']).optional(),
  // Data do pagamento das verbas — atraso >10 dias corridos gera multa (art. 477 §8º).
  data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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

    const { body: parsedBody, errorResponse: payloadErr } = await parseJsonBody(req);
    if (payloadErr) return payloadErr;
    const raw = parsedBody;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: 'Payload inválido', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, 422);
    }
    const {
      salario_base, data_admissao, data_desligamento, tipo_rescisao, aviso_previo,
      saldo_fgts, ferias_vencidas, dependentes_irrf, dias_aviso_nao_cumpridos,
      data_fim_contrato, termino_iniciativa, data_pagamento,
      colaborador_id, empresa_id,
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
    if (!rl.allowed) return rateLimitResponse(rl, req);

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
      // Papel, não apenas vínculo: o padrão anterior (`!belongs && !isAdmin`)
      // era um OU — pertencer à empresa já bastava, e o is_admin apenas somava
      // o admin global. Qualquer colaborador autenticado passava.
      const authz = await requireRh(admin, userId, empresaIdFinal, req);
      if (authz.denied) return authz.denied;
    }


    // ==== Cálculo ====
    // Motor espelhado em ./motor.ts (porte do motor único
    // src/utils/rescisaoCalc.ts::calcularRescisaoCore). Cobre: OJ 82
    // (projeção do aviso indenizado), 12/12 com dedup de férias vencidas,
    // arts. 479/480 (contrato a prazo), desconto de aviso não cumprido
    // (art. 487 §2º), culpa recíproca completa (Súm. 14 TST), multa FGTS
    // fora do líquido (GRRF), multa do art. 477 §8º e informativos de
    // saque FGTS/seguro-desemprego.
    const resultado = calcularRescisaoMotor({
      salarioBase: salario_base,
      dataAdmissao: data_admissao,
      dataDesligamento: data_desligamento,
      tipo: tipo_rescisao,
      avisoTrabalhado: aviso_previo === 'trabalhado',
      feriasVencidas: ferias_vencidas,
      saldoFGTS: saldo_fgts,
      dependentes: dependentes_irrf,
      diasAvisoNaoCumpridos: dias_aviso_nao_cumpridos,
      dataFimContrato: data_fim_contrato,
      terminoIniciativa: termino_iniciativa,
      dataPagamento: data_pagamento,
    });

    const {
      totalProventos, totalDescontos, totalLiquido,
    } = resultado;
    const tipo = normalizarTipoRescisao(tipo_rescisao);
    const avosServico = calcularAvos(adm, desl);

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
