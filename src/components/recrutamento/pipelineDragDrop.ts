/**
 * ============================================================================
 * PIPELINE — REGRAS DE DOMÍNIO DO ARRASTE
 *
 * Só o que o board precisa para decidir QUEM pode ser arrastado e QUAL etapa o
 * registro representa. O movimento em si segue o mesmo desenho do Kanban de
 * Admissão: a coluna é a zona de soltura e a etapa é gravada pelo serviço que já
 * existia (mock em memória ou Supabase). Não há ordenação manual dentro da
 * coluna — a ordem é a que vem do servidor/mock.
 * ============================================================================
 */
import { ETAPAS, type EtapaPipelineId } from './pipelineEtapas';

const IDS_ETAPA = new Set<string>(ETAPAS.map((etapa) => etapa.id));

/** Normaliza o `etapa` vindo do banco (nullable/texto livre) para uma das cinco colunas. */
export function normalizarEtapa(valor: string | null | undefined): EtapaPipelineId {
  return (valor && IDS_ETAPA.has(valor) ? valor : 'triagem') as EtapaPipelineId;
}

/** O id é uma das cinco etapas? (usado para validar o alvo do drop). */
export function ehEtapaDoPipeline(valor: string | null | undefined): valor is EtapaPipelineId {
  return Boolean(valor && IDS_ETAPA.has(valor));
}

/**
 * Status que tiram a candidatura do fluxo. Arquivar/cancelar/rejeitar é uma
 * decisão registrada: o Drag & Drop não pode recolocar a pessoa no processo
 * atravessando esse estado (o menu de ações continua sendo a via oficial).
 */
const STATUS_FORA_DO_FLUXO = ['arquivado', 'arquivada', 'rejeitado', 'rejeitada', 'cancelado', 'cancelada'] as const;

export function podeArrastarCandidatura(status: string | null | undefined): boolean {
  const normalizado = (status ?? '').trim().toLowerCase();
  return !STATUS_FORA_DO_FLUXO.includes(normalizado as (typeof STATUS_FORA_DO_FLUXO)[number]);
}
