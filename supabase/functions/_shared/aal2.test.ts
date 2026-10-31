import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { requireAal2, userAal } from './aal2.ts';

const b64url = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (claims: Record<string, unknown>) => `${b64url({ alg: 'HS256' })}.${b64url(claims)}.sig`;
const req = (auth?: string) => new Request('https://x/fn', { method: 'POST', headers: auth ? { Authorization: auth } : {} });

Deno.test('aal2: lê o claim aal do access token', () => {
  assertEquals(userAal(req(`Bearer ${jwt({ aal: 'aal2' })}`)), 'aal2');
  assertEquals(userAal(req(`Bearer ${jwt({ aal: 'aal1' })}`)), 'aal1');
  assertEquals(userAal(req()), null);
  assertEquals(userAal(req('Bearer lixo')), null);
});

Deno.test('aal2: só sessão aal2 passa; aal1, service_role sem aal e sem token = 403', async () => {
  assertEquals(requireAal2(req(`Bearer ${jwt({ aal: 'aal2' })}`)).ok, true);
  for (const r of [req(`Bearer ${jwt({ aal: 'aal1' })}`), req(`Bearer ${jwt({ role: 'service_role' })}`), req()]) {
    const out = requireAal2(r);
    assertEquals(out.ok, false);
    assertEquals(out.response?.status, 403);
    assertEquals((await out.response!.json()).error.code, 'AAL2_REQUIRED');
  }
});
