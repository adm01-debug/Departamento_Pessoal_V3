import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowRight, Calendar, MoreHorizontal, Target, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iniciais } from './desempenhoComum';
import { EstrelasNota } from './EstrelasNota';
import { tomTipoFeedback, type FeedbackDerivado } from './feedbacksComum';

/**
 * ============================================================================
 * CARD DE FEEDBACK — item da timeline da aba "Feedbacks".
 *
 * Aparência PREMIUM e horizontal (nada de linha de tabela), em três faixas na
 * mesma linha no desktop:
 *   (A) IDENTIFICAÇÃO — avatar de iniciais + nome + cargo · departamento,
 *       a citação do feedback e os chips (competência em foco no PDI);
 *   (B) ORIGEM — bloco "Avaliado por" (avatar + nome + chip do tipo) e a data;
 *   (C) NOTA E AÇÃO — nota numérica, estrelas, badge textual da faixa,
 *       "Ver feedback" e o menu de três pontos.
 *
 * O avatar do avaliado usa a MESMA cor da família do tipo do feedback
 * (`--primary`/`--info`/roxo/teal), de modo que a cor do card e o chip do tipo
 * nunca discordam.
 *
 * ENTRADA: quem anima este card é o COORDENADOR da lista
 * (`FeedbacksTimeline` → `animacaoFeedbacks.ts`): o wrapper `motion.div` que
 * envolve o card recebe as variantes, e o card em si é estático. Assim a
 * coreografia (expansão do 1º + cascata) tem UM dono só e nenhum card dispara
 * movimento por conta própria.
 *
 * AÇÕES: só o que o sistema realmente faz — "Ver feedback" abre o dialog de
 * detalhe (campos reais de `feedbacks_360`) e o menu oferece as duas navegações
 * reais: filtrar pelo avaliador e pelo colaborador avaliado. Nenhum botão
 * decorativo.
 * ============================================================================
 */

/** Tinta do avatar por tipo — a mesma família do chip do tipo. */
const AVATAR_TIPO: Record<string, string> = {
  gestor: 'bg-primary/15 text-primary ring-primary/20',
  par: 'bg-info/15 text-info ring-info/20',
  auto: 'bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] ring-[hsl(var(--chart-4)/0.20)]',
  subordinado: 'bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))] ring-[hsl(var(--chart-2)/0.20)]',
};

/** Trecho exibido no card: os comentários reais, com fallback para os pontos fortes. */
function trecho(item: FeedbackDerivado): string {
  const f = item.feedback ?? {};
  return String(f?.comentarios ?? '').trim() || String(f?.pontos_fortes ?? '').trim() || 'Sem texto registrado.';
}

interface FeedbackCardProps {
  item: FeedbackDerivado;
  onVerDetalhes?: (item: FeedbackDerivado) => void;
  onFiltrarAvaliador?: (nome: string) => void;
  onFiltrarAvaliado?: (nome: string) => void;
}

export function FeedbackCard({
  item,
  onVerDetalhes,
  onFiltrarAvaliador,
  onFiltrarAvaliado,
}: FeedbackCardProps) {
  const f = item.feedback ?? {};
  const local = [item.cargo, item.departamento].filter(Boolean).join(' · ');
  const podeFiltrar = Boolean(onFiltrarAvaliador || onFiltrarAvaliado);

  return (
    <Card
      className="flex flex-col gap-3 rounded-xl border-border/60 bg-gradient-to-b from-card to-card/60 px-4 py-3 shadow-elevated transition-all hover:border-primary/30 hover:shadow-lg lg:flex-row lg:items-stretch lg:gap-5"
    >
      {/* ── (A) Identificação + citação + chips ──────────────────────────── */}
      <div className="flex min-w-0 flex-1 gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-inset',
            AVATAR_TIPO[item.tipo] ?? AVATAR_TIPO.gestor
          )}
        >
          {iniciais(item.avaliado)}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[13px] font-semibold leading-tight tracking-tight">
              {item.avaliado}
            </h3>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {local || 'Sem cargo e departamento cadastrados'}
            </p>
          </div>

          {/* Citação: o texto REAL do feedback, sem reticências forçadas. */}
          <blockquote className="border-l-2 border-border/60 pl-2.5 text-[11px] italic leading-snug text-muted-foreground">
            “{trecho(item)}”
          </blockquote>

          <div className="flex flex-wrap items-center gap-1.5">
            {item.competencia && (
              <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 text-[10px] font-medium text-muted-foreground">
                <Target className="h-3 w-3 shrink-0" />
                {item.competencia}
              </span>
            )}
            {item.pendente && (
              <span className="inline-flex h-6 items-center rounded-md border border-warning/45 bg-warning/20 px-2 text-[10px] font-medium uppercase tracking-wide text-warning">
                Pendente
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── (B) Origem: "Avaliado por" + tipo + data ─────────────────────── */}
      <div className="flex shrink-0 flex-row items-end justify-between gap-3 border-t border-border/20 pt-2.5 lg:w-[216px] lg:flex-col lg:items-start lg:justify-start lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avaliado por</p>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
              {iniciais(item.avaliador)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium leading-tight">{item.avaliador}</span>
            </span>
          </div>
          <span
            className={cn(
              'inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide',
              tomTipoFeedback(f?.tipo)
            )}
          >
            {item.tipoRotulo}
          </span>
        </div>

        <p className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] text-muted-foreground lg:mt-auto">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {item.data}
        </p>
      </div>

      {/* ── (C) Nota + ações ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-border/20 pt-2.5 lg:w-[172px] lg:justify-between lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-1">
            <span className={cn('font-display text-xl font-semibold leading-none tabular-nums', item.faixa.tinta)}>
              {item.notaFormatada}
            </span>
            <EstrelasNota nota={item.nota} tinta={item.faixa.tinta} />
            <span
              className={cn(
                'rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                item.faixa.badge
              )}
            >
              {item.faixa.rotulo}
            </span>
          </div>

          {podeFiltrar && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  aria-label={`Ações do feedback de ${item.avaliado}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {onFiltrarAvaliado && (
                  <DropdownMenuItem onClick={() => onFiltrarAvaliado(item.avaliado)}>
                    <User className="mr-2 h-3.5 w-3.5" /> Filtrar por este colaborador
                  </DropdownMenuItem>
                )}
                {onFiltrarAvaliador && (
                  <DropdownMenuItem onClick={() => onFiltrarAvaliador(item.avaliador)}>
                    <User className="mr-2 h-3.5 w-3.5" /> Filtrar por este avaliador
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="group h-8 w-full shrink-0 justify-center gap-1.5 rounded-lg border-border/60 bg-secondary/30 text-[11px] font-normal text-foreground/90 hover:border-primary/40 hover:bg-primary/10 hover:text-primary lg:w-auto"
          onClick={() => onVerDetalhes?.(item)}
        >
          Ver feedback
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </Card>
  );
}

