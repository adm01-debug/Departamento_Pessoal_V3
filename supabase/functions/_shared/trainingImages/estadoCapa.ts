/**
 * ============================================================================
 * ESTADO ATUAL DA CAPA — decisão de idempotência compartilhada
 * ============================================================================
 * Usado pela geração manual e pelo worker automático para responder, ANTES de
 * consumir quota ou chamar o provedor:
 *   • já existe capa para esta versão do conteúdo?  → não gera
 *   • existe trabalho recente em andamento?         → não gera
 *   • falhou de forma permanente?                   → não gera
 *   • resultado pago desconhecido?                  → não gera (reconciliação)
 *
 * O hash é o MESMO do pipeline, então editar o cadastro libera uma nova versão.
 * ============================================================================
 */
import { hashConteudoServidor, TENTATIVAS_MAX_PIPELINE } from './pipeline.ts';
import { carregarConteudoTreinamento, type TrainingAdminClient } from './supabaseDeps.ts';
import { STALE_AFTER_MS } from './quotas.ts';
import type { ConteudoTreinamento, TrainingContentType } from './types.ts';

export interface EntradaCapa {
  empresaId: string;
  contentType: TrainingContentType;
  contentId: string;
}

export type StatusCapa = 'pending' | 'processing' | 'succeeded' | 'failed' | 'disabled' | null;

export interface EstadoCapa {
  conteudo: ConteudoTreinamento;
  contentHash: string;
  imagemId: string | null;
  status: StatusCapa;
  /** Linha existente corresponde à versão atual do conteúdo. */
  hashAtual: boolean;
  /** pending/processing recente para a versão atual. */
  emAndamento: boolean;
  /** succeeded para a versão atual. */
  jaConcluida: boolean;
  /** failed + resultado_desconhecido para a versão atual. */
  incerto: boolean;
  /** failed com tentativas esgotadas para a versão atual. */
  esgotado: boolean;
  tentativasNaVersao: number;
}

export async function consultarEstadoDaCapa(
  admin: TrainingAdminClient,
  entrada: EntradaCapa
): Promise<EstadoCapa | null> {
  const conteudo = await carregarConteudoTreinamento(admin, entrada);
  if (!conteudo) return null;

  const contentHash = hashConteudoServidor(conteudo);
  const { data: capa } = await admin
    .from('training_images')
    .select('id, status, content_hash, requested_at, attempts, last_error')
    .eq('empresa_id', entrada.empresaId)
    .eq('content_type', entrada.contentType)
    .eq('content_id', entrada.contentId)
    .maybeSingle();

  const status = (capa?.status ?? null) as StatusCapa;
  const tentativas = Number(capa?.attempts ?? 0);
  const hashAtual = Boolean(capa) && capa?.content_hash === contentHash;
  const pedidoEm = Date.parse(String(capa?.requested_at ?? ''));
  const recente = Number.isFinite(pedidoEm) && Date.now() - pedidoEm < STALE_AFTER_MS;
  const lastError = String(capa?.last_error ?? '');

  return {
    conteudo,
    contentHash,
    imagemId: capa?.id ? String(capa.id) : null,
    status,
    hashAtual,
    emAndamento:
      hashAtual && (status === 'pending' || status === 'processing') && recente,
    jaConcluida: hashAtual && status === 'succeeded',
    incerto: hashAtual && status === 'failed' && lastError.startsWith('resultado_desconhecido'),
    esgotado: hashAtual && status === 'failed' && tentativas >= TENTATIVAS_MAX_PIPELINE,
    tentativasNaVersao: hashAtual ? tentativas : 0,
  };
}

/**
 * Marca uma linha como resultado pago DESCONHECIDO (sem nova chamada).
 * Usado quando o worker recupera um item interrompido e não há como provar que
 * o provedor não foi acionado.
 */
export async function marcarResultadoDesconhecido(
  admin: TrainingAdminClient,
  id: string,
  motivo: string
): Promise<void> {
  const { error } = await admin
    .from('training_images')
    .update({
      status: 'failed',
      last_error: `resultado_desconhecido: ${motivo}`,
      attempts: TENTATIVAS_MAX_PIPELINE,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}
