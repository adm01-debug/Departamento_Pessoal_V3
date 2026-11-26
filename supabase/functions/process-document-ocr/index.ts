import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { z } from 'npm:zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';
import { isAllowedFileUrl, OCR_DOC_TYPES, runDocumentOcr } from '../_shared/ocr.ts';

const BodySchema = z.object({
  fileUrl: z.string().url().max(2048).refine(isAllowedFileUrl, { message: 'URL de arquivo não permitida' }),
  docType: z.enum(OCR_DOC_TYPES).optional().default('generic'),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ valid: false, confidence: 0, error: 'Autenticação obrigatória' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ valid: false, confidence: 0, error: 'Sessão inválida' }, 401);
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `doc-ocr:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl, req);

    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    const raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ valid: false, confidence: 0, error: 'Payload inválido' }, 422);
    }
    const { fileUrl, docType } = parsed.data;

    // O provedor de IA baixa a URL assinada/publica do proprio projeto
    // (isAllowedFileUrl restringe a isso).
    const ocr = await runDocumentOcr(fileUrl, docType);
    if (!ocr.ok) {
      return json({ valid: false, confidence: 0, error: ocr.error }, ocr.status);
    }

    return json(ocr.result);
  } catch (error: unknown) {
    try { captureException(error, { fn: 'process-document-ocr' }); } catch { /* noop */ }
    return json({ valid: false, confidence: 0, error: 'Erro interno no OCR' }, 500);
  }
});
