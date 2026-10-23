/**
 * ============================================================================
 * IMAGENS DO HUB DE TREINAMENTOS — tipos compartilhados.
 *
 * Uma ÚNICA camada para as quatro áreas (Catálogo, Trilhas, Turmas e
 * Certificados). Nada aqui conhece React, OpenAI ou Supabase: são contratos.
 *
 * PRINCÍPIOS
 *  • `empresa_id` é parte OBRIGATÓRIA de qualquer identificação — o isolamento
 *    multiempresa começa no tipo, não na consulta.
 *  • A solicitação de geração carrega apenas dados do CADASTRO (nome, descrição,
 *    categoria, modalidade, carga, nível, cursos vinculados). Nenhum dado de
 *    colaborador, e-mail, documento ou identificador pessoal entra no pedido.
 *  • A direção de arte é derivada internamente (`request.ts`). O usuário nunca
 *    escreve prompt — ver `artDirection`.
 *  • Nesta fase o provedor é DESATIVADO. Nenhum tipo representa uma imagem
 *    "gerada" sem que um provedor real a tenha produzido.
 * ============================================================================
 */

/** Tipos de conteúdo reconhecidos pela camada de imagens. */
export type TrainingContentType = 'course' | 'learning_path' | 'training_session' | 'certificate';

/** Lista canônica (usada em validação, testes e no CHECK da migration). */
export const TRAINING_CONTENT_TYPES: readonly TrainingContentType[] = [
  'course',
  'learning_path',
  'training_session',
  'certificate',
] as const;

/** Como a capa é enquadrada na UI. Não altera a imagem original. */
export type TrainingCoverFormat = 'quadrada' | 'faixa' | 'miniatura';

/**
 * Situação de uma imagem registrada. `disabled` existe para deixar explícito o
 * estado desta fase (integração desligada) sem inventar pendências eternas.
 */
export type TrainingImageStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'disabled';

/** Direção de arte DERIVADA do cadastro — nunca informada pelo usuário. */
export interface TrainingImageArtDirection {
  /** Assunto visual curto derivado do conteúdo. */
  assunto: string;
  /** Cena/tema sugerido a partir do tipo e dos dados do cadastro. */
  cena: string;
  /** Elementos concretos sugeridos (vazio quando o assunto é desconhecido). */
  elementos: readonly string[];
  /** Família cromática do Design System usada como base (`--info`, `--warning`…). */
  paleta: string;
  /** Enquadramento e tratamento desejados (usados pelo adaptador futuro). */
  composicao: string;
  /** Restrições rígidas para o provedor. */
  restricoes: readonly string[];
  /** Versão do template de briefing — vai para `prompt_version`. */
  versao: string;
  /** Dados de cadastro já saneados, usados como CONTEXTO (nunca instruções). */
  referencia?: string;
}

/** Pedido de geração — o contrato que qualquer provedor recebe. */
export interface TrainingImageRequest {
  contentType: TrainingContentType;
  contentId: string;
  /** Empresa proprietária do cadastro (isolamento de tenant). */
  empresaId: string;
  /**
   * Identificador estável da operação (empresa + tipo + id + hash do conteúdo).
   * Serve como chave de idempotência no provedor/backend.
   */
  operationId: string;
  /** Hash do conteúdo que originou o pedido (detecta edição do cadastro). */
  contentHash: string;
  /** Versão do template de briefing usada (auditoria de custo). */
  promptVersion: string;
  name: string;
  description?: string | null;
  category?: string | null;
  modality?: string | null;
  workloadHours?: number | null;
  level?: string | null;
  /** Obrigatoriedade do curso (contexto de catálogo, não de imagem). */
  mandatory?: boolean | null;
  /** Nomes dos cursos vinculados (apenas trilhas). */
  linkedCourseNames?: readonly string[];
  /** Curso de origem quando a imagem é herdada (turma/certificado). */
  sourceContentId?: string | null;
  /** Derivada internamente — NUNCA recebida do usuário. */
  artDirection: TrainingImageArtDirection;
}

/** Resultado de uma geração real (só existe com provedor configurado). */
export interface GeneratedTrainingImage {
  /** Caminho dentro do bucket `training-images` (começa com o `empresa_id`). */
  storagePath: string;
  mimeType: string;
  width: number;
  height: number;
  providerId: string;
  model: string;
  /** Eco da operação que produziu a imagem (idempotência/auditoria). */
  operationId: string;
  promptVersion: string;
}

/**
 * Interface substituível do gerador. Um adaptador da OpenAI (próxima etapa)
 * implementa exatamente este contrato — nada mais no app precisa mudar.
 *
 * `configured = false` significa "não chamar": é o estado desta fase.
 */
export interface TrainingImageProvider {
  readonly id: string;
  readonly configured: boolean;
  generate(request: TrainingImageRequest): Promise<GeneratedTrainingImage>;
}

/** Linha persistida em `public.training_images` (referência da imagem). */
export interface TrainingImageRecord {
  id: string;
  empresa_id: string;
  content_type: TrainingContentType;
  content_id: string;
  source_content_id: string | null;
  storage_path: string;
  status: TrainingImageStatus;
  provider: string;
  model: string | null;
  /** Hash do conteúdo no momento da geração; edição do cadastro permite nova capa. */
  content_hash: string | null;
  attempts: number;
  last_error: string | null;
  prompt_version: string | null;
  requested_at: string;
  completed_at: string | null;
  updated_at: string;
}

/** Resultado de uma solicitação de geração. Nunca lança por integração off. */
export type TrainingImageRequestResult =
  | { aceito: true; imagem: GeneratedTrainingImage }
  | {
      aceito: false;
      motivo:
        | 'integracao_desativada'
        | 'identificadores_invalidos'
        | 'tipo_de_conteudo_invalido'
        | 'limite_de_tentativas'
        | 'falha_no_provedor';
      /** Mensagem SEGURA (sem chaves/URLs) para diagnóstico. */
      erro?: string;
      /** `true` quando repetir não resolve (não consome novas tentativas). */
      permanente?: boolean;
    };

/** Mapa `tipo:id → URL assinada` usado pelos cards. */
export type TrainingImageMap = ReadonlyMap<string, string>;
