import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

function isAllowedFileUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const h = url.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') ||
        h.startsWith('10.') || h.startsWith('172.16.') || h === '0.0.0.0' ||
        h === '169.254.169.254' || h.endsWith('.internal') || h.endsWith('.local')) {
      return false;
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    if (!supabaseUrl) return false;
    const supabaseHost = new URL(supabaseUrl).hostname;
    return url.hostname === supabaseHost && url.pathname.includes('/storage/v1/');
  } catch {
    return false;
  }
}

const BodySchema = z.object({
  fileUrl: z.string().url().max(2048).refine(isAllowedFileUrl, { message: 'URL de arquivo não permitida' }),
  docType: z.enum(['cpf', 'rg', 'cnh', 'comprovante_residencia', 'generic']).optional().default('generic'),
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
    if (!rl.allowed) return rateLimitResponse(rl);

    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ valid: false, confidence: 0, error: 'Payload inválido' }, 422);
    }
    const { fileUrl, docType } = parsed.data;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return json({ valid: false, confidence: 0, error: 'Serviço OCR não configurado' }, 503);
    }

    const systemPrompt = `Você é um especialista em OCR de documentos brasileiros (RG, CPF, CNH, Comprovante de Residência).
    Sua tarefa é extrair os dados do documento fornecido e retornar APENAS um objeto JSON estruturado.
    Não inclua explicações ou texto fora do JSON.

    Campos esperados no JSON:
    - valid: boolean (indica se o documento é legível e do tipo correto)
    - confidence: number (0-1)
    - extractedData: {
        nome?: string,
        cpf?: string (formatado),
        data_nascimento?: string (YYYY-MM-DD),
        rg?: string,
        logradouro?: string,
        bairro?: string,
        cidade?: string,
        uf?: string,
        cep?: string
      }
    - error?: string (se valid for false)`;

    const userPrompt = `Analise este documento do tipo: ${docType}.`;

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [{ type: 'text', text: userPrompt }, { type: 'image_url', image_url: { url: fileUrl } }] },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      return json({ valid: false, confidence: 0, error: 'Erro no serviço de OCR' }, 502);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';

    let result: unknown;
    try { result = JSON.parse(content); } catch { result = { valid: false, confidence: 0, error: 'Resposta inválida do OCR' }; }

    return json(result);
  } catch (error: unknown) {
    try { captureException(error, { fn: 'process-document-ocr' }); } catch { /* noop */ }
    return json({ valid: false, confidence: 0, error: 'Erro interno no OCR' }, 500);
  }
});
