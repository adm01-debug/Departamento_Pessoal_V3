import { CartaoFeedbackCanonico } from './CartaoFeedbackCanonico';
import type { FeedbackCanonico } from './feedbackCanonico';

/**
 * ============================================================================
 * CARD DE FEEDBACK — FILTROS NORMAIS (Todos · Gestor · Pares · Autoavaliação).
 *
 * ESTA VISUALIZAÇÃO É DE CADASTRO/GERENCIAMENTO: o card tem **uma única ação
 * principal — `Editar feedback`**. Nenhum controle de aprovação formal
 * (Ver avaliação, Aprovar, Devolver, Enviar ao gestor) aparece aqui, nem para
 * gestor nem para admin. A aprovação vive exclusivamente na fila
 * "Aguardando gestor" (`PendenciasAprovacao`).
 *
 * O card em si é o MESMO componente canônico da fila (mesmas regiões e tokens);
 * só o conjunto de ações muda. O clique em Editar abre o formulário existente
 * (`NovoFeedbackDialog`) preenchido com o registro — não há segundo modal.
 * ============================================================================
 */

export interface FeedbackCardProps {
  item: FeedbackCanonico;
  /** Abre o formulário existente em modo de edição. */
  onEditar?: (item: FeedbackCanonico) => void;
  onFiltrarAvaliador?: (nome: string) => void;
  onFiltrarAvaliado?: (nome: string) => void;
}

export function FeedbackCard({ item, onEditar, onFiltrarAvaliador, onFiltrarAvaliado }: FeedbackCardProps) {
  return (
    <CartaoFeedbackCanonico
      item={item}
      contexto="lista"
      acoes={['editar']}
      onEditar={() => onEditar?.(item)}
      onFiltrarAvaliador={onFiltrarAvaliador}
      onFiltrarAvaliado={onFiltrarAvaliado}
    />
  );
}
