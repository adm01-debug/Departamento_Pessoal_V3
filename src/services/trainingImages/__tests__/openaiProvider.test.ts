import { describe, expect, it, vi } from 'vitest';
import {
  criarOpenAITrainingImageProvider,
  OPENAI_IMAGES_ENDPOINT,
  OPENAI_MODELO_PADRAO,
  OPENAI_TAMANHO_PADRAO,
} from '../../../../supabase/functions/_shared/trainingImages/openaiProvider';
import { FIXTURE_PNG_BASE64 } from '../../../../supabase/functions/_shared/trainingImages/simulatedProvider';
import { TrainingImageProviderError } from '../../../../supabase/functions/_shared/trainingImages/types';
import type { TrainingImageRequest } from '../../../../supabase/functions/_shared/trainingImages/types';

/**
 * ============================================================================
 * ADAPTADOR OPENAI — testado com `fetch` SIMULADO. Zero chamada real.
 *
 * Cobre: chave ausente, parâmetros enviados, sucesso com base64, 401/429/400/
 * 500, JSON inválido, resposta sem imagem, base64 inválido, imagem de formato
 * errado, excesso de tamanho e timeout.
 * ============================================================================
 */

const PEDIDO: TrainingImageRequest = {
  contentType: 'course',
  contentId: '11111111-1111-4111-8111-111111111111',
  empresaId: 'empresa-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  operationId: 'ti_abcdef0123456789abcdef0123456789',
  contentHash: 'a'.repeat(64),
  promptVersion: 'v2',
  name: 'Panificação Artesanal',
  description: 'Fermentação natural.',
  category: 'Panificação',
  artDirection: {
    assunto: 'panificação artesanal e produção de pães',
    cena: 'ambiente de aprendizagem sobre panificação',
    elementos: ['pães artesanais', 'massa em fermentação'],
    paleta: '--warning',
    composicao: 'enquadramento amplo, fundo escuro',
    restricoes: ['sem texto legível', 'sem logotipos'],
    versao: 'v2',
    referencia: 'nome: Panificação Artesanal',
  },
};

function respostaJson(corpo: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('configuração e chave', () => {
  it('sem chave não se declara configurado e não chama fetch', async () => {
    const fetchImpl = vi.fn();
    const provider = criarOpenAITrainingImageProvider({ fetchImpl: fetchImpl as never });
    expect(provider.configured).toBe(false);

    await expect(provider.generate(PEDIDO)).rejects.toMatchObject({ code: 'sem_chave', retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('recusa parâmetros fora do contrato antes de qualquer chamada', () => {
    expect(() => criarOpenAITrainingImageProvider({ apiKey: 'k', size: '999x999' })).toThrow(/size não suportado/);
    expect(() => criarOpenAITrainingImageProvider({ apiKey: 'k', quality: 'ultra' })).toThrow(/quality não suportada/);
    expect(() => criarOpenAITrainingImageProvider({ apiKey: 'k', outputFormat: 'gif' })).toThrow(
      /output_format não suportado/
    );
  });
});

describe('requisição e resposta', () => {
  it('envia endpoint, autenticação, idempotência e parâmetros oficiais', async () => {
    const fetchImpl = vi.fn(async () => respostaJson({ data: [{ b64_json: FIXTURE_PNG_BASE64 }] }));
    const provider = criarOpenAITrainingImageProvider({ apiKey: 'chave-de-teste', fetchImpl: fetchImpl as never });

    const imagem = await provider.generate(PEDIDO);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(OPENAI_IMAGES_ENDPOINT);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer chave-de-teste');
    expect(headers['X-Client-Request-Id']).toBe(PEDIDO.operationId);
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: OPENAI_MODELO_PADRAO,
      size: OPENAI_TAMANHO_PADRAO,
      quality: 'medium',
      background: 'opaque',
      output_format: 'webp',
      n: 1,
    });
    expect(body.prompt).toContain('panificação');
    expect(body.prompt).not.toMatch(/sk-/);

    // Bytes da fixture local, formato detectado pelo magic byte.
    expect(imagem.mimeType).toBe('image/png');
    expect(imagem.bytes.length).toBeGreaterThan(64);
    expect(imagem.providerId).toBe('openai');
    expect(imagem.operationId).toBe(PEDIDO.operationId);
    expect(imagem.promptVersion).toBe(PEDIDO.promptVersion);
  });

  it('não usa fetch global quando um fetchImpl é injetado', async () => {
    const globalSpy = vi.spyOn(globalThis, 'fetch');
    const provider = criarOpenAITrainingImageProvider({
      apiKey: 'k',
      fetchImpl: (async () => respostaJson({ data: [{ b64_json: FIXTURE_PNG_BASE64 }] })) as never,
    });
    await provider.generate(PEDIDO);
    expect(globalSpy).not.toHaveBeenCalled();
  });

  it('aceita URL temporária do provedor e baixa os bytes', async () => {
    const png = Uint8Array.from(atob(FIXTURE_PNG_BASE64), (c) => c.charCodeAt(0));
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('download')) return new Response(png, { status: 200 });
      return respostaJson({ data: [{ url: 'https://cdn.example.test/download.png' }] });
    });

    const provider = criarOpenAITrainingImageProvider({ apiKey: 'k', fetchImpl: fetchImpl as never });
    const imagem = await provider.generate(PEDIDO);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(imagem.mimeType).toBe('image/png');
    expect(imagem.bytes.length).toBe(png.length);
  });
});

