// Upload de certificado digital A1 (.pfx) — item #8 do levantamento.
// Antes: a tela gravava a senha do .pfx em TEXTO CLARO na coluna
// `senha_encriptada` via bridge e inventava issuer/validade.
// Agora: a senha e o arquivo são cifrados server-side com
// `encrypt_dados_bancarios` (AES-256, chave no vault) via service_role —
// a credencial nunca trafega pela bridge nem repousa em claro no banco.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import {
  createErrorResponse,
  enforceOrigin,
  handlePreflight,
  parseJsonBody,
} from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { requireRh } from '../_shared/authz.ts';
import { requireAal2 } from '../_shared/aal2.ts';
import { captureException } from '../_shared/sentry.ts';

const BodySchema = z.object({
  empresaId: z.string().uuid(),
  nome: z.string().min(1).max(200),
  cnpj: z.string().max(18).optional(),
  issuer: z.string().min(1).max(200),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  arquivoBase64: z.string().min(64).max(8_000_000),
  senha: z.string().min(1).max(200),
});

serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const forbiddenOrigin = enforceOrigin(req);
  if (forbiddenOrigin) return forbiddenOrigin;
  if (req.method !== 'POST') return createErrorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED', undefined, req);

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED', undefined, req);
    }
    // Upload de credencial sensível exige sessão elevada (MFA).
    const aal = requireAal2(req);
    if (!aal.ok) return aal.response!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED', undefined, req);

    const { body: rawBody, errorResponse } = await parseJsonBody(req);
    if (errorResponse) return errorResponse;
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) return createErrorResponse('Payload inválido', 400, 'INVALID_PAYLOAD', undefined, req);
    const body = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const authz = await requireRh(admin, user.id, body.empresaId, req);
    if (authz.denied) return authz.denied;

    const { data: senhaEnc, error: encErr1 } = await admin.rpc('encrypt_dados_bancarios', { plain: body.senha });
    if (encErr1 || !senhaEnc) {
      captureException(encErr1, { fn: 'upload-certificado', step: 'encrypt_senha' });
      return createErrorResponse('Falha ao proteger credencial', 500, 'ENCRYPT_FAILED', undefined, req);
    }
    const { data: arquivoEnc, error: encErr2 } = await admin.rpc('encrypt_dados_bancarios', { plain: body.arquivoBase64 });
    if (encErr2 || !arquivoEnc) {
      captureException(encErr2, { fn: 'upload-certificado', step: 'encrypt_arquivo' });
      return createErrorResponse('Falha ao proteger arquivo', 500, 'ENCRYPT_FAILED', undefined, req);
    }

    const { data: cert, error: insErr } = await admin
      .from('certificados_digitais')
      .insert({
        empresa_id: body.empresaId,
        nome: body.nome,
        cnpj: body.cnpj ?? null,
        tipo: 'A1',
        issuer: body.issuer,
        valid_from: body.validFrom,
        valid_to: body.validTo,
        senha_encriptada: senhaEnc as string,
        arquivo_base64: arquivoEnc as string,
      })
      .select('id, nome, issuer, valid_from, valid_to, created_at')
      .single();
    if (insErr || !cert) {
      captureException(insErr, { fn: 'upload-certificado', step: 'insert' });
      return createErrorResponse('Falha ao registrar certificado', 500, 'INSERT_FAILED', undefined, req);
    }

    return new Response(JSON.stringify({ ok: true, certificado: cert }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    captureException(err, { fn: 'upload-certificado' });
    return createErrorResponse('Erro interno', 500, 'INTERNAL_ERROR', undefined, req);
  }
});
