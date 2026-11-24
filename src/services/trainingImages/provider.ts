/**
 * ============================================================================
 * PROVEDOR SUBSTITUÍVEL — ponto único de integração com a geração externa.
 *
 * ⚠ SEPARAÇÃO FRONTEND/BACKEND (regra de arquitetura)
 *   Este módulo roda no NAVEGADOR. Nenhum adaptador real deve ser importado
 *   aqui: a chamada à OpenAI exige `OPENAI_API_KEY`, que NUNCA pode existir no
 *   bundle. O adaptador da Fase 3 vive na Supabase Edge Function
 *   `training-image-generate`, e é lá que `definirTrainingImageProvider` é
 *   chamado. O frontend só conhece o contrato.
 *
 * ESTA FASE: o registro começa com o provedor DESATIVADO. Nenhum adaptador é
 * importado, nenhuma chave é lida e nenhuma chamada de rede é feita.
 *
 * PRÓXIMA ETAPA (quando houver chave válida):
 *   1. implementar `openaiTrainingImageProvider` na edge function;
 *   2. chamar `definirTrainingImageProvider(...)` no bootstrap da função;
 *   3. aplicar a migration `…_training_images_infrastructure.sql`;
 *   4. ligar `VITE_TRAINING_IMAGES=true` (somente leitura de capas).
 * ============================================================================
 */
import type { TrainingImageProvider } from './types';

/** Erro explícito: "ainda não configurado", jamais uma geração simulada. */
export class TrainingImageIntegrationDisabledError extends Error {
  readonly code = 'integracao_desativada';

  constructor() {
    super('A geração automática de imagens ainda não está configurada.');
    this.name = 'TrainingImageIntegrationDisabledError';
  }
}

/**
 * Erro de provedor com CLASSIFICAÇÃO. `retryable = false` cobre recusas
 * permanentes (conteúdo bloqueado, credencial inválida, modelo inexistente) e
 * evita gastar tentativas/custo à toa. `retryable = true` cobre timeout,
 * rate limit e 5xx.
 */
export class TrainingImageProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, options: { code: string; retryable?: boolean; cause?: unknown }) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'TrainingImageProviderError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
  }
}

/**
 * Provedor padrão. `generate` sempre rejeita com erro explícito — nenhuma
 * resposta falsa é produzida e nenhum `fetch` é disparado.
 */
export const trainingImageProviderDesativado: TrainingImageProvider = {
  id: 'desativado',
  configured: false,
  async generate() {
    throw new TrainingImageIntegrationDisabledError();
  },
};

let provedorAtual: TrainingImageProvider = trainingImageProviderDesativado;

/**
 * Registra o adaptador real. Uso previsto: BACKEND (edge function). `null`
 * volta ao desativado — útil para testes e para desligar sem alterar chamadores.
 */
export function definirTrainingImageProvider(provider: TrainingImageProvider | null): void {
  provedorAtual = provider ?? trainingImageProviderDesativado;
}

/** Provedor em uso (sempre definido). */
export function obterTrainingImageProvider(): TrainingImageProvider {
  return provedorAtual;
}

/** `true` somente quando um adaptador real, explicitamente, se declarou pronto. */
export function integracaoDeImagensAtiva(): boolean {
  return provedorAtual.configured === true && provedorAtual.id !== trainingImageProviderDesativado.id;
}
