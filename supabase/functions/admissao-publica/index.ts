import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createErrorResponse, getCorsHeaders, handlePreflight, enforceOrigin } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { getClientIp } from '../_shared/clientIp.ts';
import { isOcrDocType, OCR_FALLBACK_ERROR, runDocumentOcr, type OcrDocType } from '../_shared/ocr.ts';

/**
 * admissao-publica — upload de documentos do portal público /contratacao.
 *
 * Desde o P0-004, todo INSERT/UPDATE em admissao_tokens/documentos_admissao
 * foi revogado de anon e authenticated: o único caminho sancionado é
 * service_role. Esta função valida o token de admissão (entropia >= 16,
 * não expirado — mesma guarda da RPC get_admissao_por_token) e faz o
 * upload no bucket `documentos` com escopo de path por admissão.
 *
 * Com `ocr=true` no formulário ela também roda o OCR do documento
 * (`_shared/ocr.ts`) e devolve o resultado em `ocr` — o candidato é anônimo e
 * não tem como ler o próprio arquivo depois do upload.
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
  const csrf = await verifyCsrf(req.clone());
  if (!csrf.ok) return csrf.response!;
  if (req.method !== 'POST') return createErrorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED', undefined, req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const ip = getClientIp(req);
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

    // OCR opcional, pedido junto do upload: o candidato não tem sessão e não
    // conseguiria ler o próprio arquivo depois (nenhuma policy concede SELECT a
    // `anon`). Só os tipos que a UI mapeia entram aqui.
    const wantOcr = String(form.get('ocr') ?? '') === 'true';
    let ocrDocType: OcrDocType | null = null;
    if (wantOcr) {
      const docType = String(form.get('doc_type') ?? '');
      if (!isOcrDocType(docType)) {
        return createErrorResponse('Tipo de documento inválido para OCR', 400, 'BAD_REQUEST', undefined, req);
      }
      ocrDocType = docType;
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
      // Não deixa arquivo órfão no bucket: se o registro falhou, o objeto
      // fica sem referência e cada retry criaria outro.
      const { error: cleanupErr } = await supabase.storage.from(BUCKET).remove([storagePath]);
      if (cleanupErr) {
        await captureException(cleanupErr, { fn: 'admissao-publica', step: 'cleanup_orphan', path: storagePath });
      }
      return createErrorResponse('Documento enviado, mas falhou ao registrar', 500, 'REGISTER_FAILED', undefined, req);
    }

    // OCR é best-effort: o documento já está salvo e registrado, então uma
    // falha de OCR (provedor fora do ar, arquivo ilegível) não pode derrubar o
    // envio — o RH confere manualmente. Por isso o try/catch local: sem ele uma
    // exceção de rede do provedor (safeFetchWithRetry relança ao esgotar as
    // tentativas) cairia no catch geral e devolveria 500 para um documento já
    // gravado, fazendo o candidato reenviar e duplicar o registro.
    // PDF não é imagem: o provedor recebe a URL como `image_url`, então só
    // imagem é enviada ao OCR. O envio do PDF continua valendo.
    let ocr: unknown = null;
    if (ocrDocType && file.type.startsWith('image/')) {
      try {
        const { data: signed, error: signErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(storagePath, 300);
        if (signErr || !signed?.signedUrl) {
          await captureException(signErr ?? new Error('signed url indisponível'), {
            fn: 'admissao-publica',
            step: 'createSignedUrl',
          });
          ocr = { valid: false, confidence: 0, error: OCR_FALLBACK_ERROR };
        } else {
          const run = await runDocumentOcr(signed.signedUrl, ocrDocType);
          ocr = run.ok ? run.result : { valid: false, confidence: 0, error: run.error };
        }
      } catch (ocrErr) {
        await captureException(ocrErr, { fn: 'admissao-publica', step: 'ocr' });
        ocr = { valid: false, confidence: 0, error: OCR_FALLBACK_ERROR };
      }
    }

    return new Response(
      JSON.stringify({ ok: true, path: storagePath, ocr }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    await captureException(err, { fn: 'admissao-publica' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_ERROR', undefined, req);
  }
});
