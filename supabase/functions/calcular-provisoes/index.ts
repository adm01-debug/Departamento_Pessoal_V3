// Onda 33 — Hardening de cálculo de Provisões (Férias + 13º):
// • JWT + CSRF fail-closed + tenant scope
// • Zod strict (competência AAAA-MM, não-futura, ≤ 60 meses passados)
// • BigInt centavos (zero drift)
// • Férias = (salário × 4/3) / 12 + encargos por regime tributário; 13º = salário / 12 + encargos
// • Filtra colaboradores ativos e admitidos até último dia da competência
// • Cap 10.000 colaboradores/execução
// • Substituição + auditoria atômicas por RPC transacional
// • Auditoria bloqueante com hash SHA-256 do consolidado
// • Erros genéricos + captureException
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { z } from 'npm:zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { requireRh } from '../_shared/authz.ts';
import { captureException } from '../_shared/sentry.ts';
import { enforceOrigin, getCorsHeaders, handlePreflight, parseJsonBody } from '../_shared/contract.ts';

const CHUNK = 500;
const MAX_COLABS = 10_000;

// Encargos patronais consolidados. Achado K5 da auditoria: RAT estava em 2%
// aqui, divergindo do valor canônico usado em src/calculators/tabelas.ts
// (ENCARGOS_PADRAO.rat = 3%) — provisão de encargos subestimada.
const INSS_PATRONAL_BPS = 200n;  // 20%
const RAT_MEDIO_BPS = 30n;       // 3% (src/calculators/tabelas.ts::ENCARGOS_PADRAO.rat)
const TERCEIROS_BPS = 58n;       // 5.8%
const FGTS_BPS = 80n;            // 8%

// Encargos patronais por regime tributário da empresa. Espelho manual de
// src/calculators/tabelas.ts::aliquotaEncargosProvisao (edge não pode importar
// de src/). Simples Nacional recolhe CPP e Terceiros dentro do DAS
// (LC 123/2006, art. 13, §3º) — sobre a folha incide só o FGTS; no Anexo IV
// (art. 18, §5º-C) a CPP e o RAT/FAP ficam fora do DAS. Regime ausente ou
// desconhecido mantém a alíquota cheia para não subestimar o passivo.
function encargosPatronaisBps(regime: string | null, simplesAnexo: string | null): bigint {
  const cheia = INSS_PATRONAL_BPS + RAT_MEDIO_BPS + TERCEIROS_BPS;
  if (regime !== 'simples_nacional') return cheia;
  // Anexo IV: CPP e RAT/FAP ficam FORA do DAS (art. 18, §5º-C).
  if (simplesAnexo === 'IV') return INSS_PATRONAL_BPS + RAT_MEDIO_BPS;
  // Anexo NÃO identificado: `empresas.simples_anexo` é nullable
  // (20260912208000_p1_company_payroll_tax_contract.sql:20,77-85) e a tela de
  // configuração permite salvar sem ele. Sem saber o anexo não é possível
  // afirmar que a CPP está no DAS, então mantém a alíquota cheia — reduzir
  // aqui subestimaria o passivo de uma empresa do Anexo IV mal cadastrada.
  if (!simplesAnexo) return cheia;
  return 0n;
}

