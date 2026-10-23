/**
 * ============================================================================
 * CONTRATOS DO BACKEND (edge function) — espelham a camada do cliente.
 *
 * O frontend NUNCA importa este arquivo. O adaptador da OpenAI implementa
 * `TrainingImageProvider` exatamente como na Fase 2, mas devolvendo os BYTES da
 * imagem (sem Storage): quem grava é o pipeline da função, com service role.
 * ============================================================================
 */

export type TrainingContentType = 'course' | 'learning_path' | 'training_session' | 'certificate';

export const TRAINING_CONTENT_TYPES: readonly TrainingContentType[] = [
  'course',
  'learning_path',
  'training_session',
  'certificate',
] as const;

/** Direção de arte já saneada e derivada do cadastro no banco. */
export interface TrainingImageArtDirection {
  assunto: string;
  cena: string;
  elementos: readonly string[];
  paleta: string;
  composicao: string;
  restricoes: readonly string[];
  versao: string;
  referencia?: string;
}

/** Pedido que o pipeline entrega ao provedor. */
export interface TrainingImageRequest {
  contentType: TrainingContentType;
  contentId: string;
  empresaId: string;
  operationId: string;
  contentHash: string;
  promptVersion: string;
  name: string;
  description?: string | null;
  category?: string | null;
  modality?: string | null;
  workloadHours?: number | null;
  level?: string | null;
  mandatory?: boolean | null;
  linkedCourseNames?: readonly string[];
  sourceContentId?: string | null;
  artDirection: TrainingImageArtDirection;
}

/** Resultado de uma geração real: bytes prontos para upload. */
export interface GeneratedTrainingImage {
  bytes: Uint8Array;
  mimeType: string;
  width: number | null;
  height: number | null;
  providerId: string;
  model: string;
  operationId: string;
  promptVersion: string;
}

/** Interface substituível (mesmo desenho do cliente, execução só no backend). */
export interface TrainingImageProvider {
  readonly id: string;
  readonly configured: boolean;
  generate(request: TrainingImageRequest): Promise<GeneratedTrainingImage>;
}

/** Erro tipado do provedor: `retryable` decide se vale nova tentativa. */
export class TrainingImageProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    message: string,
    options: { code: string; retryable?: boolean; status?: number; cause?: unknown }
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'TrainingImageProviderError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}

/** Conteúdo carregado do banco (já validado contra a empresa). */
export interface ConteudoTreinamento {
  contentType: TrainingContentType;
  contentId: string;
  empresaId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  modality?: string | null;
  workloadHours?: number | null;
  level?: string | null;
  mandatory?: boolean | null;
  linkedCourseNames?: readonly string[];
  sourceContentId?: string | null;
}

/* ─── Resultado do claim_training_image (RPC) ─────────────────────────────── */

export interface ClaimTrainingImageResult {
  reclamado: boolean;
  id: string | null;
  status: string | null;
  attempts: number | null;
}

/* ─── Resultado do pipeline ───────────────────────────────────────────────── */

export type TrainingImagePipelineResult =
  | { gerado: true; storagePath: string; mimeType: string; provider: string; model: string }
  | {
      gerado: false;
      motivo:
        | 'conteudo_inexistente'
        | 'ja_processado'
        | 'em_processamento'
        | 'limite_de_tentativas'
        | 'provedor_desativado'
        | 'imagem_invalida'
        | 'falha_no_provedor'
        | 'falha_no_upload'
        | 'falha_no_registro';
      erro?: string;
    };
