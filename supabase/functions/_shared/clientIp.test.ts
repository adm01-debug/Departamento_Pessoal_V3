// Testes do helper getClientIp — invariante: o IP vem SEMPRE do último
// elemento de x-forwarded-for (anexado pelo gateway), nunca do primeiro
// (forjável pelo cliente), e headers spoofable (cf-connecting-ip,
// x-real-ip) são ignorados.
// Executa com Deno: `deno test supabase/functions/_shared/clientIp.test.ts --no-check`
import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { getClientIp } from './clientIp.ts';

function req(headers: Record<string, string>): Request {
  return new Request('https://edge.test/fn', { headers });
}

Deno.test('getClientIp: usa o ÚLTIMO elemento de x-forwarded-for (peer real)', () => {
  // Cliente tenta spoofar 1.1.1.1; o gateway anexou 203.0.113.9.
  const r = req({ 'x-forwarded-for': '1.1.1.1, 10.0.0.2, 203.0.113.9' });
  assertEquals(getClientIp(r), '203.0.113.9');
});

Deno.test('getClientIp: XFF de um elemento funciona', () => {
  const r = req({ 'x-forwarded-for': '198.51.100.7' });
  assertEquals(getClientIp(r), '198.51.100.7');
});

Deno.test('getClientIp: ignora cf-connecting-ip e x-real-ip (cliente-controlados)', () => {
  const r = req({
    'cf-connecting-ip': '6.6.6.6',
    'x-real-ip': '7.7.7.7',
    'x-forwarded-for': '203.0.113.9',
  });
  assertEquals(getClientIp(r), '203.0.113.9');
});

Deno.test('getClientIp: sem XFF retorna unknown mesmo com headers spoofable', () => {
  const r = req({ 'cf-connecting-ip': '6.6.6.6', 'x-real-ip': '7.7.7.7' });
  assertEquals(getClientIp(r), 'unknown');
});

Deno.test('getClientIp: XFF vazio/whitespace → unknown', () => {
  assertEquals(getClientIp(req({ 'x-forwarded-for': '   ' })), 'unknown');
  assertEquals(getClientIp(req({})), 'unknown');
});
