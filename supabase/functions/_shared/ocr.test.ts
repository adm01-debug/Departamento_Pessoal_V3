import {
  assert,
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  estadoBreakerOcr,
  isAllowedFileUrl,
  OCR_CIRCUIT_ERROR,
  resetarBreakerOcr,
  runDocumentOcr,
} from './ocr.ts';

Deno.env.set('SUPABASE_URL', 'https://proj.supabase.co');
Deno.env.set('DEEPSEEK_API_KEY', 'chave-de-teste');

const ARQUIVO =
  'https://proj.supabase.co/storage/v1/object/sign/documentos/admissao_11111111-1111-1111-1111-111111111111/cpf_1712345678.png';

function stubarFetch(responder: () => Response) {
  const original = globalThis.fetch;
  const bodies: string[] = [];
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(String(init?.body ?? ''));
    return Promise.resolve(responder());
  }) as typeof fetch;
  return {
    bodies,
    chamadas: () => bodies.length,
    restaurar: () => {
      globalThis.fetch = original;
    },
  };
}

const respostaOk = () =>
  new Response(
    JSON.stringify({ choices: [{ message: { content: '{"valid":true,"confidence":0.9}' } }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

Deno.test('ocr: recusa URL fora do proprio projeto antes de chamar o provedor', async () => {
  const stub = stubarFetch(respostaOk);
  try {
    assertEquals(isAllowedFileUrl('https://exemplo.com/x.png'), false);
    const run = await runDocumentOcr('https://exemplo.com/x.png', 'generic');
    assertEquals(run.ok, false);
    assertEquals(stub.chamadas(), 0);
  } finally {
    stub.restaurar();
    resetarBreakerOcr();
  }
});

Deno.test('ocr: a tolerancia RG<->CNH fica restrita ao tipo identidade', async () => {
  const stub = stubarFetch(respostaOk);
  try {
    resetarBreakerOcr();
    await runDocumentOcr(ARQUIVO, 'cpf');
    const bodyCpf = stub.bodies[0];
    assert(!bodyCpf.includes('RG ou CNH'), 'a tolerancia RG<->CNH vazou para o tipo cpf');
    assertStringIncludes(bodyCpf, 'Nao aceite documento de outro tipo');

    stub.bodies.length = 0;
    await runDocumentOcr(ARQUIVO, 'identidade');
    assertStringIncludes(stub.bodies[0], 'RG ou CNH');
  } finally {
    stub.restaurar();
    resetarBreakerOcr();
  }
});

Deno.test('ocr: provedor falhando abre o circuito e para de gastar timeout', async () => {
  const stub = stubarFetch(() => new Response('erro', { status: 400 }));
  try {
    resetarBreakerOcr();
    for (let i = 0; i < 3; i++) {
      const run = await runDocumentOcr(ARQUIVO, 'cpf');
      assertEquals(run.ok, false);
    }
    assertEquals(estadoBreakerOcr(), 'OPEN');

    const chamadasAntes = stub.chamadas();
    const bloqueada = await runDocumentOcr(ARQUIVO, 'cpf');
    assertEquals(bloqueada.ok, false);
    if (!bloqueada.ok) {
      assertEquals(bloqueada.status, 503);
      assertEquals(bloqueada.error, OCR_CIRCUIT_ERROR);
    }
    assertEquals(stub.chamadas(), chamadasAntes);
  } finally {
    stub.restaurar();
    resetarBreakerOcr();
  }
});

Deno.test('ocr: sucesso devolve o JSON do provedor e mantem o circuito fechado', async () => {
  const stub = stubarFetch(respostaOk);
  try {
    resetarBreakerOcr();
    const run = await runDocumentOcr(ARQUIVO, 'identidade');
    assert(run.ok);
    if (run.ok) {
      assertEquals((run.result as { valid: boolean }).valid, true);
    }
    assertEquals(estadoBreakerOcr(), 'CLOSED');
  } finally {
    stub.restaurar();
    resetarBreakerOcr();
  }
});