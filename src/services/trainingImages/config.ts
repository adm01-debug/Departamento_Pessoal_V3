/**
 * ============================================================================
 * CONFIGURAÇÃO DA CAMADA DE IMAGENS.
 *
 * Um único interruptor de BUILD, resolvido no bundle do navegador:
 *
 *   VITE_TRAINING_IMAGES=true
 *
 * Ligar o interruptor NÃO gera nada sozinho: a geração depende de um provedor
 * configurado no BACKEND (`definirTrainingImageProvider`) e de uma Edge
 * Function autenticada. O interruptor serve apenas para o frontend LER as capas
 * já concluídas em `public.training_images`.
 *
 * ⚠ ESTA FLAG NÃO É SEGURANÇA. Ela controla apenas a leitura no cliente; quem
 *    autoriza escrita/geração é o banco (RLS + função `claim_training_image`),
 *    a Edge Function (JWT + vínculo com a empresa) e o Storage (políticas).
 *    Nunca use uma flag VITE_* para liberar operação privilegiada.
 *
 * A chave da OpenAI (`OPENAI_API_KEY`) é configuração de SERVIDOR, existe
 * somente no ambiente da Edge Function e NUNCA aparece em `VITE_*`.
 *
 * Sem a flag, nenhuma consulta à tabela nova é disparada (nada de erro de
 * console em ambientes que ainda não receberam a migration).
 * ============================================================================
 */

/** Metadados do bucket, expostos para diagnóstico e testes. */
export const TRAINING_IMAGES_LIMITE_BYTES = 5 * 1024 * 1024;
export const TRAINING_IMAGES_MIME_TYPES = ['image/webp', 'image/png', 'image/jpeg'] as const;

/** Validade da URL assinada (1 h). */
export const TRAINING_IMAGES_URL_EXPIRA_SEGUNDOS = 60 * 60;

/**
 * Tempo de cache no React Query (15 min). Sempre MENOR que a validade da URL
 * assinada: o refetch renova a URL antes de ela expirar.
 */
export const TRAINING_IMAGES_STALE_MS = 15 * 60 * 1000;

/** Tempo de vida do cache após desmontar (30 min). */
export const TRAINING_IMAGES_GC_MS = 30 * 60 * 1000;

export function imagensDeTreinamentoHabilitadas(): boolean {
  return import.meta.env.VITE_TRAINING_IMAGES === 'true';
}
