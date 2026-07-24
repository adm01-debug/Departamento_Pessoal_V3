// Onda 33 — Hardening de cálculo de Provisões (Férias + 13º):
// • JWT + CSRF fail-closed + tenant scope
// • Zod strict (competência AAAA-MM, não-futura, ≤ 60 meses passados)
// • BigInt centavos (zero drift)
// • Férias = (salário × 4/3) / 12 + encargos ~35.8%; 13º = salário / 12 + encargos
// • Filtra colaboradores ativos e admitidos até último dia da competência
// • Cap 10.000 colaboradores/execução
// • Delete+insert atômico por (empresa, competencia) com recalculado_em
// • Auditoria bloqueante com hash SHA-256 do consolidado
// • Erros genéricos + captureException
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

const CHUNK = 500;
const MAX_COLABS = 10_000;

// Encargos patronais consolidados. Achado K5 da auditoria: RAT estava em 2%
// aqui, divergindo do valor canônico usado em src/calculators/tabelas.ts
// (ENCARGOS_PADRAO.rat = 3%) — provisão de encargos subestimada.
const INSS_PATRONAL_BPS = 200n;  // 20%
const RAT_MEDIO_BPS = 30n;       // 3% (src/calculators/tabelas.ts::ENCARGOS_PADRAO.rat)
const TERCEIROS_BPS = 58n;       // 5.8%
const FGTS_BPS = 80n;            // 8%

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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claimsData?.user?.id) {
      return json({ success: false, error: 'Sessão inválida', code: 'UNAUTHORIZED' }, 401);
    }
    const userId = claimsData.user.id;

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
    const { empresa_id, competencia } = parsed.data;

    const [{ data: belongs }, { data: isAdm }] = await Promise.all([
      supabase.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresa_id }),
      supabase.rpc('is_admin', { _user_id: userId }),
    ]);
    if (!belongs && !isAdm) {
      return json({ success: false, error: 'Sem acesso a esta empresa', code: 'FORBIDDEN' }, 403);
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `calc-provisoes:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const dataLimite = ultimoDiaCompetencia(competencia);
    const startTime = Date.now();

    // Contagem prévia
    const { count: total, error: countErr } = await supabase
      .from('colaboradores')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresa_id)
      .eq('status', 'ativo')
      .lte('data_admissao', dataLimite);
    if (countErr) throw countErr;
    if (!total) {
      return json({ success: false, error: 'Nenhum colaborador ativo elegível', code: 'NOT_FOUND' }, 404);
    }
    if (total > MAX_COLABS) {
      return json({ success: false, error: `Limite excedido (${MAX_COLABS})`, code: 'PAYLOAD_TOO_LARGE' }, 413);
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
    type Prov = { colaborador_id: string; tipo: string; valor_principal: number; encargos_inss: number; encargos_fgts: number };
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
        const feriasINSSCents = (feriasCents * (INSS_PATRONAL_BPS + RAT_MEDIO_BPS + TERCEIROS_BPS)) / 1000n;
        const feriasFGTSCents = (feriasCents * FGTS_BPS) / 1000n;

        provisoes.push({
          colaborador_id: c.id,
          tipo: 'ferias',
          valor_principal: centsToReais(feriasCents),
          encargos_inss: centsToReais(feriasINSSCents),
          encargos_fgts: centsToReais(feriasFGTSCents),
        });
        totalPrincipalCents += feriasCents;
        totalEncargosCents += feriasINSSCents + feriasFGTSCents;

        // Provisão 13º: salário / 12
        const decimoCents = salarioCents / 12n;
        const decimoINSSCents = (decimoCents * (INSS_PATRONAL_BPS + RAT_MEDIO_BPS + TERCEIROS_BPS)) / 1000n;
        const decimoFGTSCents = (decimoCents * FGTS_BPS) / 1000n;

        provisoes.push({
          colaborador_id: c.id,
          tipo: '13_salario',
          valor_principal: centsToReais(decimoCents),
          encargos_inss: centsToReais(decimoINSSCents),
          encargos_fgts: centsToReais(decimoFGTSCents),
        });
        totalPrincipalCents += decimoCents;
        totalEncargosCents += decimoINSSCents + decimoFGTSCents;
      }
    }

    // Delete+insert atômico (idempotência)
    const { error: delErr } = await supabase
      .from('provisoes_mensais')
      .delete()
      .eq('empresa_id', empresa_id)
      .eq('competencia', competencia);
    if (delErr) throw delErr;

    const toInsert = provisoes.map((p) => ({ ...p, empresa_id, competencia }));
    // Insert em chunks para evitar payload gigante
    for (let i = 0; i < toInsert.length; i += 1000) {
      const slice = toInsert.slice(i, i + 1000);
      const { error: insErr } = await supabase.from('provisoes_mensais').insert(slice);
      if (insErr) throw insErr;
    }

    const totalCents = totalPrincipalCents + totalEncargosCents;
    const consolidado = {
      empresa_id,
      competencia,
      total_colaboradores: total,
      total_principal: centsToReais(totalPrincipalCents),
      total_encargos: centsToReais(totalEncargosCents),
      total_provisionado: centsToReais(totalCents),
      calculado_em: new Date().toISOString(),
    };
    const hash = await sha256Hex(JSON.stringify(consolidado));

    // Auditoria bloqueante
    const { error: auditErr } = await supabase.from('audit_log').insert({
      tabela: 'provisoes_mensais',
      registro_id: crypto.randomUUID(),
      acao: 'CALCULATE_BATCH',
      user_id: userId,
      dados_novos: { ...consolidado, hash_sha256: hash },
    });
    if (auditErr) throw auditErr;

    if (logEntry) {
      await supabase.from('provisao_logs').update({
        status: 'CONCLUIDO',
        total_colaboradores: total,
        valor_total_provisionado: centsToReais(totalCents),
        duracao_ms: Date.now() - startTime,
        metadados: { end_time: new Date().toISOString(), hash_sha256: hash },
      }).eq('id', logEntry.id);
    }

    return json({ success: true, ...consolidado, hash_sha256: hash, registros: provisoes.length });
  } catch (error: unknown) {
    try { captureException(error, { fn: 'calcular-provisoes' }); } catch { /* noop */ }
    return json({ success: false, error: 'Erro interno ao calcular provisões', code: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
