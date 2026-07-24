// Onda 31 — DCTFWeb hardened
// - JWT + CSRF + tenant scope
// - Competência AAAA-MM, não futura, ≤ 60 meses no passado
// - Débitos: valores em BigInt centavos, > 0, soma = total_debitos
// - Bloqueia duplicidade por (empresa, competencia) em status ativo
// - Hash SHA-256 do payload em auditoria

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

const noStore = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

const debitoSchema = z.object({
  codigo_receita: z.string().min(3).max(10),
  descricao: z.string().min(1).max(200),
  valor_centavos: z.number().int().positive().max(100_000_000_000),
});

const bodySchema = z.object({
  empresa_id: z.string().uuid(),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Competência AAAA-MM'),
  total_remuneracao_centavos: z.number().int().nonnegative().max(1_000_000_000_000),
  total_fgts_centavos: z.number().int().nonnegative().max(1_000_000_000_000),
  debitos: z.array(debitoSchema).min(1).max(500),
});

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function competenciaValida(comp: string): { ok: boolean; msg?: string } {
  const [ay, am] = comp.split('-').map(Number);
  if (am < 1 || am > 12) return { ok: false, msg: 'Mês inválido' };
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  if (ay > y || (ay === y && am > m)) return { ok: false, msg: 'Competência futura' };
  const diffMeses = (y - ay) * 12 + (m - am);
  if (diffMeses > 60) return { ok: false, msg: 'Competência anterior a 60 meses' };
  return { ok: true };
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
    const rl = await checkRateLimit(service, { key: `dctfweb:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const compCheck = competenciaValida(p.competencia);
    if (!compCheck.ok) {
      return createErrorResponse(compCheck.msg!, 422, 'INVALID_COMPETENCIA');
    }

    // Duplicidade
    const { data: existente } = await service
      .from('dctfweb_declaracoes')
      .select('id, status')
      .eq('empresa_id', p.empresa_id)
      .eq('competencia', p.competencia)
      .in('status', ['pendente', 'gerada', 'transmitida'])
      .limit(1)
      .maybeSingle();
    if (existente) {
      return createErrorResponse(
        `Já existe declaração ${existente.status} para ${p.competencia}`,
        409, 'DUPLICATE_DECLARATION',
      );
    }

    const totalDebitos = p.debitos.reduce((a, d) => a + BigInt(d.valor_centavos), 0n);

    const payloadHash = await sha256Hex(JSON.stringify({
      empresa_id: p.empresa_id,
      competencia: p.competencia,
      debitos: p.debitos,
    }));

    const { data: decl, error: insErr } = await service
      .from('dctfweb_declaracoes')
      .insert({
        empresa_id: p.empresa_id,
        competencia: p.competencia,
        status: 'gerada',
        debitos: p.debitos.map((d) => ({
          codigo_receita: d.codigo_receita,
          descricao: d.descricao,
          valor: d.valor_centavos / 100,
        })),
        total_debitos: Number(totalDebitos) / 100,
        total_remuneracao: p.total_remuneracao_centavos / 100,
        total_fgts: p.total_fgts_centavos / 100,
      })
      .select('id')
      .single();
    if (insErr || !decl) throw insErr ?? new Error('Falha ao gerar DCTFWeb');

    await service.from('auditoria').insert({
      acao: 'DCTFWEB_GERADA',
      entidade: 'dctfweb_declaracoes',
      entidade_id: decl.id,
      empresa_id: p.empresa_id,
      usuario_id: userId,
      dados_novos: {
        competencia: p.competencia,
        total_debitos_centavos: Number(totalDebitos),
        total_remuneracao_centavos: p.total_remuneracao_centavos,
        total_fgts_centavos: p.total_fgts_centavos,
        payload_sha256: payloadHash,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        id: decl.id,
        total_debitos_centavos: Number(totalDebitos),
        payload_sha256: payloadHash,
      }),
      { status: 201, headers: noStore },
    );
  } catch (err) {
    await captureException(err, { function: 'dctfweb' });
    return createErrorResponse('Erro ao gerar DCTFWeb', 500, 'INTERNAL_ERROR');
  }
});
