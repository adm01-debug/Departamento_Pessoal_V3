/**
 * ============================================================================
 * VALIDAÇÃO DA IMAGEM GERADA — sem confiar no provedor.
 *
 * Uma resposta da API pode vir truncada, com outro formato, com HTML de erro
 * (quando um proxy intercepta) ou acima do limite do bucket. Antes de qualquer
 * upload: decodifica o base64, confere a assinatura real do arquivo (magic
 * bytes), o tamanho mínimo/máximo e devolve o MIME correto.
 * ============================================================================
 */
import { TrainingImageProviderError } from './types';

/** Limite do bucket `training-images` (5 MB). */
export const LIMITE_BYTES_IMAGEM = 5 * 1024 * 1024;
/** Menor arquivo aceitável (evita “imagem” de poucos bytes). */
export const MINIMO_BYTES_IMAGEM = 64;

export type MimeImagem = 'image/webp' | 'image/png' | 'image/jpeg';

export interface ImagemValidada {
  bytes: Uint8Array;
  mimeType: MimeImagem;
  extensao: 'webp' | 'png' | 'jpeg';
}

function bytesComecamCom(bytes: Uint8Array, assinatura: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + assinatura.length) return false;
  return assinatura.every((valor, indice) => bytes[offset + indice] === valor);
}

/** Detecta o formato REAL pelos magic bytes (ignora o content-type declarado). */
export function detectarMimeImagem(bytes: Uint8Array): MimeImagem | null {
  if (bytesComecamCom(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (bytesComecamCom(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  // "RIFF" .... "WEBP"
  if (bytesComecamCom(bytes, [0x52, 0x49, 0x46, 0x46]) && bytesComecamCom(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
}

function extensaoDoMime(mime: MimeImagem): ImagemValidada['extensao'] {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpeg';
  return 'webp';
}

/**
 * Decodifica base64 (aceita data URI) sem depender de Buffer/Deno:
 * `atob` existe no navegador, no Node 16+ e no runtime das Edge Functions.
 */
export function decodificarBase64(valor: unknown): Uint8Array {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new TrainingImageProviderError('resposta sem imagem em base64', {
      code: 'resposta_sem_imagem',
      retryable: false,
    });
  }
  const limpo = valor.replace(/^data:image\/[a-z+]+;base64,/i, '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(limpo)) {
    throw new TrainingImageProviderError('base64 inválido na resposta do provedor', {
      code: 'base64_invalido',
      retryable: false,
    });
  }
  try {
    const binario = atob(limpo);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    throw new TrainingImageProviderError('não foi possível decodificar a imagem', {
      code: 'base64_invalido',
      retryable: false,
    });
  }
}

/**
 * Valida tamanho e formato. Lança `TrainingImageProviderError` com `retryable`
 * falso — conteúdo inválido não melhora repetindo a chamada (e repetir custa).
 */
export function validarImagemGerada(bytes: Uint8Array): ImagemValidada {
  if (bytes.length < MINIMO_BYTES_IMAGEM) {
    throw new TrainingImageProviderError('imagem menor que o mínimo aceitável', {
      code: 'imagem_muito_pequena',
      retryable: false,
    });
  }
  if (bytes.length > LIMITE_BYTES_IMAGEM) {
    throw new TrainingImageProviderError('imagem acima do limite de 5 MB', {
      code: 'imagem_muito_grande',
      retryable: false,
    });
  }
  const mimeType = detectarMimeImagem(bytes);
  if (!mimeType) {
    throw new TrainingImageProviderError('formato de imagem não suportado', {
      code: 'formato_invalido',
      retryable: false,
    });
  }
  return { bytes, mimeType, extensao: extensaoDoMime(mimeType) };
}

/** Mensagem segura: remove chaves, tokens e URLs antes de gravar/logar. */
export function mensagemSegura(erro: unknown): string {
  const bruta = erro instanceof Error ? erro.message : String(erro ?? '');
  return bruta
    .replace(/sk-[A-Za-z0-9-_]{6,}/g, '[redigido]')
    .replace(/bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redigido]')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}
