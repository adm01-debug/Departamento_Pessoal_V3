// Onda 30 — Empréstimo consignado hardened
// - CSRF + JWT + tenant scope
// - Cálculo Tabela Price server-side em BigInt centavos (elimina drift)
// - Bloqueio margem consignável 35%
// - Convênio ativo e da mesma empresa
// - Prazo ≤ 84 meses, taxa 0-15%/mês

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

const noStore = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const MARGEM_CONSIGNAVEL_PCT = 35;

const bodySchema = z.object({
  empresa_id: z.string().uuid(),
  colaborador_id: z.string().uuid(),
  convenio_id: z.string().uuid().optional().nullable(),
  instituicao_financeira: z.string().min(1).max(140),
  valor_principal_centavos: z.number().int().positive().max(1_000_000_000), // R$ 10M cap
  taxa_juros_mensal: z.number().min(0).max(15), // %
  prazo_meses: z.number().int().min(1).max(84),
  observacoes: z.string().max(500).optional(),
});

/** Tabela Price em centavos com precisão inteira. Retorna parcela arredondada (banker rounding simples). */
function calcularParcelaPrice(principalCentavos: bigint, taxaMensal: number, n: number): bigint {
  if (taxaMensal === 0) {
    return (principalCentavos + BigInt(n) - 1n) / BigInt(n);
  }
  // pmt = P * i / (1 - (1+i)^-n)   — usar float p/ fator, depois arredondar
  const i = taxaMensal / 100;
  const fator = i / (1 - Math.pow(1 + i, -n));
  const pmtFloat = Number(principalCentavos) * fator;
  return BigInt(Math.round(pmtFloat));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('Não autenticado', 401, 'UNAUTHORIZED');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getUser();
    if (claimsErr || !claims?.user?.id) {
      return createErrorResponse('Não autenticado', 401, 'UNAUTHORIZED');
    }
    const userId = claims.user.id;

    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return createValidationErrorResponse(parsed.error);
    const p = parsed.data;

    // Tenant scope
    const { data: pertence } = await service.rpc('user_belongs_to_empresa', {
      _user_id: userId, _empresa_id: p.empresa_id,
    });
    const { data: isAdmin } = await service.rpc('is_admin', { _user_id: userId });
    if (!pertence && !isAdmin) {
      return createErrorResponse('Acesso negado', 403, 'FORBIDDEN');
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(service, { key: `emprestimo-consignado:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Colaborador ativo com salário
    const { data: colab, error: colabErr } = await service
      .from('colaboradores')
      .select('id, empresa_id, status, salario_base')
      .eq('id', p.colaborador_id)
      .eq('empresa_id', p.empresa_id)
      .maybeSingle();
    if (colabErr) throw colabErr;
    if (!colab) return createErrorResponse('Colaborador não encontrado', 404, 'NOT_FOUND');
    if (colab.status !== 'ativo') {
      return createErrorResponse('Colaborador não está ativo', 422, 'INACTIVE_EMPLOYEE');
    }

    const salarioCentavos = BigInt(Math.round(Number(colab.salario_base ?? 0) * 100));
    if (salarioCentavos <= 0n) {
      return createErrorResponse('Salário base inválido', 422, 'INVALID_SALARY');
    }

    // Convênio (opcional): se informado, precisa ser ativo e da empresa
    if (p.convenio_id) {
      const { data: conv } = await service
        .from('convenios')
        .select('id, ativo, empresa_id')
        .eq('id', p.convenio_id)
        .maybeSingle();
      if (!conv || conv.empresa_id !== p.empresa_id || !conv.ativo) {
        return createErrorResponse(
          'Convênio inválido, inativo ou de outra empresa',
          422, 'INVALID_COVENANT',
        );
      }
    }

    // Parcela do novo empréstimo (Price em centavos)
    const parcelaCentavos = calcularParcelaPrice(
      BigInt(p.valor_principal_centavos), p.taxa_juros_mensal, p.prazo_meses,
    );

    // Somar parcelas ativas existentes
    const { data: ativos } = await service
      .from('emprestimos_consignados')
      .select('valor_parcela')
      .eq('colaborador_id', p.colaborador_id)
      .eq('status', 'ativo');
    const parcelasAtivasCentavos = (ativos ?? []).reduce(
      (acc, e) => acc + BigInt(Math.round(Number(e.valor_parcela ?? 0) * 100)),
      0n,
    );

    const margemMaxCentavos =
      (salarioCentavos * BigInt(MARGEM_CONSIGNAVEL_PCT * 100)) / 10_000n;
    if (parcelasAtivasCentavos + parcelaCentavos > margemMaxCentavos) {
      return createErrorResponse(
        `Parcela excede a margem consignável de ${MARGEM_CONSIGNAVEL_PCT}% do salário`,
        422, 'MARGIN_EXCEEDED',
      );
    }

    // Insert
    const valorTotalCentavos = parcelaCentavos * BigInt(p.prazo_meses);
    const { data: emp, error: insErr } = await service
      .from('emprestimos_consignados')
      .insert({
        empresa_id: p.empresa_id,
        colaborador_id: p.colaborador_id,
        instituicao_financeira: p.instituicao_financeira,
        valor_total: Number(valorTotalCentavos) / 100,
        valor_parcela: Number(parcelaCentavos) / 100,
        numero_parcelas: p.prazo_meses,
        parcelas_pagas: 0,
        taxa_juros: p.taxa_juros_mensal,
        data_inicio: new Date().toISOString().slice(0, 10),
        status: 'ativo',
        observacoes: p.observacoes ?? null,
      })
      .select('id')
      .single();
    if (insErr || !emp) throw insErr ?? new Error('Falha ao registrar empréstimo');

    await service.from('auditoria').insert({
      acao: 'CONSIGNADO_CONTRATADO',
      entidade: 'emprestimos_consignados',
      entidade_id: emp.id,
      empresa_id: p.empresa_id,
      usuario_id: userId,
      dados_novos: {
        colaborador_id: p.colaborador_id,
        convenio_id: p.convenio_id ?? null,
        principal_centavos: p.valor_principal_centavos,
        parcela_centavos: Number(parcelaCentavos),
        prazo_meses: p.prazo_meses,
        taxa_mensal: p.taxa_juros_mensal,
        valor_total_centavos: Number(valorTotalCentavos),
        margem_maxima_centavos: Number(margemMaxCentavos),
        margem_consumida_centavos: Number(parcelasAtivasCentavos + parcelaCentavos),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        id: emp.id,
        parcela_centavos: Number(parcelaCentavos),
        valor_total_centavos: Number(valorTotalCentavos),
      }),
      { status: 201, headers: noStore },
    );
  } catch (err) {
    await captureException(err, { function: 'emprestimo-consignado' });
    return createErrorResponse(
      'Erro ao registrar empréstimo consignado', 500, 'INTERNAL_ERROR',
    );
  }
});
