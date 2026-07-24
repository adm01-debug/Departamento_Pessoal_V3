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
import { captureException } from '../_shared/sentry.ts';
import { beginIdempotency, completeIdempotency, failIdempotency, extractIdempotencyKey } from '../_shared/idempotency.ts';
import { integrityHash as computeIntegrityHash } from '../_shared/integrityHash.ts';


const FAIXAS_INSS = [
  { limite: 1518.00, aliquota: 0.075 },
  { limite: 2793.88, aliquota: 0.09 },
  { limite: 4190.83, aliquota: 0.12 },
  { limite: 8157.41, aliquota: 0.14 },
];

const FAIXAS_IRRF = [
  { limite: 2259.20, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
];

const TETO_INSS = 8157.41;
const DEDUCAO_SIMPLIFICADA_IRRF = 564.80; // Lei 14.663/2023
const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const CHUNK_SIZE = 500;
const MAX_COLABORADORES = 50_000;

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
// IN RFB 2110/2022: contribuições previdenciárias e IR truncam centavos
const trunc2 = (n: number): number => Math.trunc(n * 100) / 100;



function calcINSS(salario: number): number {
  if (!Number.isFinite(salario) || salario <= 0) return 0;
  let desc = 0;
  const baseCalculo = Math.min(salario, TETO_INSS);
  let rest = baseCalculo;
  for (let i = 0; i < FAIXAS_INSS.length; i++) {
    const limAnt = i === 0 ? 0 : FAIXAS_INSS[i - 1].limite;
    const f = Math.min(rest, FAIXAS_INSS[i].limite - limAnt);
    if (f <= 0) break;
    desc += f * FAIXAS_INSS[i].aliquota;
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
    if (base <= f.limite) return Math.max(0, trunc2(base * f.aliquota - f.deducao));
  }
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let idempotencyId: string | undefined;
  let admin: ReturnType<typeof createClient> | undefined;

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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    const userId = userData.user.id;

    const { data, errorResponse } = await validateRequest(req, calcularFolhaSchema);
    if (errorResponse) return errorResponse;
    const { empresa_id, competencia } = data!;
    // Extrai a chave de idempotência DEPOIS de parsear o body — permite fallback via body
    // (alguns navegadores/proxies removem headers custom em preflights antigos).
    const idempotencyKey = extractIdempotencyKey(req, data);

    admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit — cálculo de folha é pesado: 20 req / min / usuário
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `calc-folha:${userId}`, limit: 20, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Tenant scope (antes de qualquer efeito colateral / idempotência)
    const [{ data: belongs }, { data: isAdm }] = await Promise.all([
      admin.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresa_id }),
      admin.rpc('is_admin', { _user_id: userId }),
    ]);
    if (!belongs && !isAdm) return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');

    // Idempotência — Onda 41
    // Payload canonicalizado (empresa_id + competencia + userId) evita replay cruzado entre usuários.
    const idem = await beginIdempotency(admin, {
      endpoint: 'calcular-folha',
      key: idempotencyKey,
      requestBody: { empresa_id, competencia, user_id: userId },
      empresaId: empresa_id,
      userId,
    });

    // Auditoria detalhada de conflito/replay/duplicidade de Idempotency-Key.
    // Best-effort — falha no audit_log NUNCA bloqueia a resposta ao cliente.
    if (idem.reason && idem.reason !== 'NEW') {
      try {
        await admin.from('audit_log').insert({
          tabela: 'idempotency_keys',
          registro_id: idem.existingId ?? idem.id ?? crypto.randomUUID(),
          acao: `IDEMPOTENCY_${idem.reason}`,
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

    // Chunked fetch
    const itens: Array<Record<string, unknown>> = [];
    const totais = { bruto: 0, descontos: 0, liquido: 0, fgts: 0, inss: 0, irrf: 0 };

    for (let offset = 0; offset < totalColabs; offset += CHUNK_SIZE) {
      const { data: colabs, error: e } = await admin
        .from('colaboradores')
        .select('id, nome_completo, salario_base, cargo, departamento, dependentes_irrf')
        .eq('empresa_id', empresa_id)
        .eq('status', 'ativo')
        .range(offset, offset + CHUNK_SIZE - 1);
      if (e) throw e;
      if (!colabs?.length) break;

      // Dependentes para fins de IRRF (public.dependentes.ir_dependente) — uma
      // única query em lote por chunk, evita N+1 por colaborador.
      const colabIds = colabs.map((c) => c.id);
      const { data: depsRows } = await admin
        .from('dependentes')
        .select('colaborador_id')
        .in('colaborador_id', colabIds)
        .eq('ir_dependente', true);
      const dependentesPorColaborador = new Map<string, number>();
      for (const d of depsRows ?? []) {
        const key = d.colaborador_id as string;
        dependentesPorColaborador.set(key, (dependentesPorColaborador.get(key) ?? 0) + 1);
      }

      for (const c of colabs) {
        const bruto = Number(c.salario_base) || 0;
        const inss = calcINSS(bruto);
        const dependentes = dependentesPorColaborador.get(c.id as string) ?? 0;
        const irrf = calcIRRF(bruto, dependentes);
        const fgts = trunc2(bruto * 0.08);
        const descontos = round2(inss + irrf);
        const liquido = round2(bruto - descontos);

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
        empresa_id, competencia, status: 'calculada',
        total_bruto: totais.bruto,
        total_descontos: totais.descontos,
        total_liquido: totais.liquido,
        total_colaboradores: totalColabs,
        data_calculo: new Date().toISOString(),
      }, { onConflict: 'empresa_id,competencia' })
      .select('id')
      .single();
    if (upErr) throw upErr;

    // Snapshot canônico dos totais + contagem de itens → SHA-256 (integridade financeira não-repudiável).
    // Permite verificação posterior: qualquer alteração no cálculo produz hash diferente.
    const integritySnapshot = {
      empresa_id,
      competencia,
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

