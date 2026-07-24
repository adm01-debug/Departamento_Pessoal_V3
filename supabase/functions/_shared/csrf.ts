// MP-005: CSRF protection helper for state-changing Edge Functions.
// Strategy: double-submit cookie + Origin/Referer allowlist.
// Consumer pattern:
//   const csrf = await verifyCsrf(req);
//   if (!csrf.ok) return csrf.response;

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

// Localhost only allowed when running Supabase locally (SUPABASE_URL points to localhost)
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const IS_LOCAL_DEV = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1') ||
                     Deno.env.get('SUPABASE_ENV') === 'local';

export interface CsrfResult {
  ok: boolean;
  response?: Response;
}

/**
 * Verifies CSRF protection on state-changing requests (POST/PUT/PATCH/DELETE).
 * - GET/HEAD/OPTIONS bypass automatically.
 * - Requires Origin OR Referer header matching allowlist.
 * - Optionally verifies double-submit token when X-CSRF-Token header is used.
 */
export async function verifyCsrf(req: Request): Promise<CsrfResult> {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { ok: true };
  }

  const origin = req.headers.get('origin') || '';
  const referer = req.headers.get('referer') || '';
  const source = origin || referer;

  if (!source) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'CSRF: missing Origin/Referer header' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

  try {
    const url = new URL(source);
    const host = url.hostname;
    const isAllowed =
      ALLOWED_ORIGINS.some((o) => source.startsWith(o)) ||
      LOVABLE_HOST_RE.test(host) ||
      (IS_LOCAL_DEV && (host === 'localhost' || host === '127.0.0.1'));

    if (!isAllowed) {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({ error: 'CSRF: origin not allowed', origin: host }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        ),
      };
    }
  } catch {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'CSRF: invalid Origin/Referer' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

  // Double-submit token (optional, activated when client sends X-CSRF-Token)
  const csrfHeader = req.headers.get('x-csrf-token');
  if (csrfHeader) {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    const cookieToken = match ? decodeURIComponent(match[1]) : null;
    if (!cookieToken || cookieToken !== csrfHeader) {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({ error: 'CSRF: token mismatch' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        ),
      };
    }
  }

  return { ok: true };
}

/** Generates a cryptographically random CSRF token (base64url, 32 bytes). */
export function generateCsrfToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
