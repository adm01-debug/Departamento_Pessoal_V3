import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { erroDaRpc } from './rpcErrors.ts';

Deno.test('regra de negócio vira 409 com a mensagem da RPC', () => {
  const e = erroDaRpc({ code: '23514', message: 'Rescisao so pode ser paga apos homologacao' });
  assertEquals([e.status, e.code, e.message], [409, 'PAGAMENTO_BLOQUEADO', 'Rescisao so pode ser paga apos homologacao']);
});

Deno.test('permissão, inexistente e desconhecido', () => {
  assertEquals(erroDaRpc({ code: '42501' }).status, 403);
  assertEquals(erroDaRpc({ code: 'P0002' }).status, 404);
  const x = erroDaRpc({ code: 'XX000', message: 'detalhe interno' });
  assertEquals([x.status, x.message], [500, 'Erro interno']);
});
