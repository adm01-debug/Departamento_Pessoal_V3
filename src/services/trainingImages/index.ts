/**
 * ============================================================================
 * CAMADA DE IMAGENS DO HUB DE TREINAMENTOS — API pública.
 *
 * Ponto único de importação para as quatro áreas:
 *
 *   import { TrainingCover } from '@/components/treinamentos/TrainingCover';
 *   import { carregarImagensDaEmpresa, resolverImagemDoMapa } from '@/services/trainingImages';
 *
 * O QUE ESTA CAMADA NÃO FAZ (nesta fase):
 *   • não chama OpenAI nem qualquer API paga;
 *   • não gera imagens ao abrir/renderizar a página;
 *   • não persiste solicitações pendentes;
 *   • não expõe configuração de prompt/modelo/resolução ao usuário.
 * ============================================================================
 */
export {
  TRAINING_IMAGES_BUCKET,
  PASTA_POR_TIPO,
  EXTENSAO_PADRAO,
  chaveConteudo,
  empresaDoCaminho,
  montarCaminhoImagem,
  segmentoSeguro,
  validarCaminhoDaEmpresa,
} from './paths';

export { sha256Hex } from './hash';

export {
  TRAINING_IMAGES_GC_MS,
  TRAINING_IMAGES_LIMITE_BYTES,
  TRAINING_IMAGES_MIME_TYPES,
  TRAINING_IMAGES_STALE_MS,
  TRAINING_IMAGES_URL_EXPIRA_SEGUNDOS,
  imagensDeTreinamentoHabilitadas,
} from './config';

export {
  TrainingImageIntegrationDisabledError,
  TrainingImageProviderError,
  definirTrainingImageProvider,
  integracaoDeImagensAtiva,
  obterTrainingImageProvider,
  trainingImageProviderDesativado,
} from './provider';

export {
  DESCRICAO_MAX,
  NOME_MAX,
  PROMPT_VERSION,
  montarBriefingVisual,
  paletaPorCategoria,
  sanearTexto,
} from './briefing';
export type { BriefingVisual, EntradaBriefing } from './briefing';

export { hashConteudo, montarOperationId, montarSolicitacaoImagem } from './request';
export type { EntradaSolicitacaoImagem } from './request';

export { assinarCaminhosDaEmpresa, enviarImagemGerada, urlAssinadaDoCaminho, validarArquivoDeCapa } from './storage';
export type { UploadImagemTreinamento } from './storage';

export {
  MAPA_IMAGENS_VAZIO,
  TENTATIVAS_MAX,
  carregarImagensDaEmpresa,
  limparControleDeGeracao,
  mensagemSeguraDoErro,
  resolverImagemDoMapa,
  solicitarGeracaoImagem,
} from './service';

export type {
  GeneratedTrainingImage,
  TrainingContentType,
  TrainingCoverFormat,
  TrainingImageArtDirection,
  TrainingImageMap,
  TrainingImageProvider,
  TrainingImageRecord,
  TrainingImageRequest,
  TrainingImageRequestResult,
  TrainingImageStatus,
} from './types';
export { TRAINING_CONTENT_TYPES } from './types';
