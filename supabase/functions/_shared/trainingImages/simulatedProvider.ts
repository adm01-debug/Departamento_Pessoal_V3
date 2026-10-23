/**
 * ============================================================================
 * PROVEDOR SIMULADO — **SOMENTE TESTES**. Nunca importar na Edge Function.
 *
 * Cumpre exatamente o contrato `TrainingImageProvider`, devolvendo uma imagem
 * de fixture LOCAL (PNG 1×1 válido, embutido em base64). O objetivo é exercitar
 * o fluxo inteiro — claim atômico, validação, upload, status e leitura — sem
 * nenhuma chamada à OpenAI e sem nenhum custo.
 *
 * A imagem NÃO é apresentada como gerada por IA: `providerId = 'simulado-teste'`
 * e `model = 'fixture-local'`, e o pipeline grava esse provider em
 * `training_images.provider` (rastreável).
 *
 * `index.ts` da função NÃO importa este arquivo; um teste de guardrail falha se
 * alguém tentar ligá-lo em produção.
 * ============================================================================
 */
import { decodificarBase64 } from './imageValidation';
import {
  TrainingImageProviderError,
  type GeneratedTrainingImage,
  type TrainingImageProvider,
  type TrainingImageRequest,
} from './types';

/** PNG 1×1 transparente (fixture local, não é imagem de IA). */
export const FIXTURE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export type FalhaSimulada = 'timeout' | 'rate_limit' | 'http_permanente' | 'imagem_invalida' | 'sem_imagem';

export interface ProvedorSimuladoOptions {
  falha?: FalhaSimulada;
  /** Atraso artificial em ms (testes de concorrência). */
  atrasoMs?: number;
  bytes?: Uint8Array;
  mimeType?: string;
}

export interface ProvedorSimulado extends TrainingImageProvider {
  readonly chamadas: number;
  readonly ultimoPedido: TrainingImageRequest | null;
}

export function criarProvedorSimulado(options: ProvedorSimuladoOptions = {}): ProvedorSimulado {
  let chamadas = 0;
  let ultimoPedido: TrainingImageRequest | null = null;

  return {
    id: 'simulado-teste',
    configured: true,
    get chamadas() {
      return chamadas;
    },
    get ultimoPedido() {
      return ultimoPedido;
    },
    async generate(request: TrainingImageRequest): Promise<GeneratedTrainingImage> {
      chamadas += 1;
      ultimoPedido = request;

      if (options.atrasoMs) {
        await new Promise((resolve) => setTimeout(resolve, options.atrasoMs));
      }

      if (options.falha === 'timeout') {
        throw new TrainingImageProviderError('tempo limite na geração da imagem', {
          code: 'timeout',
          retryable: true,
        });
      }
      if (options.falha === 'rate_limit') {
        throw new TrainingImageProviderError('limite de uso da API atingido', {
          code: 'rate_limit',
          retryable: true,
          status: 429,
        });
      }
      if (options.falha === 'http_permanente') {
        throw new TrainingImageProviderError('credencial da OpenAI recusada', {
          code: 'credencial_invalida',
          retryable: false,
          status: 401,
        });
      }
      if (options.falha === 'sem_imagem') {
        throw new TrainingImageProviderError('resposta sem imagem', {
          code: 'resposta_sem_imagem',
          retryable: false,
        });
      }

      // `imagem_invalida`: bytes que não passam na assinatura (HTML de erro).
      const bytes =
        options.bytes ??
        (options.falha === 'imagem_invalida'
          ? new TextEncoder().encode('<html>erro do proxy</html>'.repeat(4))
          : decodificarBase64(FIXTURE_PNG_BASE64));

      return {
        bytes,
        mimeType: options.mimeType ?? 'image/png',
        width: 1,
        height: 1,
        providerId: 'simulado-teste',
        model: 'fixture-local',
        operationId: request.operationId,
        promptVersion: request.promptVersion,
      };
    },
  };
}
