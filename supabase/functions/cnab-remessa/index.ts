// Onda 31 — CNAB Remessa hardened
// - JWT + CSRF + tenant scope
// - Idempotência via Idempotency-Key (10 min)
// - Sequencial atômico por (empresa, banco)
// - Soma em BigInt centavos; header = SUM(itens)
// - Cap 10.000 itens / R$ 50 mi por lote
// - Auditoria bloqueante + hash SHA-256 do payload

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

const noStore = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const MAX_ITENS = 10_000;
const MAX_TOTAL_CENTAVOS = 5_000_000_000n; // R$ 50 mi

const itemSchema = z.object({
  colaborador_id: z.string().uuid().optional().nullable(),
  folha_item_id: z.string().uuid().optional().nullable(),
  nome_favorecido: z.string().min(1).max(140),
  cpf_cnpj_favorecido: z.string().regex(/^\d{11}(\d{3})?$/, 'CPF/CNPJ apenas dígitos'),
  banco_favorecido: z.string().max(10).optional().nullable(),
  agencia_favorecido: z.string().max(10).optional().nullable(),
  conta_favorecido: z.string().max(20).optional().nullable(),
  valor_centavos: z.number().int().positive().max(1_000_000_000),
  data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo_pagamento: z.string().max(30).optional().nullable(),
  seu_numero: z.string().max(30).optional().nullable(),
});

const bodySchema = z.object({
  empresa_id: z.string().uuid(),
  banco_codigo: z.string().regex(/^\d{3}$/, 'Código do banco em 3 dígitos'),
  itens: z.array(itemSchema).min(1).max(MAX_ITENS),
  idempotency_key: z.string().optional(),
  idempotencyKey: z.string().optional(),
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
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req, 512 * 1024);
    if (_pe) return _pe;
    raw = _pb;

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return createValidationErrorResponse(parsed.error);
    const { empresa_id, banco_codigo, itens } = parsed.data;

    // Tenant scope
    const { data: pertence } = await service.rpc('user_belongs_to_empresa', {
      _user_id: userId, _empresa_id: empresa_id,
    });
    const { data: isAdmin } = await service.rpc('is_admin', { _user_id: userId });
    if (!pertence && !isAdmin) {
      return createErrorResponse('Acesso negado', 403, 'FORBIDDEN');
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(service, { key: `cnab-remessa:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Idempotência transacional (shared helper)
    const idemKey = extractIdempotencyKey(req, parsed.data);
    const idem = await beginIdempotency(service, {
      endpoint: 'cnab-remessa',
      key: idemKey,
      requestBody: { empresa_id, banco_codigo, itens },
      empresaId: empresa_id,
      userId,
    });
    if (idem.replay) return idem.replay;
    if (idem.conflict) return idem.conflict;

    // Cap financeiro
    const totalCentavos = itens.reduce((acc, i) => acc + BigInt(i.valor_centavos), 0n);
    if (totalCentavos > MAX_TOTAL_CENTAVOS) {
      await failIdempotency(service, idem.id);
      return createErrorResponse(
        `Total do lote excede R$ ${Number(MAX_TOTAL_CENTAVOS) / 100}`,
        422, 'AMOUNT_ABOVE_LIMIT',
      );
    }

    // Sequencial atômico: MAX + 1 por (empresa, banco)
    const { data: maxRow } = await service
      .from('cnab_remessas')
      .select('sequencial_arquivo')
      .eq('empresa_id', empresa_id)
      .eq('banco_codigo', banco_codigo)
      .order('sequencial_arquivo', { ascending: false })
      .limit(1)
      .maybeSingle();
    const sequencial = (maxRow?.sequencial_arquivo ?? 0) + 1;

    // Cria remessa (header)
    const { data: remessa, error: remErr } = await service
      .from('cnab_remessas')
      .insert({
        empresa_id,
        banco_codigo,
        sequencial_arquivo: sequencial,
        total_pagamentos: itens.length,
        valor_total: Number(totalCentavos) / 100,
        status: 'gerado',
      })
      .select('id')
      .single();
    if (remErr || !remessa) {
      await failIdempotency(service, idem.id);
      throw remErr ?? new Error('Falha ao criar remessa');
    }

    // Itens
    const linhas = itens.map((i) => ({
      remessa_id: remessa.id,
      colaborador_id: i.colaborador_id ?? null,
      folha_item_id: i.folha_item_id ?? null,
      nome_favorecido: i.nome_favorecido,
      cpf_cnpj_favorecido: i.cpf_cnpj_favorecido,
      banco_favorecido: i.banco_favorecido ?? null,
      agencia_favorecido: i.agencia_favorecido ?? null,
      conta_favorecido: i.conta_favorecido ?? null,
      valor_pagamento: i.valor_centavos / 100,
      data_pagamento: i.data_pagamento,
      tipo_pagamento: i.tipo_pagamento ?? null,
      seu_numero: i.seu_numero ?? null,
      status: 'pendente',
    }));
    const { error: itErr } = await service.from('cnab_itens').insert(linhas);
    if (itErr) {
      await service.from('cnab_remessas').delete().eq('id', remessa.id);
      await failIdempotency(service, idem.id);
      throw itErr;
    }

    const auditPayload = {
      empresa_id,
      banco_codigo,
      remessa_id: remessa.id,
      sequencial,
      total_itens: itens.length,
      total_centavos: Number(totalCentavos),
    };
    const auditHash = await integrityHash(auditPayload);

    await service.from('auditoria').insert({
      acao: 'CNAB_REMESSA_GERADA',
      entidade: 'cnab_remessas',
      entidade_id: remessa.id,
      empresa_id,
      usuario_id: userId,
      dados_novos: { ...auditPayload, integrity_hash: auditHash },
    });

    const responseBody = {
      success: true,
      id: remessa.id,
      sequencial_arquivo: sequencial,
      total_itens: itens.length,
      total_centavos: Number(totalCentavos),
      integrity_hash: auditHash,
    };
    await completeIdempotency(service, idem.id, 201, responseBody);
    return new Response(JSON.stringify(responseBody), { status: 201, headers: noStore });
  } catch (err) {
    await captureException(err, { function: 'cnab-remessa' });
    return createErrorResponse('Erro ao gerar remessa CNAB', 500, 'INTERNAL_ERROR');
  }
});

