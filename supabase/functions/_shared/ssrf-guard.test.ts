import { assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { assertPublicHttpsUrl, UnsafeUrlError } from './ssrf-guard.ts';

// Regressão do bug real: parsed.hostname de um literal IPv6 vem com
// colchetes (spec WHATWG), e o formato IPv4-mapeado vem em hex comprimido
// ("::ffff:7f00:1"), não decimal pontuado ("::ffff:127.0.0.1"). Sem
// normalizar os dois, toda a checagem de IPv6 virava no-op e qualquer um
// desses URLs passava como "seguro".
const IPV6_BYPASS_URLS = [
  'https://[::1]/x', // loopback
  'https://[fe80::1]/x', // link-local
  'https://[fc00::1]/x', // unique-local
  'https://[fd12::1]/x', // unique-local
  'https://[::ffff:127.0.0.1]/x', // IPv4-mapped loopback, forma pontuada
  'https://[::ffff:7f00:1]/x', // IPv4-mapped loopback, forma hex (a que o WHATWG realmente produz)
  'https://[::ffff:169.254.169.254]/x', // IPv4-mapped metadata service de nuvem
];

for (const url of IPV6_BYPASS_URLS) {
  Deno.test(`assertPublicHttpsUrl recusa ${url}`, async () => {
    await assertRejects(() => assertPublicHttpsUrl(url), UnsafeUrlError);
  });
}

Deno.test('assertPublicHttpsUrl aceita um literal IPv6 público', async () => {
  await assertPublicHttpsUrl('https://[2001:4860:4860::8888]/x');
});

Deno.test('assertPublicHttpsUrl recusa protocolo não-https', async () => {
  await assertRejects(() => assertPublicHttpsUrl('http://example.com/x'), UnsafeUrlError);
});

Deno.test('assertPublicHttpsUrl recusa IPv4 privado/loopback/link-local literal', async () => {
  for (const url of [
    'https://127.0.0.1/x',
    'https://10.0.0.1/x',
    'https://169.254.169.254/x',
    'https://192.168.1.1/x',
  ]) {
    await assertRejects(() => assertPublicHttpsUrl(url), UnsafeUrlError);
  }
});

Deno.test('assertPublicHttpsUrl recusa hostname bloqueado explicitamente', async () => {
  await assertRejects(() => assertPublicHttpsUrl('https://localhost/x'), UnsafeUrlError);
  await assertRejects(() => assertPublicHttpsUrl('https://LOCALHOST/x'), UnsafeUrlError);
});
