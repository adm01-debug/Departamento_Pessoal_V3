/**
 * ============================================================================
 * ADAPTADOR OPENAI — executa SOMENTE no backend (Edge Function).
 *
 * Nenhum import deste arquivo existe em `src/`: a chave `OPENAI_API_KEY` jamais
 * chega ao navegador. O adaptador é PURO em relação ao ambiente — recebe
 * `apiKey`, `model`, `fetchImpl` e `timeoutMs` por parâmetro —, o que permite
 * testá-lo com `fetch` simulado sem nenhuma chamada real.
 *
 * CONTRATO: implementa `TrainingImageProvider`, devolvendo os BYTES validados.
 * Upload e persistência são do pipeline.
 *
 * PARÂMETROS (defaults desta fase):
 *   model gpt-image-2.5-flare · size 1536x864 · quality medium
 *   background opaque · output_format webp · n 1
 *
 * ERROS: `TrainingImageProviderError` com `code`/`retryable`/`status`.
 * 400/401/403/404 → permanentes; 408/409/425/429/5xx/rede/timeout → recuperáveis.
 * ============================================================================
 */
import { montarPromptDeImagem } from './briefing.ts';
import { decodificarBase64, mensagemSegura, validarImagemGerada } from './imageValidation.ts';
import {
  TrainingImageProviderError,
  type GeneratedTrainingImage,
  type TrainingImageProvider,
  type TrainingImageRequest,
} from './types.ts';

export const OPENAI_IMAGES_ENDPOINT = 'https://api.openai.com/v1/images/generations';
export const OPENAI_MODELO_PADRAO = 'gpt-image-2.5-flare';
export const OPENAI_TAMANHO_PADRAO = '1536x864';
export const OPENAI_QUALIDADE_PADRAO = 'medium';
export const OPENAI_TIMEOUT_PADRAO_MS = 90_000;

const TAMANHOS_SUPORTADOS = new Set(['1536x864', '1536x1024', '1024x1536', '1024x1024', 'auto']);
const QUALIDADES_SUPORTADAS = new Set(['low', 'medium', 'high', 'auto']);
const FORMATOS_SUPORTADOS = new Set(['webp', 'png', 'jpeg']);

export interface OpenAITrainingImageProviderOptions {
  /** Segredo do backend. Ausente ⇒ `configured = false` e nenhuma chamada. */
  apiKey?: string | null;
  model?: string;
  size?: string;
  quality?: string;
  outputFormat?: string;
  background?: string;
  timeoutMs?: number;
  endpoint?: string;
  /** Injetável para teste; em produção usa `fetch` global do runtime. */
  fetchImpl?: typeof fetch;
}

function esperaDoRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const segundos = Number(header);
  if (Number.isFinite(segundos) && segundos >= 0) return Math.min(segundos * 1000, 60_000);
  const data = Date.parse(header);
  return Number.isNaN(data) ? null : Math.max(0, Math.min(data - Date.now(), 60_000));
}

/** Traduz o status HTTP em erro tipado (sem expor o corpo cru). */
function erroPorStatus(status: number, corpo: string, retryAfter: string | null): TrainingImageProviderError {
  if (status === 429) {
    return new TrainingImageProviderError('limite de uso da API atingido', {
      code: 'rate_limit',
      retryable: true,
      status,
      cause: esperaDoRetryAfter(retryAfter),
    });
  }
  if (status === 401 || status === 403) {
    return new TrainingImageProviderError('credencial da OpenAI recusada', {
      code: 'credencial_invalida',
      retryable: false,
      status,
    });
  }
  if (status === 404) {
    return new TrainingImageProviderError('modelo ou endpoint indisponível', {
      code: 'modelo_indisponivel',
      retryable: false,
      status,
    });
  }
  if (status === 400 || status === 422) {
    return new TrainingImageProviderError(`parâmetros recusados pela API: ${mensagemSegura(corpo)}`, {
      code: 'parametros_invalidos',
      retryable: false,
      status,
    });
  }
  const recuperavel = status === 408 || status === 409 || status === 425 || status >= 500;
  return new TrainingImageProviderError(`falha HTTP ${status} na geração`, {
    code: recuperavel ? 'http_temporario' : 'http_permanente',
    retryable: recuperavel,
    status,
  });
}