describe('classificação de erros HTTP', () => {
  async function erroDe(status: number, corpo = 'erro', headers: Record<string, string> = {}) {
    const provider = criarOpenAITrainingImageProvider({
      apiKey: 'chave-secreta',
      fetchImpl: (async () => respostaJson({ error: { message: corpo } }, status, headers)) as never,
    });
    try {
      await provider.generate(PEDIDO);
      throw new Error('deveria ter lançado');
    } catch (erro) {
      expect(erro).toBeInstanceOf(TrainingImageProviderError);
      return erro as TrainingImageProviderError;
    }
  }

  it('401/403 → permanente (não repete)', async () => {
    const erro = await erroDe(401, 'invalid api key');
    expect(erro.code).toBe('credencial_invalida');
    expect(erro.retryable).toBe(false);
    expect(erro.message).not.toMatch(/invalid api key/);
  });

  it('400 → permanente, com mensagem sanitizada', async () => {
    const erro = await erroDe(400, 'bad size 1536x864 https://api.openai.com/v1');
    expect(erro.code).toBe('parametros_invalidos');
    expect(erro.retryable).toBe(false);
    expect(erro.message).not.toMatch(/https?:\/\//);
  });

  it('404 → modelo indisponível (permanente)', async () => {
    const erro = await erroDe(404, 'model not found');
    expect(erro.code).toBe('modelo_indisponivel');
    expect(erro.retryable).toBe(false);
  });

  it('429 → recuperável e respeita Retry-After', async () => {
    const erro = await erroDe(429, 'rate limit', { 'retry-after': '30' });
    expect(erro.code).toBe('rate_limit');
    expect(erro.retryable).toBe(true);
    expect(erro.cause).toBe(30_000);
  });

  it('500 → recuperável', async () => {
    const erro = await erroDe(500, 'server error');
    expect(erro.code).toBe('http_temporario');
    expect(erro.retryable).toBe(true);
  });

  it('timeout → recuperável, sem vazar detalhe', async () => {
    const provider = criarOpenAITrainingImageProvider({
      apiKey: 'k',
      timeoutMs: 10,
      fetchImpl: ((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const erro = new Error('aborted');
            erro.name = 'AbortError';
            reject(erro);
          });
        })) as never,
    });

    await expect(provider.generate(PEDIDO)).rejects.toMatchObject({ code: 'timeout', retryable: true });
  });
});

describe('proteção contra respostas inesperadas', () => {
  async function erroCom(resposta: Response) {
    const provider = criarOpenAITrainingImageProvider({
      apiKey: 'k',
      fetchImpl: (async () => resposta) as never,
    });
    try {
      await provider.generate(PEDIDO);
      throw new Error('deveria ter lançado');
    } catch (erro) {
      return erro as TrainingImageProviderError;
    }
  }

  it('JSON inválido', async () => {
    const erro = await erroCom(new Response('<html>proxy</html>', { status: 200 }));
    expect(erro.code).toBe('resposta_invalida');
  });

  it('data ausente ou vazia', async () => {
    expect((await erroCom(respostaJson({}))).code).toBe('resposta_sem_imagem');
    expect((await erroCom(respostaJson({ data: [] }))).code).toBe('resposta_sem_imagem');
  });

  it('base64 inválido', async () => {
    const erro = await erroCom(respostaJson({ data: [{ b64_json: '<<<não é base64>>>' }] }));
    expect(erro.code).toBe('base64_invalido');
  });

  it('bytes que não são imagem', async () => {
    const html = Buffer.from('<html>erro</html>'.repeat(10)).toString('base64');
    const erro = await erroCom(respostaJson({ data: [{ b64_json: html }] }));
    expect(erro.code).toBe('formato_invalido');
    expect(erro.retryable).toBe(false);
  });

  it('imagem acima de 5 MB', async () => {
    const grande = new Uint8Array(5 * 1024 * 1024 + 10);
    grande.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const base64 = Buffer.from(grande).toString('base64');
    const erro = await erroCom(respostaJson({ data: [{ b64_json: base64 }] }));
    expect(erro.code).toBe('imagem_muito_grande');
  });
});
