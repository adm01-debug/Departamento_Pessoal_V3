import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, createErrorResponse, getCorsHeaders, handlePreflight, enforceOrigin } from '../_shared/contract.ts';
import { captureException } from '../_shared/sentry.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

/**
 * admissao-publica — upload de documentos do portal público /contratacao.
 *
 * Desde o P0-004, todo INSERT/UPDATE em admissao_tokens/documentos_admissao
 * foi revogado de anon e authenticated: o único caminho sancionado é
 * service_role. Esta função valida o token de admissão (entropia >= 16,
 * não expirado — mesma guarda da RPC get_admissao_por_token) e faz o
 * upload no bucket `documentos` com escopo de path por admissão.
 *
 * As escritas JSON do portal vão pelas RPCs admissao_* (migration
 * 20261002103000); esta função existe só porque Storage exige service_role
 * para uploads de candidatos não autenticados.
 */
const BUCKET = 'documentos';
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_TIPO = /^[a-z0-9_]{1,40}$/;

serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const originDenied = enforceOrigin(req);
  if (originDenied) return originDenied;
  if (req.method !== 'POST') return createErrorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED', undefined, req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = await checkRateLimit(supabase, { key: `admissao-publica:${ip}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl, req);

    const form = await req.formData().catch(() => null);
    if (!form) return createErrorResponse('Payload inválido (esperado multipart/form-data)', 400, 'BAD_REQUEST', undefined, req);

    const token = String(form.get('token') ?? '');
    const tipo = String(form.get('tipo') ?? '');
    const file = form.get('file');

    if (token.length < 16) {
      return createErrorResponse('Token inválido', 401, 'INVALID_TOKEN', undefined, req);
    }
    if (!ALLOWED_TIPO.test(tipo)) {
      return createErrorResponse('Tipo de documento inválido', 400, 'BAD_REQUEST', undefined, req);
    }
    if (!(file instanceof File) || file.size === 0) {
      return createErrorResponse('Arquivo ausente', 400, 'BAD_REQUEST', undefined, req);
    }
    if (file.size > MAX_FILE_BYTES) {
      return createErrorResponse('Arquivo excede 10MB', 413, 'PAYLOAD_TOO_LARGE', undefined, req);
    }

    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return createErrorResponse('Extensão não permitida (pdf, jpg, png, webp)', 400, 'BAD_REQUEST', undefined, req);
    }

    // Valida o token exatamente como public._admissao_token_row:
    // match exato + não expirado (NULL = legado sem expiração).
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('admissao_tokens')
      .select('id, admissao_id, data_expiracao')
      .eq('token', token)
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return createErrorResponse('Token inválido ou expirado', 401, 'INVALID_TOKEN', undefined, req);
    }
    if (tokenRow.data_expiracao && new Date(tokenRow.data_expiracao).getTime() <= Date.now()) {
      return createErrorResponse('Token inválido ou expirado', 401, 'INVALID_TOKEN', undefined, req);
    }

    const storagePath = `admissao_${tokenRow.admissao_id}/${tipo}_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type || 'application/octet-stream', upsert: false });

    if (uploadErr) {
      await captureException(uploadErr, { fn: 'admissao-publica', step: 'storage.upload' });
      return createErrorResponse('Falha no upload', 500, 'UPLOAD_FAILED', undefined, req);
    }

    // Registro vai pela RPC token-scoped — mantém um único caminho de escrita.
    const { error: rpcErr } = await supabase.rpc('admissao_registrar_documento', {
      _token: token,
      _tipo: tipo,
      _nome_arquivo: file.name,
      _url: storagePath,
      _tamanho_bytes: file.size,
    });

    if (rpcErr) {
      await captureException(rpcErr, { fn: 'admissao-publica', step: 'registrar_documento' });
      return createErrorResponse('Documento enviado, mas falhou ao registrar', 500, 'REGISTER_FAILED', undefined, req);
    }

    return new Response(
      JSON.stringify({ ok: true, path: storagePath }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    await captureException(err, { fn: 'admissao-publica' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_ERROR', undefined, req);
  }
});
