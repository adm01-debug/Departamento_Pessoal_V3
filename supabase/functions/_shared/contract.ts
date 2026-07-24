import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

export type StandardErrorResponse = {
  error: {
    code: string;
    message: string;
    fields?: Array<{
      field: string;
      message: string;
    }>;
  };
};

// EXTRA_ALLOWED_ORIGINS permite adicionar origens via env sem alterar código.
// Formato: lista separada por vírgulas, ex: "https://app.exemplo.com,https://staging.exemplo.com"
const _extraOrigins = (Deno.env.get('EXTRA_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [
  'https://sistema-dp.lovable.app',
  'https://unified-harmony-hub.lovable.app',
  ..._extraOrigins,
];
const LOVABLE_HOST_RE = /\.lovable\.(app|dev)$/;

// Localhost only allowed when running Supabase locally
const _supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const IS_LOCAL_DEV = _supabaseUrl.includes('localhost') || _supabaseUrl.includes('127.0.0.1') ||
                     Deno.env.get('SUPABASE_ENV') === 'local';

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  // Strict: rejeitar espaços, controle, null-byte ou unicode não-ASCII no header Origin.
  // (WHATWG URL faz trim silencioso; queremos falhar fechado.)
  if (origin !== origin.trim()) return false;
  if (/[\u0000-\u001F\u007F-\uFFFF]/.test(origin)) return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const host = url.hostname;
    return (
      ALLOWED_ORIGINS.includes(origin) ||
      LOVABLE_HOST_RE.test(host) ||
      (IS_LOCAL_DEV && (host === 'localhost' || host === '127.0.0.1'))
    );
  } catch {
    return false;
  }
}

export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') || '';
  const allowedOrigin = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256, idempotency-key, x-csrf-token',
    'Access-Control-Expose-Headers': 'idempotent-replay',
    'Vary': 'Origin',
    ...securityHeaders,
  };
}

export const corsHeaders = getCorsHeaders();

/**
 * Strict origin gate. Retorna Response 403 quando o Origin é enviado
 * mas não está na allowlist. Use no início de toda edge function
 * (após handlePreflight). Requests sem header Origin (server-to-server,
 * curl, cron) passam livremente.
 */
export function enforceOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  if (isOriginAllowed(origin)) return null;
  return new Response(
    JSON.stringify({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Origin não autorizado' } }),
    { status: 403, headers: { 'Content-Type': 'application/json', ...securityHeaders } }
  );
}

/**
 * Handler padrão de preflight CORS. Retorna 204 com headers ecoados
 * apenas se o Origin for permitido; caso contrário 403.
 */
export function handlePreflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  const origin = req.headers.get('origin') || '';
  if (origin && !isOriginAllowed(origin)) {
    return new Response(null, { status: 403, headers: securityHeaders });
  }
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export function createErrorResponse(
  message: string,
  status: number = 400,
  code: string = 'BAD_REQUEST',
  fields?: Array<{ field: string; message: string }>,
  req?: Request,
): Response {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
        fields,
      },
    }),
    {
      status,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    }
  );
}

export function createValidationErrorResponse(zodError: z.ZodError, req?: Request): Response {
  const fields = zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return createErrorResponse(
    'Erro de validação nos dados fornecidos',
    422,
    'VALIDATION_ERROR',
    fields,
    req,
  );
}

const DEFAULT_MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB

export async function parseJsonBody(
  req: Request,
  maxBytes: number = DEFAULT_MAX_PAYLOAD_BYTES
): Promise<{ body?: unknown; errorResponse?: Response }> {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return {
      errorResponse: createErrorResponse(
        `Payload excede o limite de ${Math.round(maxBytes / 1024)} KB`,
        413,
        'PAYLOAD_TOO_LARGE'
      ),
    };
  }

  try {
    const raw = await req.text();
    if (raw.length > maxBytes) {
      return {
        errorResponse: createErrorResponse(
          `Payload excede o limite de ${Math.round(maxBytes / 1024)} KB`,
          413,
          'PAYLOAD_TOO_LARGE'
        ),
      };
    }
    const parsed = JSON.parse(raw);
    return { body: parsed };
  } catch {
    return {
      errorResponse: createErrorResponse(
        'JSON inválido ou corpo da requisição ausente',
        400,
        'INVALID_JSON'
      ),
    };
  }
}

export async function validateRequest<T>(
  req: Request,
  schema: z.Schema<T>,
  maxBytes: number = DEFAULT_MAX_PAYLOAD_BYTES
): Promise<{ data?: T; errorResponse?: Response }> {
  const { body, errorResponse } = await parseJsonBody(req, maxBytes);
  if (errorResponse) return { errorResponse };

  const result = schema.safeParse(body);
  if (!result.success) {
    return { errorResponse: createValidationErrorResponse(result.error) };
  }
  return { data: result.data };
}
