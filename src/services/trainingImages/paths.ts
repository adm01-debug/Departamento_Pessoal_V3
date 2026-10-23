/**
 * ============================================================================
 * CAMINHOS DO STORAGE — `training-images`.
 *
 * Estrutura (a MESMA do padrão `{empresa_id}/...` já usado pelo resto do app):
 *
 *   training-images/
 *     <empresa_id>/
 *       courses/<curso_id>/cover.webp
 *       learning-paths/<trilha_id>/cover.webp
 *       training-sessions/<turma_id>/cover.webp   (só herança, sem geração)
 *       certificates/<certificado_id>/cover.webp  (só herança, sem geração)
 *
 * O primeiro segmento é SEMPRE o `empresa_id`: é o que as políticas de Storage
 * usam (`storage.foldername(name)[1]`) para impedir leitura/escrita entre
 * empresas. Por isso todo caminho passa por `montarCaminhoImagem`, que recusa
 * identificadores vazios, com barras, `..` ou qualquer coisa que quebre o
 * escopo do tenant.
 * ============================================================================
 */
import type { TrainingContentType } from './types';

/** Bucket privado (criado pela migration `…_training_images_infrastructure.sql`). */
export const TRAINING_IMAGES_BUCKET = 'training-images';

/** Pasta por tipo de conteúdo — estável entre frontend e backend. */
export const PASTA_POR_TIPO: Record<TrainingContentType, string> = {
  course: 'courses',
  learning_path: 'learning-paths',
  training_session: 'training-sessions',
  certificate: 'certificates',
};

/** Formato padrão da capa (o mesmo que o provedor futuro deverá devolver). */
export const EXTENSAO_PADRAO = 'webp';

/** Só UUID/segmento seguro: nada de `/`, `\`, `.` ou espaço. */
const SEGMENTO_SEGURO = /^[A-Za-z0-9_-]{1,64}$/;

/** Verifica se um trecho pode ocupar um segmento do caminho. */
export function segmentoSeguro(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && SEGMENTO_SEGURO.test(valor);
}

export interface CaminhoImagemInput {
  empresaId: string;
  contentType: TrainingContentType;
  contentId: string;
  extensao?: string;
}

/**
 * Monta o caminho canônico de uma capa. Lança `Error` para identificadores
 * inválidos — falha fechada: caminho malformado nunca chega ao Storage.
 */
export function montarCaminhoImagem({
  empresaId,
  contentType,
  contentId,
  extensao = EXTENSAO_PADRAO,
}: CaminhoImagemInput): string {
  if (!segmentoSeguro(empresaId)) throw new Error('empresa_id inválido para o caminho da imagem');
  if (!segmentoSeguro(contentId)) throw new Error('content_id inválido para o caminho da imagem');
  const ext = String(extensao ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!ext) throw new Error('extensão inválida para o caminho da imagem');
  return `${empresaId}/${PASTA_POR_TIPO[contentType]}/${contentId}/cover.${ext}`;
}

/** Extrai o `empresa_id` do caminho (primeiro segmento), ou `null`. */
export function empresaDoCaminho(caminho: string | null | undefined): string | null {
  if (typeof caminho !== 'string') return null;
  const primeiro = caminho.split('/')[0];
  return segmentoSeguro(primeiro) ? primeiro : null;
}

/**
 * Confirma que o caminho pertence à empresa informada. Usado antes de assinar
 * uma URL e nos testes de isolamento — nunca confie só no que veio do banco.
 */
export function validarCaminhoDaEmpresa(
  caminho: string | null | undefined,
  empresaId: string | null | undefined
): boolean {
  if (!caminho || !empresaId) return false;
  if (!segmentoSeguro(empresaId)) return false;
  // Recusa navegação de diretório e segmentos vazios.
  if (caminho.includes('..') || caminho.includes('//') || caminho.startsWith('/')) return false;
  return empresaDoCaminho(caminho) === empresaId;
}

/** Chave estável do mapa de imagens (`course:<id>`). */
export function chaveConteudo(contentType: TrainingContentType, contentId: string): string {
  return `${contentType}:${contentId}`;
}
