/**
 * ============================================================================
 * CAMINHOS NO STORAGE — CÓPIA DO BACKEND (mesma estrutura do cliente).
 *
 * training-images/<empresa_id>/<pasta>/<content_id>/cover.<ext>
 *
 * O primeiro segmento é o tenant: é o que as políticas de Storage usam. Toda
 * escrita do backend passa por aqui e é validada de novo antes do upload.
 * ============================================================================
 */
import type { TrainingContentType } from './types.ts';

export const TRAINING_IMAGES_BUCKET = 'training-images';

export const PASTA_POR_TIPO: Record<TrainingContentType, string> = {
  course: 'courses',
  learning_path: 'learning-paths',
  training_session: 'training-sessions',
  certificate: 'certificates',
};

const SEGMENTO_SEGURO = /^[A-Za-z0-9_-]{1,64}$/;

export function segmentoSeguro(valor: unknown): boolean {
  return typeof valor === 'string' && SEGMENTO_SEGURO.test(valor);
}

export function montarCaminhoImagem(dados: {
  empresaId: string;
  contentType: TrainingContentType;
  contentId: string;
  extensao?: string;
}): string {
  if (!segmentoSeguro(dados.empresaId)) throw new Error('empresa_id inválido para o caminho da imagem');
  if (!segmentoSeguro(dados.contentId)) throw new Error('content_id inválido para o caminho da imagem');
  const ext = String(dados.extensao ?? 'webp')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!ext) throw new Error('extensão inválida para o caminho da imagem');
  return `${dados.empresaId}/${PASTA_POR_TIPO[dados.contentType]}/${dados.contentId}/cover.${ext}`;
}

export function validarCaminhoDaEmpresa(caminho: unknown, empresaId: unknown): boolean {
  if (typeof caminho !== 'string' || typeof empresaId !== 'string') return false;
  if (!segmentoSeguro(empresaId)) return false;
  if (caminho.includes('..') || caminho.includes('//') || caminho.startsWith('/')) return false;
  return caminho.split('/')[0] === empresaId;
}
