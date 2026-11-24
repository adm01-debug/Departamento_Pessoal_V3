/**
 * ============================================================================
 * PAGINAÇÃO DA CENTRAL DE AJUSTES — card INDEPENDENTE, logo abaixo da tabela.
 *
 * ── POR QUE É UM CARD SEPARADO ─────────────────────────────────────────────
 * Na referência a faixa de paginação não é o rodapé da tabela: ela é um bloco
 * próprio, com o mesmo raio e a mesma borda dos outros cards, alinhado à
 * esquerda com a tabela e fechando, EMBAIXO, na mesma linha do painel de
 * detalhes. Para isso o container pai reserva a última linha do grid
 * (`auto`, ver `PontoAdjustmentRequests`) — a paginação não pode estar dentro do
 * card da tabela, porque o card da tabela é a linha `1fr` e estica.
 *
 *   [ ✓ 1 solicitação selecionada ]  [ Aprovar em lote ] [ Rejeitar em lote ]
 *                        Mostrando 1–6 de 10   ‹  1  ›   Linhas por página  6
 *
 * ── O QUE VIVE AQUI ────────────────────────────────────────────────────────
 *  · ESQUERDA: a seleção REAL (contagem + ações em lote + limpar). Sem linha
 *    marcada o espaço fica vazio — nenhum botão fantasma;
 *  · DIREITA: o intervalo exibido e os controles reais (`AppPagination`: ‹ página
 *    › com a página ativa em lime + "Linhas por página").
 *
 * Nenhum estado novo: `selecionadas`, `pagina` e `tamanhoPagina` continuam no
 * `PontoAdjustmentRequests`; este componente só desenha e emite eventos.
 * ============================================================================
 */
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppPagination } from '@/components/ui/app-pagination';
import { OPCOES_TAMANHO_AJUSTES, faixaExibida } from './centralAjustes';

interface CentralAjustesPaginacaoProps {
  /** IDs marcados nos checkboxes da tabela (contagem e ações em lote). */
  selecionadas: readonly string[];
  /** Total de linhas depois dos filtros. */
  total: number;
  pagina: number;
  tamanhoPagina: number;
  onPagina: (pagina: number) => void;
  onTamanhoPagina: (tamanho: number) => void;
  onAprovarLote: () => void;
  onRejeitarLote: () => void;
  onLimparSelecao: () => void;
  /** Decisão em andamento — desabilita as ações em lote. */
  processando?: boolean;
}

export function CentralAjustesPaginacao({
  selecionadas,
  total,
  pagina,
  tamanhoPagina,
  onPagina,
  onTamanhoPagina,
  onAprovarLote,
  onRejeitarLote,
  onLimparSelecao,
  processando = false,
}: CentralAjustesPaginacaoProps) {
  const faixa = faixaExibida(pagina, tamanhoPagina, total);
  const quantidade = selecionadas.length;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border border-border/60 bg-card px-3 py-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {quantidade > 0 && (
          <>
            <span className="flex items-center gap-1.5 text-[11px] font-medium">
              <span className="grid h-[14px] w-[14px] place-items-center rounded-[3px] bg-primary text-primary-foreground">
                <Check className="h-[10px] w-[10px]" strokeWidth={3} aria-hidden="true" />
              </span>
              {quantidade} solicitaç{quantidade > 1 ? 'ões' : 'ão'} selecionada
              {quantidade > 1 ? 's' : ''}
            </span>
            <Button
              size="sm"
              className="h-[26px] gap-1 rounded-md px-2 text-[10.5px] font-semibold hover:bg-primary-glow"
              onClick={onAprovarLote}
              disabled={processando}
            >
              Aprovar em lote
            </Button>
            <Button
              size="sm"
              className="h-[26px] gap-1 rounded-md border-transparent bg-danger px-2 text-[10.5px] font-semibold text-destructive-foreground hover:bg-danger-hover"
              onClick={onRejeitarLote}
              disabled={processando}
            >
              Rejeitar em lote
            </Button>
            <Button size="sm" variant="ghost" className="h-[26px] px-2 text-[10.5px]" onClick={onLimparSelecao}>
              Limpar
            </Button>
          </>
        )}
      </div>

      <div className="ml-auto min-w-0">
        <AppPagination
          page={pagina}
          total={total}
          pageSize={tamanhoPagina}
          pageSizeOptions={[...OPCOES_TAMANHO_AJUSTES]}
          onPageChange={onPagina}
          onPageSizeChange={onTamanhoPagina}
          selectorPosition="end"
          isLoading={processando}
          className="min-w-0"
          label={total > 0 ? `Mostrando ${faixa.inicio}–${faixa.fim} de ${total}` : 'Nenhuma solicitação no período'}
        />
      </div>
    </Card>
  );
}