export function criarOpenAITrainingImageProvider(
  options: OpenAITrainingImageProviderOptions = {}
): TrainingImageProvider {
  const apiKey = String(options.apiKey ?? '').trim();
  const model = options.model?.trim() || OPENAI_MODELO_PADRAO;
  const size = options.size?.trim() || OPENAI_TAMANHO_PADRAO;
  const quality = options.quality?.trim() || OPENAI_QUALIDADE_PADRAO;
  const outputFormat = options.outputFormat?.trim() || 'webp';
  const background = options.background?.trim() || 'opaque';
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : OPENAI_TIMEOUT_PADRAO_MS;
  const endpoint = options.endpoint?.trim() || OPENAI_IMAGES_ENDPOINT;
  const fetchImpl = options.fetchImpl ?? fetch;

  // Configuração inválida falha ANTES de qualquer chamada paga.
  if (!TAMANHOS_SUPORTADOS.has(size)) throw new Error(`size não suportado: ${size}`);
  if (!QUALIDADES_SUPORTADAS.has(quality)) throw new Error(`quality não suportada: ${quality}`);
  if (!FORMATOS_SUPORTADOS.has(outputFormat)) throw new Error(`output_format não suportado: ${outputFormat}`);

  return {
    id: 'openai',
    configured: Boolean(apiKey),

    async generate(request: TrainingImageRequest): Promise<GeneratedTrainingImage> {
      if (!apiKey) {
        throw new TrainingImageProviderError('OPENAI_API_KEY ausente no ambiente da função', {
          code: 'sem_chave',
          retryable: false,
        });
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let resposta: Response;
      try {
        resposta = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Client-Request-Id': request.operationId,
          },
          body: JSON.stringify({
            model,
            prompt: montarPromptDeImagem(request.artDirection),
            n: 1,
            size,
            quality,
            background,
            output_format: outputFormat,
          }),
          signal: controller.signal,
        });
      } catch (erro) {
        const abortado = erro instanceof Error && erro.name === 'AbortError';
        throw new TrainingImageProviderError(
          abortado ? 'tempo limite na geração da imagem' : 'falha de rede ao chamar a OpenAI',
          { code: abortado ? 'timeout' : 'rede', retryable: true, cause: erro }
        );
      } finally {
        clearTimeout(timer);
      }

      if (!resposta.ok) {
        let corpo = '';
        try {
          corpo = await resposta.text();
        } catch {
          corpo = '';
        }
        throw erroPorStatus(resposta.status, corpo, resposta.headers.get('retry-after'));
      }

      let json: unknown;
      try {
        json = await resposta.json();
      } catch {
        throw new TrainingImageProviderError('resposta não é JSON válido', {
          code: 'resposta_invalida',
          retryable: false,
        });
      }

      // Aceitamos `data[0].b64_json` ou, defensivamente, `data[0].url`.
      const dados = (json as { data?: Array<{ b64_json?: unknown; url?: unknown }> } | null)?.data;
      if (!Array.isArray(dados) || dados.length === 0) {
        throw new TrainingImageProviderError('resposta sem imagem', {
          code: 'resposta_sem_imagem',
          retryable: false,
        });
      }

      const primeiro = dados[0];
      let bytes: Uint8Array;
      if (typeof primeiro?.b64_json === 'string') {
        bytes = decodificarBase64(primeiro.b64_json);
      } else if (typeof primeiro?.url === 'string' && /^https?:\/\//i.test(primeiro.url)) {
        bytes = await baixarImagem(primeiro.url, fetchImpl, timeoutMs);
      } else {
        throw new TrainingImageProviderError('resposta sem imagem em base64', {
          code: 'resposta_sem_imagem',
          retryable: false,
        });
      }

      const validada = validarImagemGerada(bytes);
      return {
        bytes: validada.bytes,
        mimeType: validada.mimeType,
        width: null,
        height: null,
        providerId: 'openai',
        model,
        operationId: request.operationId,
        promptVersion: request.promptVersion,
      };
    },
  };
}

/** Baixa a imagem quando a API devolver URL temporária (sem custo extra). */
async function baixarImagem(url: string, fetchImpl: typeof fetch, timeoutMs: number): Promise<Uint8Array> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resposta = await fetchImpl(url, { signal: controller.signal });
    if (!resposta.ok) {
      throw new TrainingImageProviderError('não foi possível baixar a imagem gerada', {
        code: 'download_falhou',
        retryable: true,
        status: resposta.status,
      });
    }
    return new Uint8Array(await resposta.arrayBuffer());
  } catch (erro) {
    if (erro instanceof TrainingImageProviderError) throw erro;
    throw new TrainingImageProviderError('falha ao baixar a imagem gerada', {
      code: 'download_falhou',
      retryable: true,
      cause: erro,
    });
  } finally {
    clearTimeout(timer);
  }
}