const BodySchema = z.object({
  empresa_id: z.string().uuid(),
  competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM'),
}).refine((d) => {
  const [y, m] = d.competencia.split('-').map(Number);
  const compDate = new Date(Date.UTC(y, m - 1, 1));
  const now = new Date();
  const nowMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const minDate = new Date(Date.UTC(now.getUTCFullYear() - 5, now.getUTCMonth(), 1));
  return compDate <= nowMonth && compDate >= minDate;
}, { message: 'Competência fora do intervalo permitido (últimos 60 meses)' });

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function reaisToCents(v: number): bigint { return BigInt(Math.round(v * 100)); }
function centsToReais(c: bigint): number { return Number(c) / 100; }

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function ultimoDiaCompetencia(competencia: string): string {
  const [y, m] = competencia.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${competencia}-${String(last).padStart(2, '0')}`;
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const forbiddenOrigin = enforceOrigin(req);
  if (forbiddenOrigin) return forbiddenOrigin;
  if (req.method !== 'POST') return json(req, { success: false, error: 'Method not allowed' }, 405);

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json(req, { success: false, error: 'Autenticação obrigatória', code: 'UNAUTHORIZED' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claimsData?.user?.id) {
      return json(req, { success: false, error: 'Sessão inválida', code: 'UNAUTHORIZED' }, 401);
    }
    const userId = claimsData.user.id;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    const raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json(req, { success: false, error: 'Payload inválido', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, 422);
    }
    const { empresa_id, competencia } = parsed.data;

    // Papel, não apenas vínculo: o padrão anterior (`!belongs && !isAdmin`)
    // era um OU — pertencer à empresa já bastava, e o is_admin apenas somava
    // o admin global. Qualquer colaborador autenticado passava.
    {
      const authz = await requireRh(supabase, userId, empresa_id, req);
      if (authz.denied) return authz.denied;
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `calc-provisoes:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl, req);

    const dataLimite = ultimoDiaCompetencia(competencia);
    const startTime = Date.now();

    // Regime tributário da empresa define a alíquota de encargos da provisão.
    const { data: empresa, error: empresaErr } = await supabase
      .from('empresas')
      .select('regime_tributario, simples_anexo')
      .eq('id', empresa_id)
      .maybeSingle<{ regime_tributario: string | null; simples_anexo: string | null }>();
    if (empresaErr) throw empresaErr;
    // Competencia que JA tem linhas manda: o recalculo reaproveita a aliquota
    // GRAVADA naquele mes (20261116120000) em vez de reconsultar o cadastro.
    // Sem isto, mudar o regime da empresa (ou corrigir o anexo do Simples)
    // reescreveria o passivo de meses fechados com uma aliquota que nao era a
    // vigente neles — dinheiro de competencia encerrada nao pode mudar por
    // efeito colateral de uma edicao de cadastro.
    const { data: aplicada, error: aplicadaErr } = await supabase
      .from('provisoes_mensais')
      .select('encargos_aliquota_bps, regime_tributario, simples_anexo')
      .eq('empresa_id', empresa_id)
      .eq('competencia', `${competencia}-01`)
      .not('encargos_aliquota_bps', 'is', null)
      .limit(1)
      .maybeSingle<{ encargos_aliquota_bps: number; regime_tributario: string | null; simples_anexo: string | null }>();
    if (aplicadaErr) throw aplicadaErr;

    const aliquotaOrigem = aplicada ? 'competencia' : 'cadastro';
    const patronaisBps = aplicada
      ? BigInt(aplicada.encargos_aliquota_bps)
      : encargosPatronaisBps(empresa?.regime_tributario ?? null, empresa?.simples_anexo ?? null);
    const regimeAplicado = aplicada ? aplicada.regime_tributario : (empresa?.regime_tributario ?? null);
    const anexoAplicado = aplicada ? aplicada.simples_anexo : (empresa?.simples_anexo ?? null);
    const contratoTributario = {
      encargos_aliquota_bps: Number(patronaisBps),
      regime_tributario: regimeAplicado,
      simples_anexo: anexoAplicado,
    };

    // Contagem prévia
    const { count: total, error: countErr } = await supabase
      .from('colaboradores')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresa_id)
      .eq('status', 'ativo')
      .lte('data_admissao', dataLimite);
    if (countErr) throw countErr;
    if (!total) {
      return json(req, { success: false, error: 'Nenhum colaborador ativo elegível', code: 'NOT_FOUND' }, 404);
    }
    if (total > MAX_COLABS) {
      return json(req, { success: false, error: `Limite excedido (${MAX_COLABS})`, code: 'PAYLOAD_TOO_LARGE' }, 413);
    }

    // Iniciar log
    const { data: logEntry } = await supabase
      .from('provisao_logs')
      .insert({
        empresa_id,
        competencia,
        status: 'PROCESSANDO',
        tipo_calculo: 'AMBOS',
        metadados: { start_time: new Date().toISOString(), user_id: userId },
      })
      .select()
      .single();

    // Chunked fetch + agregação em BigInt
    type Prov = {
      colaborador_id: string;
      tipo: string;
      valor_principal: number;
      encargos_inss: number;
      encargos_fgts: number;
      encargos_aliquota_bps: number;
      regime_tributario: string | null;
      simples_anexo: string | null;
    };
    const provisoes: Prov[] = [];
    let totalPrincipalCents = 0n;
    let totalEncargosCents = 0n;

    for (let offset = 0; offset < total; offset += CHUNK) {
      const { data: colabs, error: fetchErr } = await supabase
        .from('colaboradores')
        .select('id, salario_base')
        .eq('empresa_id', empresa_id)
        .eq('status', 'ativo')
        .lte('data_admissao', dataLimite)
        .range(offset, offset + CHUNK - 1);
      if (fetchErr) throw fetchErr;
      if (!colabs?.length) break;

      for (const c of colabs) {
        const salarioCents = reaisToCents(Number(c.salario_base) || 0);
        if (salarioCents <= 0n) continue;

        // Provisão de Férias: (salário × 4/3) / 12 = salário × 4/36
        const feriasCents = (salarioCents * 4n) / 36n;
        const feriasINSSCents = (feriasCents * patronaisBps) / 1000n;
        const feriasFGTSCents = (feriasCents * FGTS_BPS) / 1000n;

        provisoes.push({
          colaborador_id: c.id,
          tipo: 'ferias',
          valor_principal: centsToReais(feriasCents),
          encargos_inss: centsToReais(feriasINSSCents),
          encargos_fgts: centsToReais(feriasFGTSCents),
          ...contratoTributario,
        });
        totalPrincipalCents += feriasCents;
        totalEncargosCents += feriasINSSCents + feriasFGTSCents;

        // Provisão 13º: salário / 12
        const decimoCents = salarioCents / 12n;
        const decimoINSSCents = (decimoCents * patronaisBps) / 1000n;
        const decimoFGTSCents = (decimoCents * FGTS_BPS) / 1000n;

        provisoes.push({
          colaborador_id: c.id,
          tipo: '13_salario',
          valor_principal: centsToReais(decimoCents),
          encargos_inss: centsToReais(decimoINSSCents),
          encargos_fgts: centsToReais(decimoFGTSCents),
          ...contratoTributario,
        });
        totalPrincipalCents += decimoCents;
        totalEncargosCents += decimoINSSCents + decimoFGTSCents;
      }
    }

    const totalCents = totalPrincipalCents + totalEncargosCents;
    const consolidado = {
      empresa_id,
      competencia,
      total_colaboradores: total,
      total_principal: centsToReais(totalPrincipalCents),
      total_encargos: centsToReais(totalEncargosCents),
      total_provisionado: centsToReais(totalCents),
      ...contratoTributario,
      aliquota_origem: aliquotaOrigem,
      calculado_em: new Date().toISOString(),
    };
    const hash = await sha256Hex(JSON.stringify(consolidado));

    // A substituição e a auditoria obrigatória vivem na mesma transação do
    // PostgreSQL. Uma falha de FK, constraint ou audit_log preserva integralmente
    // o lote anterior; não existe mais o intervalo delete→insert parcial.
    const { data: replacedCount, error: replaceError } = await supabase.rpc(
      'replace_monthly_provisions',
      {
        p_empresa_id: empresa_id,
        p_competencia: competencia,
        p_rows: provisoes,
        p_user_id: userId,
        p_audit_data: { ...consolidado, hash_sha256: hash },
      },
    );
    if (replaceError) throw replaceError;
    if (replacedCount !== provisoes.length) {
      throw new Error('Quantidade persistida diverge da quantidade calculada');
    }

    if (logEntry) {
      await supabase.from('provisao_logs').update({
        status: 'CONCLUIDO',
        total_colaboradores: total,
        valor_total_provisionado: centsToReais(totalCents),
        duracao_ms: Date.now() - startTime,
        metadados: { end_time: new Date().toISOString(), hash_sha256: hash },
      }).eq('id', logEntry.id);
    }

    return json(req, { success: true, ...consolidado, hash_sha256: hash, registros: provisoes.length });
  } catch (error: unknown) {
    try { captureException(error, { fn: 'calcular-provisoes' }); } catch { /* noop */ }
    return json(req, { success: false, error: 'Erro interno ao calcular provisões', code: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
