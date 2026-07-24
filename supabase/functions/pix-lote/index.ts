// Onda 30 — PIX em lote com hardening enterprise
// - CSRF + JWT + tenant scope
// - Zod strict com validação por tipo de chave PIX
// - Idempotência via header Idempotency-Key (janela de 10 min)
// - Segregation of duties (aprovador != criador)
// - Dupla aprovação acima de threshold
// - Caps de tamanho/valor
// - Mascaramento LGPD de chave PIX em logs
// - BigInt centavos para eliminar drift de float

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import {
  beginIdempotency,
  completeIdempotency,
  extractIdempotencyKey,
  failIdempotency,
} from '../_shared/idempotency.ts';
import { integrityHash } from '../_shared/integrityHash.ts';

const MAX_ITENS = 5_000;
const MAX_VALOR_LOTE_CENTAVOS = 500_000_000n; // R$ 5.000.000,00
const DUPLA_APROVACAO_CENTAVOS = BigInt(
  Deno.env.get('PIX_APROVACAO_DUPLA_CENTAVOS') ?? '10000000', // R$ 100.000,00
);

const noStore = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

// ---------- Validators ----------
const CPF_RE = /^\d{11}$/;
const CNPJ_RE = /^\d{14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{7,14}$/;
const EVP_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validaChavePix(tipo: string, chave: string): boolean {
  const c = chave.trim();
  switch (tipo) {
    case 'cpf': return CPF_RE.test(c.replace(/\D/g, ''));
    case 'cnpj': return CNPJ_RE.test(c.replace(/\D/g, ''));
    case 'email': return EMAIL_RE.test(c) && c.length <= 77;
    case 'telefone': return E164_RE.test(c);
    case 'evp':
    case 'aleatoria': return EVP_RE.test(c);
    default: return false;
  }
}

function mascarar(tipo: string, chave: string): string {
  const c = chave.trim();
  if (tipo === 'cpf') return `***.***.***-${c.slice(-2)}`;
  if (tipo === 'cnpj') return `**.***.***/****-${c.slice(-2)}`;
  if (tipo === 'email') { const [u, d] = c.split('@'); return `${u.slice(0,1)}***@${d ?? '***'}`; }
  if (tipo === 'telefone') return `***${c.slice(-4)}`;
  return '***';
}

const itemSchema = z.object({
  colaborador_id: z.string().uuid().optional().nullable(),
  tipo_chave: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'evp', 'aleatoria']),
  chave_pix: z.string().min(1).max(140),
  valor_centavos: z.number().int().positive().max(50_000_000), // R$ 500k por item
  descricao: z.string().max(140).optional(),
}).refine((i) => validaChavePix(i.tipo_chave, i.chave_pix), {
  message: 'Chave PIX inválida para o tipo informado',
  path: ['chave_pix'],
});

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('criar'),
    empresa_id: z.string().uuid(),
    itens: z.array(itemSchema).min(1).max(MAX_ITENS),
    valor_total_centavos: z.number().int().positive(),
    idempotency_key: z.string().optional(),
    idempotencyKey: z.string().optional(),
  }),
  z.object({
    action: z.literal('aprovar'),
    lote_id: z.string().uuid(),
  }),
]);


