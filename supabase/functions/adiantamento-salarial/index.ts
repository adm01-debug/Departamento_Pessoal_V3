// Onda 30 — Adiantamento salarial hardened
// - CSRF + JWT + tenant scope
// - Zod strict, centavos BigInt
// - Regras CLT: colaborador ativo, valor ≤ 40% salário, 1 por competência
// - Auditoria bloqueante

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

const noStore = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

const bodySchema = z.object({
  empresa_id: z.string().uuid(),
  colaborador_id: z.string().uuid(),
  valor_centavos: z.number().int().positive().max(100_000_000), // R$ 1M cap absoluto
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Competência deve ser AAAA-MM'),
  motivo: z.string().max(500).optional(),
});

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
    const { empresa_id, colaborador_id, valor_centavos, competencia, motivo } = parsed.data;

    // Tenant scope
    const { data: pertence } = await service.rpc('user_belongs_to_empresa', {
      _user_id: userId, _empresa_id: empresa_id,
    });
    const { data: isAdmin } = await service.rpc('is_admin', { _user_id: userId });
    if (!pertence && !isAdmin) {
      return createErrorResponse('Acesso negado', 403, 'FORBIDDEN');
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(service, { key: `adiantamento:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Colaborador ativo, mesma empresa
    const { data: colab, error: colabErr } = await service
      .from('colaboradores')
      .select('id, empresa_id, status, salario_base')
      .eq('id', colaborador_id)
      .eq('empresa_id', empresa_id)
      .maybeSingle();
    if (colabErr) throw colabErr;
    if (!colab) return createErrorResponse('Colaborador não encontrado', 404, 'NOT_FOUND');
    if (colab.status !== 'ativo') {
      return createErrorResponse('Colaborador não está ativo', 422, 'INACTIVE_EMPLOYEE');
    }

    const salarioCentavos = BigInt(Math.round(Number(colab.salario_base ?? 0) * 100));
    if (salarioCentavos <= 0n) {
      return createErrorResponse('Salário base do colaborador é inválido', 422, 'INVALID_SALARY');
    }

    // Percentual máximo (fallback 40%)
    let pctMax = 40;
    const { data: param } = await service
      .from('parametros_sistema')
      .select('valor')
      .eq('empresa_id', empresa_id)
      .eq('nome', 'ADIANTAMENTO_PCT_MAX')
      .maybeSingle();
    if (param?.valor) {
      const n = Number(param.valor);
      if (Number.isFinite(n) && n > 0 && n <= 100) pctMax = n;
    }

    const limiteCentavos = (salarioCentavos * BigInt(Math.round(pctMax * 100))) / 10_000n;
    if (BigInt(valor_centavos) > limiteCentavos) {
      return createErrorResponse(
        `Valor excede o limite de ${pctMax}% do salário base`,
        422, 'AMOUNT_ABOVE_LIMIT',
      );
    }

    // Duplicidade por competência
    const { data: existente } = await service
      .from('adiantamentos_salariais')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('colaborador_id', colaborador_id)
      .eq('competencia_desconto', competencia)
      .in('status', ['pendente', 'aprovado', 'pago'])
      .limit(1)
      .maybeSingle();
    if (existente) {
      return createErrorResponse(
        'Já existe adiantamento ativo para esta competência',
        409, 'DUPLICATE_ADVANCE',
      );
    }

    const { data: adi, error: insErr } = await service
      .from('adiantamentos_salariais')
      .insert({
        empresa_id,
        colaborador_id,
        valor_solicitado: valor_centavos / 100,
        competencia_desconto: competencia,
        status: 'pendente',
        motivo: motivo ?? null,
        data_solicitacao: new Date().toISOString().slice(0, 10),
      })
      .select('id')
      .single();
    if (insErr || !adi) throw insErr ?? new Error('Falha ao criar adiantamento');

    await service.from('auditoria').insert({
      acao: 'ADIANTAMENTO_CRIADO',
      entidade: 'adiantamentos_salariais',
      entidade_id: adi.id,
      empresa_id,
      usuario_id: userId,
      dados_novos: {
        colaborador_id,
        valor_centavos,
        competencia,
        pct_aplicado: pctMax,
        limite_centavos: Number(limiteCentavos),
      },
    });

    return new Response(
      JSON.stringify({ success: true, id: adi.id }),
      { status: 201, headers: noStore },
    );
  } catch (err) {
    await captureException(err, { function: 'adiantamento-salarial' });
    return createErrorResponse(
      'Erro ao registrar adiantamento', 500, 'INTERNAL_ERROR',
    );
  }
});
