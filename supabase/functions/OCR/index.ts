// Remediação de auditoria (achado E3 / CRÍTICO):
// • JWT obrigatório (antes: sem autenticação alguma, service_role exposto)
// • Bucket restrito a uma allowlist de documentos (antes: qualquer bucket)
// • Remove o parâmetro `fileUrl` livre (antes: SSRF — URL arbitrária
//   repassada como image_url para o gateway de IA)
// • Erros genéricos ao cliente (antes: error.message podia vazar detalhes)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

const ALLOWED_BUCKETS = ['documentos', 'colaboradores', 'documents', 'arquivos', 'uploads'];

function isAllowedFileUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    // Block private/internal network ranges
    const h = url.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') ||
        h.startsWith('10.') || h.startsWith('172.16.') || h === '0.0.0.0' ||
        h === '169.254.169.254' || h.endsWith('.internal') || h.endsWith('.local')) {
      return false;
    }
    // Only allow Supabase storage URLs
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    if (!supabaseUrl) return false;
    const supabaseHost = new URL(supabaseUrl).hostname;
    return url.hostname === supabaseHost && url.pathname.includes('/storage/v1/');
  } catch {
    return false;
  }
}

const BodySchema = z.object({
  fileUrl: z.string().url().max(2048).optional(),
  bucket: z.string().min(1).max(100).optional(),
  filePath: z.string().min(1).max(500).optional(),
  documentType: z.enum(['cpf', 'rg', 'ctps', 'comprovante_endereco', 'generic']).optional().default('generic'),
}).refine((d) => d.fileUrl || (d.bucket && d.filePath), {
  message: 'Forneça fileUrl ou bucket+filePath',
}).refine((d) => !d.bucket || ALLOWED_BUCKETS.includes(d.bucket), {
  message: 'Bucket não permitido',
}).refine((d) => !d.fileUrl || isAllowedFileUrl(d.fileUrl), {
  message: 'URL de arquivo não permitida',
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Só buckets de documentos de identidade/admissão fazem sentido para OCR;
// nunca aceitar um bucket arbitrário informado pelo cliente.
const ALLOWED_BUCKETS = new Set(['documentos', 'documentos-admissao']);

function jsonError(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ success: false, error: message, code }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      return json({ success: false, error: 'Autenticação obrigatória', code: 'UNAUTHORIZED' }, 401);
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
      return json({ success: false, error: 'Sessão inválida', code: 'UNAUTHORIZED' }, 401);
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `ocr:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ success: false, error: 'Payload inválido', details: parsed.error.flatten() }, 422);
    }
    const { fileUrl, bucket, filePath, documentType } = parsed.data;

    let imageUrl = fileUrl;
    if (bucket && filePath) {
      const { data: signedUrl } = await supabase.storage.from(bucket).createSignedUrl(filePath, 300);
      imageUrl = signedUrl?.signedUrl;
    }

    if (!imageUrl) {
      return json({ success: false, error: 'URL do arquivo não obtida' }, 400);
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return json({ success: false, error: 'Serviço OCR não configurado', code: 'OCR_NOT_CONFIGURED' }, 503);
    }

    const prompts: Record<string, string> = {
      cpf: 'Extraia o número do CPF desta imagem. Retorne apenas o número no formato XXX.XXX.XXX-XX.',
      rg: 'Extraia os dados do RG: número, nome, filiação, data de nascimento, naturalidade.',
      ctps: 'Extraia os dados da CTPS: número, série, UF, data de emissão.',
      comprovante_endereco: 'Extraia o endereço completo: CEP, logradouro, número, bairro, cidade, UF.',
      generic: 'Extraia todo o texto visível desta imagem de documento.',
    };
    const prompt = prompts[documentType] || prompts.generic;

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovableApiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl } }] }],
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      return json({ success: false, error: 'Erro no serviço de OCR', code: 'OCR_SERVICE_ERROR' }, 502);
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content || '';

    return json({
      success: true,
      documentType,
      extractedText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    try { captureException(error, { fn: 'OCR' }); } catch { /* noop */ }
    return json({ success: false, error: 'Erro interno no OCR', code: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
