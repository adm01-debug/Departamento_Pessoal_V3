import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MessageSquare, TrendingDown, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iniciais } from './desempenhoComum';
import { EstrelasNota } from './EstrelasNota';
import { tomTipoFeedback, type FeedbackDerivado } from './feedbacksComum';
import type { EstadoAprovacao } from './aprovacaoGestor';
import { FeedbackAcoesRodape, type PreviewAcoes } from './FeedbackAcoesRodape';

/**
 * ============================================================================
 * DIALOG DE DETALHE DO FEEDBACK — ação "Ver feedback".
 *
 * Não existe rota/tela de detalhe do feedback no sistema, então a ação do card
 * abre ESTE dialog, que exibe SOMENTE os campos reais de `feedbacks_360`:
 * `pontos_fortes`, `pontos_melhoria`, `comentarios`, `potencial`, `status`,
 * a nota com a faixa textual e as relações já carregadas (avaliado/avaliador).
 *
 * Nada é inventado: se um campo vier vazio, o bloco correspondente não é
 * renderizado. A janela usa o `Dialog` do Design System (mesma animação de
 * entrada/saída dos demais diálogos do sistema).
 * ============================================================================
 */

interface FeedbackDetalheDialogProps {
  item: FeedbackDerivado | null;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Ação real: filtra a timeline por este colaborador. */
  onFiltrarAvaliado?: (nome: string) => void;
  /**
   * SOMENTE PRÉVIA LOCAL (DEV): serviço e papel simulados repassados ao rodapé.
   * Sem efeito em produção — ver `PreviewAcoes` em `FeedbackAcoesRodape.tsx`.
   */
  previa?: PreviewAcoes;
  /**
   * ESTADO DA APROVAÇÃO FORMAL do gestor para esta avaliação — a MESMA instância
   * derivada pela fila "Aguardando gestor" (`aprovacaoGestor.estadoAprovacao`).
   * É repassado ao rodapé para que modal e listagem falem do mesmo estado.
   */
  estadoAprovacao?: EstadoAprovacao | null;
}

/** Bloco de texto longo (título + parágrafo), com ícone na família de cor. */
function Bloco({
  icone,
  titulo,
  texto,
  tinta,
}: {
  icone: React.ReactNode;
  titulo: string;
  texto?: unknown;
  tinta: string;
}) {
  const conteudo = String(texto ?? '').trim();
  if (!conteudo) return null;

  return (
    <div className="space-y-1.5 rounded-lg border border-border/50 bg-background/50 p-3">
      <p className={cn('flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider', tinta)}>
        {icone}
        {titulo}
      </p>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{conteudo}</p>
    </div>
  );
}

export function FeedbackDetalheDialog({
  item,
  aberto,
  onOpenChange,
  onFiltrarAvaliado,
  previa,
  estadoAprovacao,
}: FeedbackDetalheDialogProps) {
  if (!item) return null;

  const f = item.feedback ?? {};
  const potencial = Number(f?.potencial ?? 0);
  const local = [item.cargo, item.departamento].filter(Boolean).join(' · ');

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20">
              {iniciais(item.avaliado)}
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate font-display text-base">{item.avaliado}</DialogTitle>
              <DialogDescription className="truncate text-[11px]">
                {local || 'Sem cargo e departamento cadastrados'}
              </DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide',
                    tomTipoFeedback(f?.tipo)
                  )}
                >
                  {item.tipoRotulo}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-6 rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide',
                    item.pendente
                      ? 'border-warning/45 bg-warning/20 text-warning'
                      : 'border-success/45 bg-success/20 text-success'
                  )}
                >
                  {item.pendente ? 'Pendente' : 'Concluído'}
                </Badge>
                {item.competencia && (
                  <Badge
                    variant="outline"
                    className="h-6 rounded-md border border-border/60 bg-muted/40 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Foco no PDI: {item.competencia}
                  </Badge>
                )}
              </div>
            </div>

            {/* Nota — número grande + estrelas + faixa textual. */}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={cn('font-display text-2xl font-semibold leading-none tabular-nums', item.faixa.tinta)}>
                {item.notaFormatada}
              </span>
              <EstrelasNota nota={item.nota} tinta={item.faixa.tinta} tamanho="h-4 w-4" />
              <span
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                  item.faixa.badge
                )}
              >
                {item.faixa.rotulo}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Datas e responsáveis — todos campos reais. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-lg border border-border/50 bg-background/50 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Avaliado por</p>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
                {iniciais(item.avaliador)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium leading-tight">{item.avaliador}</span>
                <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                  {item.tipoRotulo}
                </span>
              </span>
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg border border-border/50 bg-background/50 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Datas</p>
            <p className="flex items-center gap-1.5 text-[12px]">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {item.data}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Prazo do ciclo: {item.prazo}
              {Number.isFinite(potencial) && potencial > 0 ? ` · Potencial ${potencial}/5` : ''}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Bloco
            icone={<TrendingUp className="h-3.5 w-3.5" />}
            titulo="Pontos fortes"
            texto={f?.pontos_fortes}
            tinta="text-success"
          />
          <Bloco
            icone={<TrendingDown className="h-3.5 w-3.5" />}
            titulo="Pontos de melhoria"
            texto={f?.pontos_melhoria}
            tinta="text-warning"
          />
          <Bloco
            icone={<MessageSquare className="h-3.5 w-3.5" />}
            titulo="Comentários"
            texto={f?.comentarios}
            tinta="text-muted-foreground"
          />
        </div>

        {onFiltrarAvaliado && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                onFiltrarAvaliado(item.avaliado);
                onOpenChange(false);
              }}
            >
              <User className="h-3.5 w-3.5" />
              Ver só deste colaborador
            </Button>
          </div>
        )}

        {/* Rodapé OPERACIONAL (Concluir / Cancelar / Reabrir / Validar Potencial
            + situação do Potencial). Só existe no MODO REAL: em demonstração o
            componente devolve `null` e o modal continua exatamente o de hoje.
            Fonte oficial das regras: `statusFeedback` + `acoesFeedback`. */}
        <FeedbackAcoesRodape item={item} previa={previa} estadoAprovacao={estadoAprovacao} />
      </DialogContent>
    </Dialog>
  );
}
