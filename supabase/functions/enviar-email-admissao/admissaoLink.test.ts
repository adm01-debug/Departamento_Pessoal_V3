import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { montarLinkAdmissao, validarToken } from './admissaoLink.ts';

const agora = new Date('2026-10-29T12:00:00Z');
const tok = { admissao_id: 'a1', token: 'T', data_expiracao: '2026-11-05T00:00:00Z', email_candidato: 'Cand@Ex.com' };

Deno.test('link é montado no servidor a partir da origem permitida', () => {
  assertEquals(
    montarLinkAdmissao('https://departamento-pessoal-v3.vercel.app', 'abc&x=1'),
    'https://departamento-pessoal-v3.vercel.app/contratacao?token=abc%26x%3D1',
  );
  assertEquals(montarLinkAdmissao('https://app.exemplo.com/qualquer/coisa', 't'), 'https://app.exemplo.com/contratacao?token=t');
});

Deno.test('token precisa ser da admissão, vigente e do mesmo e-mail', () => {
  assertEquals(validarToken(tok, 'a1', 'cand@ex.com', agora), null);
  assertEquals(validarToken(null, 'a1', 'cand@ex.com', agora), 'token_invalido');
  assertEquals(validarToken(tok, 'outra', 'cand@ex.com', agora), 'token_invalido');
  assertEquals(validarToken({ ...tok, data_expiracao: '2026-10-01T00:00:00Z' }, 'a1', 'cand@ex.com', agora), 'token_expirado');
  assertEquals(validarToken(tok, 'a1', 'outro@ex.com', agora), 'email_divergente');
  assertEquals(validarToken({ ...tok, email_candidato: null }, 'a1', 'qualquer@ex.com', agora), null);
});
