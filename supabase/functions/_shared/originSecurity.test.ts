import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { enforceOrigin, getCorsHeaders, handlePreflight } from './contract.ts';
import { verifyCsrf } from './csrf.ts';

const CANONICAL_ORIGIN = 'https://unified-harmony-hub.lovable.app';
const WRONG_LEGACY_ORIGIN = 'https://sistema-dp.lovable.app';
const UNCONFIGURED_PREVIEW =
  'https://id-preview--6b75936b-47df-442a-8778-2840c71d84af.lovable.app';

function request(method: string, origin?: string, headers: HeadersInit = {}): Request {
  const merged = new Headers(headers);
  if (origin !== undefined) merged.set('origin', origin);
  return new Request('https://functions.example.test/endpoint', { method, headers: merged });
}

Deno.test('origin gate permite somente a origem canônica explícita', () => {
  assertEquals(enforceOrigin(request('POST', CANONICAL_ORIGIN)), null);
  assertEquals(enforceOrigin(request('POST', WRONG_LEGACY_ORIGIN))?.status, 403);
  assertEquals(enforceOrigin(request('POST', UNCONFIGURED_PREVIEW))?.status, 403);
});

Deno.test('origin gate bloqueia prefixo/sufixo malicioso e aceita server-to-server', () => {
  const malicious = `${CANONICAL_ORIGIN}.evil.example`;
  assertEquals(enforceOrigin(request('POST', malicious))?.status, 403);
  assertEquals(enforceOrigin(request('POST')), null);
});

Deno.test('CORS ecoa a origem canônica e nega preflight legado', () => {
  assertEquals(
    getCorsHeaders(request('GET', CANONICAL_ORIGIN))['Access-Control-Allow-Origin'],
    CANONICAL_ORIGIN,
  );
  assertEquals(handlePreflight(request('OPTIONS', CANONICAL_ORIGIN))?.status, 204);
  assertEquals(handlePreflight(request('OPTIONS', WRONG_LEGACY_ORIGIN))?.status, 403);
});

Deno.test('CSRF permite origem canônica e bloqueia domínio legado/preview', async () => {
  assertEquals((await verifyCsrf(request('POST', CANONICAL_ORIGIN))).ok, true);
  assertEquals((await verifyCsrf(request('POST', WRONG_LEGACY_ORIGIN))).ok, false);
  assertEquals((await verifyCsrf(request('POST', UNCONFIGURED_PREVIEW))).ok, false);
});

Deno.test('CSRF usa igualdade de origin, não comparação por prefixo', async () => {
  const malicious = `${CANONICAL_ORIGIN}.evil.example/path`;
  assertEquals((await verifyCsrf(request('POST', undefined, { referer: malicious }))).ok, false);
});

Deno.test('CSRF exige origem em mutação e valida double-submit token', async () => {
  assertEquals((await verifyCsrf(request('POST'))).ok, false);
  assertEquals((await verifyCsrf(request('GET'))).ok, true);

  const mismatch = request('POST', CANONICAL_ORIGIN, {
    cookie: 'csrf_token=cookie-token',
    'x-csrf-token': 'header-token',
  });
  assertEquals((await verifyCsrf(mismatch)).ok, false);

  const matching = request('POST', CANONICAL_ORIGIN, {
    cookie: 'csrf_token=shared-token',
    'x-csrf-token': 'shared-token',
  });
  assertEquals((await verifyCsrf(matching)).ok, true);
});
