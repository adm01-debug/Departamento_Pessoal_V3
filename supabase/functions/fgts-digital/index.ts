// Onda 31 — FGTS Digital hardened
// - JWT + CSRF + tenant scope
// - Competência AAAA-MM válida, não futura, ≤ 60 meses
// - Valor em BigInt centavos, > 0
// - Bloqueia duplicidade por (empresa, competencia, tipo) ativo
// - Vencimento obrigatório e ≥ hoje
// - Hash SHA-256 em auditoria + log em fgts_digital_logs

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

const noStore = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

const bodySchema = z.object({
  empresa_id: z.string().uuid(),
  competencia: z.string().regex(/^\d{4}-\d{2}$/),
  tipo: z.enum(['mensal', 'rescisorio', 'complementar']),
  valor_total_centavos: z.number().int().positive().max(100_000_000_000),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  const diff = (y - ay) * 12 + (m - am);
  if (diff > 60) return { ok: false, msg: 'Competência anterior a 60 meses' };
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

    const { data: pertence } = await service.rpc('user_belongs_to_empresa', {
      _user_id: userId, _empresa_id: p.empresa_id,
    });
    const { data: isAdmin } = await service.rpc('is_admin', { _user_id: userId });
    if (!pertence && !isAdmin) {
      return createErrorResponse('Acesso negado', 403, 'FORBIDDEN');
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(service, { key: `fgts-digital:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const cc = competenciaValida(p.competencia);
    if (!cc.ok) return createErrorResponse(cc.msg!, 422, 'INVALID_COMPETENCIA');

    // vencimento não pode ser retroativo
    const hoje = new Date().toISOString().slice(0, 10);
    if (p.vencimento < hoje) {
      return createErrorResponse('Vencimento retroativo', 422, 'INVALID_DUE_DATE');
    }

    // Duplicidade por competencia+tipo
    const { data: existente } = await service
      .from('guias_fgts_digital')
      .select('id, status')
      .eq('empresa_id', p.empresa_id)
      .eq('competencia', p.competencia)
      .eq('tipo', p.tipo)
      .in('status', ['pendente', 'gerada', 'transmitida', 'paga'])
      .limit(1)
      .maybeSingle();
    if (existente) {
      return createErrorResponse(
        `Guia FGTS ${p.tipo} ${p.competencia} já existe (${existente.status})`,
        409, 'DUPLICATE_GUIDE',
      );
    }

    const payloadHash = await sha256Hex(JSON.stringify({
      empresa_id: p.empresa_id,
      competencia: p.competencia,
      tipo: p.tipo,
      valor_centavos: p.valor_total_centavos,
    }));

    const protocolo = `FGD-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const { data: guia, error: insErr } = await service
      .from('guias_fgts_digital')
      .insert({
        empresa_id: p.empresa_id,
        competencia: p.competencia,
        tipo: p.tipo,
        valor_total: p.valor_total_centavos / 100,
        vencimento: p.vencimento,
        status: 'gerada',
        gfd_protocolo: protocolo,
        gfd_data_geracao: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (insErr || !guia) throw insErr ?? new Error('Falha ao gerar guia FGTS');

    // Log específico
    await service.from('fgts_digital_logs').insert({
      guia_id: guia.id,
      acao: 'GERACAO',
      detalhes: {
        protocolo,
        valor_centavos: p.valor_total_centavos,
        payload_sha256: payloadHash,
        usuario_id: userId,
      },
    });

    await service.from('auditoria').insert({
      acao: 'FGTS_DIGITAL_GERADA',
      entidade: 'guias_fgts_digital',
      entidade_id: guia.id,
      empresa_id: p.empresa_id,
      usuario_id: userId,
      dados_novos: {
        competencia: p.competencia,
        tipo: p.tipo,
        valor_centavos: p.valor_total_centavos,
        vencimento: p.vencimento,
        protocolo,
        payload_sha256: payloadHash,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        id: guia.id,
        protocolo,
        payload_sha256: payloadHash,
      }),
      { status: 201, headers: noStore },
    );
  } catch (err) {
    await captureException(err, { function: 'fgts-digital' });
    return createErrorResponse('Erro ao gerar guia FGTS Digital', 500, 'INTERNAL_ERROR');
  }
});
