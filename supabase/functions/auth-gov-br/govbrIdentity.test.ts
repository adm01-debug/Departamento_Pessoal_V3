import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { cpfDoSub, type GovbrLookups, resolverLogin, sha256Hex, validarVinculo } from './govbrIdentity.ts';

const CPF = '12345678909';

function db(over: Partial<GovbrLookups> = {}): GovbrLookups {
  return {
    profilesPorGovbrUid: () => Promise.resolve([]),
    usuariosPorCpf: () => Promise.resolve([]),
    cpfHashesDoUsuario: () => Promise.resolve([]),
    ...over,
  };
}

Deno.test('cpfDoSub recusa sub vazio, não-string ou sem 11 dígitos', () => {
  assertEquals(cpfDoSub(''), null);
  assertEquals(cpfDoSub(undefined), null);
  assertEquals(cpfDoSub(123), null);
  assertEquals(cpfDoSub('1234'), null);
  assertEquals(cpfDoSub('123.456.789-09'), CPF);
});

Deno.test('login: govbr_uid já vinculado tem prioridade', async () => {
  const r = await resolverLogin(CPF, CPF, db({
    profilesPorGovbrUid: () => Promise.resolve(['u1']),
    usuariosPorCpf: () => Promise.resolve(['u2']),
  }));
  assertEquals(r, { ok: true, userId: 'u1' });
});

Deno.test('login: cai para colaboradores pelo cpf_hash (sha256 dos dígitos)', async () => {
  const esperado = await sha256Hex(CPF);
  let hashRecebido = '';
  const r = await resolverLogin(CPF, CPF, db({
    usuariosPorCpf: (_cpf, h) => { hashRecebido = h; return Promise.resolve(['u2', 'u2']); },
  }));
  assertEquals(hashRecebido, esperado);
  assertEquals(r, { ok: true, userId: 'u2' });
});

Deno.test('login: mais de um candidato é ambíguo e recusa', async () => {
  const r = await resolverLogin(CPF, CPF, db({ usuariosPorCpf: () => Promise.resolve(['u1', 'u2']) }));
  assertEquals(r.ok, false);
});

Deno.test('login: nenhuma conta devolve mensagem orientando vincular', async () => {
  const r = await resolverLogin(CPF, CPF, db());
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.status, 200);
});

Deno.test('vínculo: gov.br já usado por outro usuário recusa', async () => {
  const r = await validarVinculo('u1', CPF, CPF, db({ profilesPorGovbrUid: () => Promise.resolve(['u9']) }));
  assertEquals(r.ok, false);
});

Deno.test('vínculo: CPF do cadastro diferente do gov.br recusa; igual aceita', async () => {
  const outro = await sha256Hex('98765432100');
  const nao = await validarVinculo('u1', CPF, CPF, db({ cpfHashesDoUsuario: () => Promise.resolve([outro]) }));
  assertEquals(nao.ok, false);
  const igual = await sha256Hex(CPF);
  const sim = await validarVinculo('u1', CPF, CPF, db({ cpfHashesDoUsuario: () => Promise.resolve([igual]) }));
  assertEquals(sim, { ok: true, userId: 'u1' });
});

Deno.test('vínculo: usuário sem colaborador (sem CPF) pode vincular', async () => {
  const r = await validarVinculo('u1', CPF, CPF, db({ profilesPorGovbrUid: () => Promise.resolve(['u1']) }));
  assertEquals(r, { ok: true, userId: 'u1' });
});