// ---------- Handler ----------
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

    let body: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    body = _pb;

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return createValidationErrorResponse(parsed.error);
    const payload = parsed.data;

    // Rate limit — PIX lote é operação financeira pesada: 10 req / min / usuário
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(service, { key: `pix-lote:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // ---------- CRIAR ----------
    if (payload.action === 'criar') {
      // Tenant scope
      const { data: pertence } = await service.rpc('user_belongs_to_empresa', {
        _user_id: userId, _empresa_id: payload.empresa_id,
      });
      const { data: isAdmin } = await service.rpc('is_admin', { _user_id: userId });
      if (!pertence && !isAdmin) {
        return createErrorResponse('Acesso negado', 403, 'FORBIDDEN');
      }

      // Soma e cap
      const soma = payload.itens.reduce((acc, i) => acc + BigInt(i.valor_centavos), 0n);
      if (soma !== BigInt(payload.valor_total_centavos)) {
        return createErrorResponse(
          'Soma dos itens diverge do valor total declarado',
          422, 'AMOUNT_MISMATCH',
        );
      }
      if (soma > MAX_VALOR_LOTE_CENTAVOS) {
        return createErrorResponse(
          `Valor total excede o limite de R$ ${Number(MAX_VALOR_LOTE_CENTAVOS) / 100}`,
          422, 'LIMIT_EXCEEDED',
        );
      }

      // Idempotência transacional (shared helper)
      const idemKey = extractIdempotencyKey(req, payload);
      const idem = await beginIdempotency(service, {
        endpoint: 'pix-lote:criar',
        key: idemKey,
        requestBody: { empresa_id: payload.empresa_id, itens: payload.itens, valor_total_centavos: payload.valor_total_centavos },
        empresaId: payload.empresa_id,
        userId,
      });
      if (idem.replay) return idem.replay;
      if (idem.conflict) return idem.conflict;

      // Insert lote
      const { data: lote, error: loteErr } = await service
        .from('pix_lotes')
        .insert({
          empresa_id: payload.empresa_id,
          status: 'pendente_aprovacao',
          valor_total: Number(soma) / 100,
          quantidade_pagamentos: payload.itens.length,
        })
        .select('id')
        .single();
      if (loteErr || !lote) {
        await failIdempotency(service, idem.id);
        throw loteErr ?? new Error('Falha ao criar lote');
      }

      // Insert itens
      const itensInsert = payload.itens.map((i) => ({
        lote_id: lote.id,
        colaborador_id: i.colaborador_id ?? null,
        chave_pix: i.chave_pix.trim(),
        tipo_chave: i.tipo_chave,
        valor: i.valor_centavos / 100,
        descricao: i.descricao ?? null,
        status: 'pendente',
      }));
      const { error: itensErr } = await service.from('pix_itens').insert(itensInsert);
      if (itensErr) {
        await service.from('pix_lotes').delete().eq('id', lote.id);
        await failIdempotency(service, idem.id);
        throw itensErr;
      }

      const auditPayload = {
        empresa_id: payload.empresa_id,
        lote_id: lote.id,
        quantidade: payload.itens.length,
        valor_total_centavos: Number(soma),
        exige_dupla_aprovacao: soma >= DUPLA_APROVACAO_CENTAVOS,
      };
      const auditHash = await integrityHash(auditPayload);

      // Auditoria bloqueante — operação financeira exige non-repudiation
      const { error: auditErr } = await service.from('auditoria').insert({
        acao: 'PIX_LOTE_CRIADO',
        entidade: 'pix_lotes',
        entidade_id: lote.id,
        empresa_id: payload.empresa_id,
        usuario_id: userId,
        dados_novos: {
          ...auditPayload,
          amostra: payload.itens.slice(0, 3).map((i) => ({
            tipo: i.tipo_chave,
            chave_mascarada: mascarar(i.tipo_chave, i.chave_pix),
            valor_centavos: i.valor_centavos,
          })),
          integrity_hash: auditHash,
        },
      });
      if (auditErr) {
        await service.from('pix_lotes').delete().eq('id', lote.id);
        await service.from('pix_itens').delete().eq('lote_id', lote.id);
        await failIdempotency(service, idem.id);
        throw auditErr;
      }

      const responseBody = {
        success: true,
        lote_id: lote.id,
        exige_dupla_aprovacao: soma >= DUPLA_APROVACAO_CENTAVOS,
        integrity_hash: auditHash,
      };
      await completeIdempotency(service, idem.id, 201, responseBody);
      return new Response(JSON.stringify(responseBody), { status: 201, headers: noStore });
    }



    // ---------- APROVAR ----------
    const { data: lote, error: findErr } = await service
      .from('pix_lotes')
      .select('id, empresa_id, status, valor_total')
      .eq('id', payload.lote_id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!lote) return createErrorResponse('Lote não encontrado', 404, 'NOT_FOUND');

    const { data: pertence } = await service.rpc('user_belongs_to_empresa', {
      _user_id: userId, _empresa_id: lote.empresa_id,
    });
    const { data: isAdmin } = await service.rpc('is_admin', { _user_id: userId });
    if (!pertence && !isAdmin) {
      return createErrorResponse('Acesso negado', 403, 'FORBIDDEN');
    }

    if (lote.status !== 'pendente_aprovacao' && lote.status !== 'aprovado_parcial') {
      return createErrorResponse(
        'Lote não está em estado aprovável', 409, 'INVALID_STATE',
      );
    }

    // Segregação e dupla aprovação — via auditoria (schema não tem colunas dedicadas)
    const { data: auditRows } = await service
      .from('auditoria')
      .select('acao, usuario_id')
      .eq('entidade', 'pix_lotes')
      .eq('entidade_id', lote.id);

    const criador = auditRows?.find((a) => a.acao === 'PIX_LOTE_CRIADO')?.usuario_id;
    if (criador === userId) {
      return createErrorResponse(
        'Aprovador não pode ser o mesmo criador do lote (segregação de funções)',
        403, 'SEGREGATION_OF_DUTIES',
      );
    }
    const aprovadoresPrevios = new Set(
      (auditRows ?? []).filter((a) => a.acao === 'PIX_LOTE_APROVADO').map((a) => a.usuario_id),
    );
    if (aprovadoresPrevios.has(userId)) {
      return createErrorResponse('Você já aprovou este lote', 409, 'ALREADY_APPROVED');
    }

    const valorCentavos = BigInt(Math.round(Number(lote.valor_total) * 100));
    const exigeDupla = valorCentavos >= DUPLA_APROVACAO_CENTAVOS;
    const totalAprovacoes = aprovadoresPrevios.size + 1;
    const suficiente = exigeDupla ? totalAprovacoes >= 2 : totalAprovacoes >= 1;

    // Auditoria bloqueante — aprovação financeira exige non-repudiation
    const { error: approvalAuditErr } = await service.from('auditoria').insert({
      acao: 'PIX_LOTE_APROVADO',
      entidade: 'pix_lotes',
      entidade_id: lote.id,
      empresa_id: lote.empresa_id,
      usuario_id: userId,
      dados_novos: { aprovacao_num: totalAprovacoes, exige_dupla: exigeDupla },
    });
    if (approvalAuditErr) throw approvalAuditErr;

    const novoStatus = suficiente ? 'aprovado' : 'aprovado_parcial';
    const { error: updateErr } = await service.from('pix_lotes').update({ status: novoStatus }).eq('id', lote.id);
    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ success: true, status: novoStatus, aprovacoes: totalAprovacoes }),
      { status: 200, headers: noStore },
    );
  } catch (err) {
    await captureException(err, { function: 'pix-lote' });
    return createErrorResponse(
      'Erro ao processar lote PIX', 500, 'INTERNAL_ERROR',
    );
  }
});
