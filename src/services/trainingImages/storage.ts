/**
 * ============================================================================
 * STORAGE — upload e URLs assinadas do bucket `training-images`.
 *
 * O bucket é PRIVADO. Nenhuma URL pública é produzida e nenhuma credencial
 * administrativa vive no frontend: as operações usam a sessão autenticada do
 * usuário e as políticas de Storage (escopo por `empresa_id` no primeiro
 * segmento do caminho).
 *
 * O upload real de uma imagem gerada pertence ao ADAPTADOR (backend), que roda
 * com service role. Aqui ficam o helper e a validação de caminho.
 * ============================================================================
 */
import { supabase } from '@/integrations/supabase/client';
import {
  TRAINING_IMAGES_LIMITE_BYTES,
  TRAINING_IMAGES_MIME_TYPES,
  TRAINING_IMAGES_URL_EXPIRA_SEGUNDOS,
} from './config';
import { TRAINING_IMAGES_BUCKET, montarCaminhoImagem, validarCaminhoDaEmpresa } from './paths';
import type { TrainingContentType } from './types';

export interface UploadImagemTreinamento {
  empresaId: string;
  contentType: TrainingContentType;
  contentId: string;
  dados: Blob;
  mimeType?: string;
  extensao?: string;
}

/**
 * Valida MIME e tamanho ANTES do upload. O bucket repete a checagem (defesa em
 * profundidade); aqui a mensagem fica legível e nenhum byte sobe à toa.
 */
export function validarArquivoDeCapa(arquivo: { mimeType?: string | null; tamanho: number }): void {
  const mime = String(arquivo.mimeType ?? '').toLowerCase();
  if (!TRAINING_IMAGES_MIME_TYPES.includes(mime as (typeof TRAINING_IMAGES_MIME_TYPES)[number])) {
    throw new Error(`Formato de imagem não suportado: use ${TRAINING_IMAGES_MIME_TYPES.join(', ')}.`);
  }
  if (!Number.isFinite(arquivo.tamanho) || arquivo.tamanho <= 0) {
    throw new Error('Arquivo de imagem vazio.');
  }
  if (arquivo.tamanho > TRAINING_IMAGES_LIMITE_BYTES) {
    throw new Error('Imagem acima do limite de 5 MB.');
  }
}

/**
 * Envia (ou substitui) a capa de um conteúdo. `upsert: true` garante UMA capa
 * por registro — regenerar não acumula arquivos órfãos.
 * Retorna o caminho persistível (`empresa/…/cover.webp`), nunca uma URL assinada.
 *
 * ⚠ BACKEND: pertence ao adaptador (edge function, service role). O navegador
 * não deve chamar esta função — as políticas de Storage só aceitam escrita de
 * admin do tenant, e a geração é responsabilidade do servidor.
 */
export async function enviarImagemGerada({
  empresaId,
  contentType,
  contentId,
  dados,
  mimeType,
  extensao,
}: UploadImagemTreinamento): Promise<string> {
  validarArquivoDeCapa({ mimeType: mimeType ?? dados.type, tamanho: dados.size });
  const caminho = montarCaminhoImagem({ empresaId, contentType, contentId, extensao });
  const { error } = await supabase.storage.from(TRAINING_IMAGES_BUCKET).upload(caminho, dados, {
    contentType: mimeType ?? dados.type ?? 'image/webp',
    upsert: true,
  });
  if (error) throw error;
  return caminho;
}

/**
 * Assina a URL de UM caminho. Devolve `null` (sem lançar) quando o caminho não
 * pertence à empresa, quando o bucket ainda não existe ou quando o objeto
 * sumiu — quem chama cai no fallback visual.
 */
export async function urlAssinadaDoCaminho(
  caminho: string | null | undefined,
  empresaId: string,
  expiraEmSegundos: number = TRAINING_IMAGES_URL_EXPIRA_SEGUNDOS
): Promise<string | null> {
  if (!validarCaminhoDaEmpresa(caminho, empresaId)) return null;
  try {
    const { data, error } = await supabase.storage
      .from(TRAINING_IMAGES_BUCKET)
      .createSignedUrl(caminho as string, expiraEmSegundos);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Assina vários caminhos de uma vez (uma chamada por objeto — o client atual
 * não expõe lote). Caminhos de outra empresa são simplesmente ignorados.
 */
export async function assinarCaminhosDaEmpresa(
  caminhos: readonly string[],
  empresaId: string,
  expiraEmSegundos: number = TRAINING_IMAGES_URL_EXPIRA_SEGUNDOS
): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  const unicos = Array.from(new Set(caminhos.filter((caminho) => validarCaminhoDaEmpresa(caminho, empresaId))));
  await Promise.all(
    unicos.map(async (caminho) => {
      const url = await urlAssinadaDoCaminho(caminho, empresaId, expiraEmSegundos);
      if (url) mapa.set(caminho, url);
    })
  );
  return mapa;
}
