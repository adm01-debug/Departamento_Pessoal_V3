import { CartaoFeedbackCanonico } from './CartaoFeedbackCanonico';
import type { FeedbackCanonico } from './feedbackCanonico';

/**
 * ============================================================================
 * CARD DE FEEDBACK — FILTROS NORMAIS (Todos · Gestor · Pares · Autoavaliação).
 *
 * ESTA VISUALIZAÇÃO É DE CADASTRO/GERENCIAMENTO: o card tem duas ações —
 * `Ver avaliação` (abre o detalhe do PRÓPRIO registro, onde moram as ações de
 * status: Concluir, Cancelar, Reabrir) e `Editar feedback`. Nenhum controle de
 * APROVAÇÃO formal (Aprovar, Devolver, Enviar ao gestor) aparece aqui, nem para
 * gestor nem para admin: a aprovação é do CONJUNTO e vive exclusivamente na
 * fila "Aguardando gestor" (`PendenciasAprovacao`).
 *
 * `Ver avaliação` existe porque a fila abre SEMPRE a avaliação do gestor como
 * referência do conjunto: sem esta entrada, as avaliações de pares e
 * autoavaliação do mesmo ciclo não teriam como ser concluídas por nenhuma
 * superfície, ficando pendentes para sempre e fora do cálculo 360°.
 *
 * O card em si é o MESMO componente canônico da fila (mesmas regiões e tokens);
 * só o conjunto de ações muda. O clique em Editar abre o formulário existente
 * (`NovoFeedbackDialog`) preenchido com o registro — não há segundo modal.
 * ============================================================================
 */

export interface FeedbackCardProps {
  item: FeedbackCanonico;
  /** Abre o detalhe DESTE registro (rodapé com Concluir/Cancelar/Reabrir). */
  onVer?: (item: FeedbackCanonico) => void;
  /** Abre o formulário existente em modo de edição. */
  onEditar?: (item: FeedbackCanonico) => void;
  onFiltrarAvaliador?: (nome: string) => void;
  onFiltrarAvaliado?: (nome: string) => void;
}

export function FeedbackCard({ item, onVer, onEditar, onFiltrarAvaliador, onFiltrarAvaliado }: FeedbackCardProps) {
  return (
    <CartaoFeedbackCanonico
      item={item}
      contexto="lista"
      acoes={onVer ? ['ver', 'editar'] : ['editar']}
      onVer={() => onVer?.(item)}
      onEditar={() => onEditar?.(item)}
      onFiltrarAvaliador={onFiltrarAvaliador}
      onFiltrarAvaliado={onFiltrarAvaliado}
    />
  );
}
